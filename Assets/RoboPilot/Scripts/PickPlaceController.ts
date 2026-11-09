/**
 * PickPlaceController.ts  (Phase 2.2 MVP)
 *
 * Owns: the Red -> Green -> Blue pick-and-place sequence, placement decision,
 * settle / return animation, NEXT DEMO gating, completion message and the
 * per-attempt JSON records printed to the Logger.
 *
 * Placement decision: the release point is the interactor ray projected onto
 * the tray rim plane (PlacementProjection), because mouse / far-ray release
 * height is not meaningful. Direct (near-hand) releases, or a failed
 * projection, fall back to the cube's actual X/Z.
 *
 * All coordinates are workspace frame, cm, and simulation-generated
 * (data_source: "simulated"), never physical sensor measurements.
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import {
  InteractableManipulation,
  TransformEventArg,
} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation";
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor";
import {SETTLED_Y, workspaceToWorld, worldToWorkspace} from "./WorkspaceFrame";
import {isInsidePlacementXZ, projectRayToWorkspacePlane, RIM_PLANE_Y} from "./PlacementProjection";

const TAG = "[RoboPilot]";
const OBJECT_IDS = ["cube_red", "cube_green", "cube_blue"];

enum State {
  AwaitGrab,
  Grabbed,
  Settling,
  Returning,
  AwaitNext,
  Complete,
}

interface CubeSlot {
  obj: SceneObject;
  objectId: string;
  demoId: string;
  interactable: Interactable;
  manipulation: InteractableManipulation;
  initialWs: vec3;
  attempt: number;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pos(v: vec3): {x: number; y: number; z: number} {
  return {x: r2(v.x), y: r2(v.y), z: r2(v.z)};
}

@component
export class PickPlaceController extends BaseScriptComponent {
  @input
  @hint("WorkspaceRoot (origin of the workspace frame)")
  workspaceRoot: SceneObject;

  @input
  @hint("Cubes in sequence order: Red, Green, Blue")
  cubes: SceneObject[];

  @input
  @hint("NEXT DEMO target (has Interactable + Collider)")
  nextDemoTarget: SceneObject;

  @input
  @hint("Text used for confirmation / missed / complete messages")
  messageText: Text;

  @input
  @hint("Settle / return animation duration, seconds")
  animDuration: number = 0.35;

  private slots: CubeSlot[] = [];
  private active = 0;
  private completed = 0;
  private state = State.AwaitGrab;
  private sessionId = "";
  private sessionStart = 0;
  private pickTimeMs = 0;
  private completedIds: string[] = [];

  private animFrom: vec3 = vec3.zero();
  private animTo: vec3 = vec3.zero();
  private animT = 0;

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.onStart());
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  private onStart(): void {
    if (!this.workspaceRoot || !this.cubes || this.cubes.length !== 3 || !this.nextDemoTarget || !this.messageText) {
      print(`${TAG} ERROR inputs not wired (workspaceRoot, 3 cubes, nextDemoTarget, messageText)`);
      return;
    }
    this.sessionStart = getTime();
    this.sessionId = "session_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

    for (let i = 0; i < this.cubes.length; i++) {
      const obj = this.cubes[i];
      const interactable = obj.getComponent(Interactable.getTypeName()) as Interactable;
      const manipulation = obj.getComponent(InteractableManipulation.getTypeName()) as InteractableManipulation;
      if (!interactable || !manipulation) {
        print(`${TAG} ERROR ${obj.name} missing Interactable / InteractableManipulation`);
        return;
      }
      const slot: CubeSlot = {
        obj,
        objectId: OBJECT_IDS[i],
        demoId: "demo_00" + (i + 1),
        interactable,
        manipulation,
        initialWs: worldToWorkspace(this.workspaceRoot, obj.getTransform().getWorldPosition()),
        attempt: 1,
      };
      manipulation.onManipulationStart.add(() => this.onGrab(i));
      manipulation.onManipulationEnd.add((e) => this.onRelease(i, e));
      this.slots.push(slot);
    }

    const nextInteractable = this.nextDemoTarget.getComponent(Interactable.getTypeName()) as Interactable;
    if (!nextInteractable) {
      print(`${TAG} ERROR NextDemoTarget missing Interactable`);
      return;
    }
    nextInteractable.onTriggerEnd.add(() => this.onNextDemo());

    this.nextDemoTarget.enabled = false;
    this.activate(0);
    print(`${TAG} ready session_id=${this.sessionId} active=${this.slots[0].objectId}`);
  }

  private nowMs(): number {
    return Math.round((getTime() - this.sessionStart) * 1000);
  }

  private setInteractive(slot: CubeSlot, on: boolean): void {
    slot.interactable.enabled = on;
    slot.manipulation.enabled = on;
  }

  private activate(index: number): void {
    this.active = index;
    for (let i = 0; i < this.slots.length; i++) {
      this.setInteractive(this.slots[i], i === index);
    }
    this.state = State.AwaitGrab;
    this.messageText.text = `Place the ${this.slots[index].objectId.replace("cube_", "")} cube in the tray`;
  }

  private onGrab(i: number): void {
    if (i !== this.active || this.state !== State.AwaitGrab) {
      return;
    }
    this.state = State.Grabbed;
    this.pickTimeMs = this.nowMs();
  }

  private onRelease(i: number, e: TransformEventArg): void {
    if (i !== this.active || this.state !== State.Grabbed) {
      return;
    }
    this.state = State.Settling; // block re-entry: disabling manipulation re-fires onManipulationEnd
    const slot = this.slots[i];
    const releaseMs = this.nowMs();
    const actualWs = worldToWorkspace(this.workspaceRoot, slot.obj.getTransform().getWorldPosition());

    // Decide the placement point (X/Z only).
    let placeWs = actualWs;
    let method = "cube_position";
    const it = e.interactors && e.interactors.length > 0 ? e.interactors[0] : null;
    if (it !== null && (it.activeTargetingMode & TargetingMode.Direct) === 0) {
      const p = projectRayToWorkspacePlane(this.workspaceRoot, it.startPoint, it.direction, it.maxRaycastDistance, RIM_PLANE_Y);
      if (p.ok === true) {
        placeWs = (p as {ok: true; wsPoint: vec3; distance: number}).wsPoint;
        method = "ray_projection";
      }
    }
    const success = isInsidePlacementXZ(placeWs);

    this.setInteractive(slot, false);
    const base = {
      session_id: this.sessionId,
      demonstration_id: slot.demoId,
      sequence_number: i + 1,
      attempt_number: slot.attempt,
      task_type: "pick_and_place",
      coordinate_system: {unit: "cm", reference_frame: "workspace"},
      data_source: "simulated",
    };

    if (success) {
      const finalWs = new vec3(placeWs.x, SETTLED_Y, placeWs.z);
      print(
        JSON.stringify({
          ...base,
          object: {
            object_id: slot.objectId,
            initial_position: pos(slot.initialWs),
            release_position: pos(actualWs),
            placement_point: pos(placeWs),
            placement_method: method,
            final_position: pos(finalWs),
          },
          tray: {tray_id: "target_tray", placement_success: true},
          interaction: {
            pick_event: true,
            release_event: true,
            pick_timestamp_ms: this.pickTimeMs,
            release_timestamp_ms: releaseMs,
            duration_ms: releaseMs - this.pickTimeMs,
          },
          capture: {status: "completed", timestamp: new Date().toISOString()},
        })
      );
      this.completed++;
      this.completedIds.push(slot.demoId);
      this.startAnim(slot, finalWs, State.Settling);
    } else {
      print(
        JSON.stringify({
          ...base,
          object_id: slot.objectId,
          initial_position: pos(slot.initialWs),
          release_position: pos(actualWs),
          placement_point: pos(placeWs),
          placement_method: method,
          pick_timestamp_ms: this.pickTimeMs,
          release_timestamp_ms: releaseMs,
          failure_reason: "released_outside_tray",
          status: "failed",
          timestamp: new Date().toISOString(),
        })
      );
      slot.attempt++;
      this.messageText.text = "PLACEMENT MISSED - try again";
      this.startAnim(slot, slot.initialWs, State.Returning);
    }
  }

  private startAnim(slot: CubeSlot, targetWs: vec3, state: State): void {
    this.animFrom = slot.obj.getTransform().getWorldPosition();
    this.animTo = workspaceToWorld(this.workspaceRoot, targetWs);
    this.animT = 0;
    this.state = state;
  }

  private onUpdate(): void {
    if (this.state !== State.Settling && this.state !== State.Returning) {
      return;
    }
    const slot = this.slots[this.active];
    this.animT = Math.min(1, this.animT + getDeltaTime() / Math.max(0.01, this.animDuration));
    const k = 1 - Math.pow(1 - this.animT, 3); // ease-out cubic
    slot.obj.getTransform().setWorldPosition(vec3.lerp(this.animFrom, this.animTo, k));
    if (this.animT < 1) {
      return;
    }
    if (this.state === State.Returning) {
      this.setInteractive(slot, true);
      this.state = State.AwaitGrab;
      return;
    }
    // Settled.
    if (this.completed < this.slots.length) {
      this.state = State.AwaitNext;
      this.messageText.text = `Demonstration ${this.completed} captured - pinch NEXT DEMO`;
      this.nextDemoTarget.enabled = true;
    } else {
      this.state = State.Complete;
      this.messageText.text = "DEMONSTRATION COMPLETE";
      print(
        JSON.stringify({
          session_id: this.sessionId,
          summary: true,
          data_source: "simulated",
          completed_demonstrations: this.completed,
          demonstrations: this.completedIds.map((id) => ({demonstration_id: id, status: "completed"})),
        })
      );
    }
  }

  private onNextDemo(): void {
    if (this.state !== State.AwaitNext) {
      return;
    }
    this.nextDemoTarget.enabled = false;
    this.activate(this.active + 1);
  }
}
