/**
 * CubeGrabProbe.ts  (Phase 2.1 diagnostic probe)
 *
 * Owns: printing grab / throttled-move / release diagnostics for ONE grabbable
 * cube, so we can verify SIK grab behaviour and the rim-plane projection in
 * SPECS 27 Preview before building the real state machine.
 *
 * Expects: on the same SceneObject, an SIK Interactable and an
 * InteractableManipulation (configured in the Inspector: translation on,
 * rotation / scale / Z-stretch off). workspaceRoot wired to WorkspaceRoot.
 *
 * Must not: move the cube, change any component, decide success, retry,
 * animate, or emit dataset records. Lines are prefixed "[GrabProbe]" and are
 * debug output only, not imitation-learning data.
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import {
  InteractableManipulation,
  TransformEventArg,
} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation";
import {
  Interactor,
  InteractorInputType,
  TargetingMode,
} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor";
import {worldToWorkspace, localToWorkspace} from "./WorkspaceFrame";
import {isInsidePlacementXZ, projectRayToWorkspacePlane, ProjectionResult, RIM_PLANE_Y} from "./PlacementProjection";

const TAG = "[GrabProbe]";

function fmt(v: vec3 | null): string {
  if (v === null) {
    return "null";
  }
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

function inputTypeName(t: InteractorInputType): string {
  const names: string[] = [];
  if (t & InteractorInputType.LeftHand) names.push("LeftHand");
  if (t & InteractorInputType.RightHand) names.push("RightHand");
  if (t & InteractorInputType.Mobile) names.push("Mobile");
  if (t & InteractorInputType.BtController) names.push("BtController");
  if (t & InteractorInputType.CustomController) names.push("CustomController");
  if (t & InteractorInputType.Mouse) names.push("Mouse");
  return names.length > 0 ? names.join("|") : `None(${t})`;
}

function targetingModeName(m: TargetingMode): string {
  const names: string[] = [];
  if (m & TargetingMode.Direct) names.push("Direct");
  if (m & TargetingMode.Indirect) names.push("Indirect");
  if (m & TargetingMode.Poke) names.push("Poke");
  return names.length > 0 ? names.join("|") : `None(${m})`;
}

@component
export class CubeGrabProbe extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CubeGrabProbe - Phase 2.1 grab/projection diagnostics</span>')
  @ui.separator
  @input
  @hint("WorkspaceRoot (origin of the workspace frame)")
  workspaceRoot: SceneObject;

  @input
  @hint("Object id used in log lines")
  objectId: string = "cube_red";

  @input
  @hint("Seconds between movement log lines while grabbed")
  moveLogInterval: number = 0.25;

  private interactable: Interactable | null = null;
  private manipulation: InteractableManipulation | null = null;
  private grabbing = false;
  private lastMoveLogTime = 0;
  private grabOffsetWs: vec3 | null = null;
  private grabCount = 0;

  onAwake(): void {
    // SIK subscriptions must bind in OnStartEvent (SIK components initialise in their own onAwake/onStart).
    this.createEvent("OnStartEvent").bind(() => this.onStart());
  }

  private onStart(): void {
    if (!this.workspaceRoot) {
      print(`${TAG} ERROR workspaceRoot input not set; probe disabled`);
      return;
    }
    this.interactable = this.sceneObject.getComponent(Interactable.getTypeName()) as Interactable;
    this.manipulation = this.sceneObject.getComponent(
      InteractableManipulation.getTypeName()
    ) as InteractableManipulation;
    if (!this.interactable || !this.manipulation) {
      print(
        `${TAG} ERROR missing component on ${this.sceneObject.name}: interactable=${!!this.interactable} manipulation=${!!this.manipulation}`
      );
      return;
    }

    this.manipulation.onManipulationStart.add((e) => this.onGrab(e));
    this.manipulation.onManipulationUpdate.add((e) => this.onMove(e));
    this.manipulation.onManipulationEnd.add((e) => this.onRelease(e));

    print(
      `${TAG} ready object=${this.objectId} canTranslate=${this.manipulation.canTranslate()} canRotate=${this.manipulation.canRotate()} canScale=${this.manipulation.canScale()} stretchZ=${this.manipulation.enableStretchZ} targetingMode=${targetingModeName(this.interactable.targetingMode)} start_ws=${fmt(this.cubeWs())}`
    );
  }

  private cubeWs(): vec3 {
    return worldToWorkspace(this.workspaceRoot, this.getTransform().getWorldPosition());
  }

  /** World-space vector -> workspace-frame vector (rotation only, Z flipped). */
  private worldVectorToWs(v: vec3): vec3 {
    const local = this.workspaceRoot.getTransform().getInvertedWorldTransform().multiplyDirection(v);
    return localToWorkspace(local);
  }

  private firstInteractor(e: TransformEventArg): Interactor | null {
    return e.interactors && e.interactors.length > 0 ? e.interactors[0] : null;
  }

  private project(interactor: Interactor | null): ProjectionResult {
    if (interactor === null) {
      return {ok: false, reason: "null_ray"};
    }
    return projectRayToWorkspacePlane(
      this.workspaceRoot,
      interactor.startPoint,
      interactor.direction,
      interactor.maxRaycastDistance,
      RIM_PLANE_Y
    );
  }

  private describeProjection(p: ProjectionResult): string {
    if (p.ok === true) {
      const hit = p as {ok: true; wsPoint: vec3; distance: number};
      return `projected_ws=${fmt(hit.wsPoint)} ray_dist=${hit.distance.toFixed(2)} projected_inside_xz=${isInsidePlacementXZ(hit.wsPoint)}`;
    }
    const miss = p as {ok: false; reason: string};
    return `projected_ws=none projection_failure=${miss.reason} projected_inside_xz=n/a`;
  }

  private describeInteractor(i: Interactor | null): string {
    if (i === null) {
      return "input=none targeting=none";
    }
    return `input=${inputTypeName(i.inputType)} targeting=${targetingModeName(i.activeTargetingMode)} interactors_mode_raw=${i.activeTargetingMode}`;
  }

  private onGrab(e: TransformEventArg): void {
    this.grabbing = true;
    this.grabCount++;
    this.lastMoveLogTime = getTime();
    const i = this.firstInteractor(e);
    const cubeWorld = this.getTransform().getWorldPosition();

    // Grab offset = cube centre - interactor hit point, in the workspace frame. Logged only, not applied.
    this.grabOffsetWs = null;
    if (i !== null && i.targetHitPosition !== null) {
      this.grabOffsetWs = this.worldVectorToWs(cubeWorld.sub(i.targetHitPosition));
    }

    print(
      `${TAG} GRAB #${this.grabCount} object=${this.objectId} ${this.describeInteractor(i)} interactors=${e.interactors.length} cube_ws=${fmt(this.cubeWs())} hit_ws=${i && i.targetHitPosition ? fmt(worldToWorkspace(this.workspaceRoot, i.targetHitPosition)) : "null"} grab_offset_ws=${fmt(this.grabOffsetWs)} ${this.describeProjection(this.project(i))}`
    );
  }

  private onMove(e: TransformEventArg): void {
    if (!this.grabbing) {
      return;
    }
    const now = getTime();
    if (now - this.lastMoveLogTime < this.moveLogInterval) {
      return;
    }
    this.lastMoveLogTime = now;
    const i = this.firstInteractor(e);
    const ws = this.cubeWs();
    print(
      `${TAG} MOVE #${this.grabCount} cube_ws=${fmt(ws)} height_y=${ws.y.toFixed(2)} ${this.describeProjection(this.project(i))}`
    );
  }

  private onRelease(e: TransformEventArg): void {
    const wasGrabbing = this.grabbing;
    this.grabbing = false;
    const i = this.firstInteractor(e);
    const ws = this.cubeWs();
    const p = this.project(i);
    print(
      `${TAG} RELEASE #${this.grabCount} object=${this.objectId} ${this.describeInteractor(i)} was_grabbing=${wasGrabbing} cube_ws=${fmt(ws)} release_height_y=${ws.y.toFixed(2)} cube_inside_xz=${isInsidePlacementXZ(ws)} grab_offset_ws=${fmt(this.grabOffsetWs)} ${this.describeProjection(p)}`
    );
  }
}
