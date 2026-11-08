/**
 * WorkspaceFrameSelfTest.ts
 *
 * Owns: a one-shot startup self-test of WorkspaceFrame's coordinate conversion.
 * Expects: attached to WorkspaceRoot; @inputs wired to the layout objects.
 * Must not: move, create or modify any scene object.
 */
import {
  workspaceToWorld,
  worldToWorkspace,
  CUBE_START_RED,
  CUBE_START_GREEN,
  CUBE_START_BLUE,
  NEXT_DEMO_CENTER,
  MESSAGE_ANCHOR,
  PROGRESS_ANCHOR,
  WORKSPACE_ROOT_WORLD,
} from "./WorkspaceFrame";

const TAG = "[WorkspaceFrameSelfTest]";

@component
export class WorkspaceFrameSelfTest extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WorkspaceFrameSelfTest - coordinate conversion check</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("WorkspaceRoot (origin of the workspace frame)")
  workspaceRoot: SceneObject;

  @input
  @hint("Cube_Red parent object")
  cubeRed: SceneObject;

  @input
  @hint("Cube_Green parent object")
  cubeGreen: SceneObject;

  @input
  @hint("Cube_Blue parent object")
  cubeBlue: SceneObject;

  @input
  @hint("Tray_Floor slab")
  trayFloor: SceneObject;

  @input
  @hint("NextDemoTarget parent object")
  nextDemoTarget: SceneObject;

  @input
  @hint("MessageAnchor")
  messageAnchor: SceneObject;

  @input
  @hint("ProgressAnchor")
  progressAnchor: SceneObject;
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Max allowed error per check, cm")
  tolerance: number = 0.001;
  @ui.group_end

  private passed = 0;
  private failed = 0;

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.run());
  }

  private fmt(v: vec3): string {
    return "(" + v.x.toFixed(4) + ", " + v.y.toFixed(4) + ", " + v.z.toFixed(4) + ")";
  }

  private check(name: string, expected: vec3, actual: vec3): void {
    const err = expected.distance(actual);
    const ok = err < this.tolerance;
    if (ok) {
      this.passed++;
    } else {
      this.failed++;
    }
    print(
      TAG + " " + (ok ? "PASS" : "FAIL") + " " + name +
        " expected=" + this.fmt(expected) + " actual=" + this.fmt(actual) +
        " err=" + err.toFixed(6)
    );
  }

  private run(): void {
    const root = this.workspaceRoot ? this.workspaceRoot : this.getSceneObject();

    // (a) Round trips workspace -> world -> workspace.
    const roundTrip: [string, vec3][] = [
      ["roundtrip(-23.5,2.5,-10)", new vec3(-23.5, 2.5, -10)],
      ["roundtrip(-3.5,1,0)", new vec3(-3.5, 1, 0)],
      ["roundtrip(20,3,-5)", new vec3(20, 3, -5)],
      ["roundtrip(0,0,0)", new vec3(0, 0, 0)],
    ];
    for (const [name, p] of roundTrip) {
      this.check(name, p, worldToWorkspace(root, workspaceToWorld(root, p)));
    }

    // (b) Actual object world positions converted back into the workspace frame.
    const objects: [string, SceneObject, vec3][] = [
      ["Cube_Red", this.cubeRed, CUBE_START_RED],
      ["Cube_Green", this.cubeGreen, CUBE_START_GREEN],
      ["Cube_Blue", this.cubeBlue, CUBE_START_BLUE],
      ["Tray_Floor", this.trayFloor, new vec3(-3.5, 0.5, 0)],
      ["NextDemoTarget", this.nextDemoTarget, NEXT_DEMO_CENTER],
      ["MessageAnchor", this.messageAnchor, MESSAGE_ANCHOR],
      ["ProgressAnchor", this.progressAnchor, PROGRESS_ANCHOR],
    ];
    for (const [name, obj, expected] of objects) {
      if (!obj) {
        this.failed++;
        print(TAG + " FAIL " + name + " expected=" + this.fmt(expected) + " actual=<input not wired>");
        continue;
      }
      const world = obj.getTransform().getWorldPosition();
      this.check("object:" + name, expected, worldToWorkspace(root, world));
    }

    // (c) Explicit formula: world = (0,-85,-60) + (wx, wy, -wz).
    const ws = new vec3(20, 3, -5);
    const expectedWorld = WORKSPACE_ROOT_WORLD.add(new vec3(ws.x, ws.y, -ws.z));
    this.check("formula world(20,3,-5)", expectedWorld, workspaceToWorld(root, ws));

    print(
      TAG + " SUMMARY " + (this.failed === 0 ? "ALL PASS" : "FAILURES") +
        " passed=" + this.passed + " failed=" + this.failed
    );
  }
}
