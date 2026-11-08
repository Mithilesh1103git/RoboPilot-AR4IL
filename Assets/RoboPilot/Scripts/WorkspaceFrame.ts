/**
 * WorkspaceFrame.ts
 *
 * Owns: the conversion between the RoboPilot workspace frame (design brief)
 * and Lens Studio scene space, plus the Phase 1 layout constants.
 *
 * Workspace frame (brief): origin = center of the tabletop top surface,
 * +X to the user's right, +Y up, +Z AWAY from the user, units cm.
 * That frame is left-handed. Lens Studio is right-handed and the user looks
 * down -Z, so the workspace frame is a mirror (Z flip) of WorkspaceRoot's
 * local frame. It cannot be produced by rotating WorkspaceRoot. WorkspaceRoot
 * keeps identity rotation and scale 1, and:
 *
 *   sceneLocal = (wx, wy, -wz)      workspace = (lx, ly, -lz)
 *
 * Pure helper module: no scene side effects, no @component.
 */

/** Workspace frame -> WorkspaceRoot local space. */
export function workspaceToLocal(p: vec3): vec3 {
  return new vec3(p.x, p.y, -p.z);
}

/** WorkspaceRoot local space -> workspace frame. */
export function localToWorkspace(p: vec3): vec3 {
  return new vec3(p.x, p.y, -p.z);
}

/** World position -> workspace frame, relative to the WorkspaceRoot object. */
export function worldToWorkspace(root: SceneObject, world: vec3): vec3 {
  const local = root.getTransform().getInvertedWorldTransform().multiplyPoint(world);
  return localToWorkspace(local);
}

/** Workspace frame -> world position, relative to the WorkspaceRoot object. */
export function workspaceToWorld(root: SceneObject, ws: vec3): vec3 {
  return root.getTransform().getWorldTransform().multiplyPoint(workspaceToLocal(ws));
}

// ---------------------------------------------------------------------------
// Layout constants, WORKSPACE frame (cm). Values from devpost/design-brief.md.
// ---------------------------------------------------------------------------

/** Cube edge length. */
export const CUBE_SIZE = 5;

/** Cube start centers (bottom on the tabletop, Y = 0). */
export const CUBE_START_RED = new vec3(-23.5, 2.5, -10);
export const CUBE_START_GREEN = new vec3(-23.5, 2.5, 0);
export const CUBE_START_BLUE = new vec3(-23.5, 2.5, 10);

/** Tray outer box (27 x 5 x 27), center. */
export const TRAY_CENTER = new vec3(-3.5, 2.5, 0);
export const TRAY_OUTER_MIN = new vec3(-17, 0, -13.5);
export const TRAY_OUTER_MAX = new vec3(10, 5, 13.5);

/** Tray interior (25 x 25), from the interior floor top (Y = 1) to the wall tops (Y = 5). */
export const TRAY_INTERIOR_MIN = new vec3(-16, 1, -12.5);
export const TRAY_INTERIOR_MAX = new vec3(9, 5, 12.5);
export const TRAY_FLOOR_TOP_Y = 1;

/** Placement area: interior floor surface center. */
export const PLACEMENT_AREA_CENTER = new vec3(-3.5, 1, 0);

/** Valid placement: cube center inside the interior inset by half a cube. */
export const PLACEMENT_INSET_MIN_X = -13.5;
export const PLACEMENT_INSET_MAX_X = 6.5;
export const PLACEMENT_INSET_MIN_Z = -10;
export const PLACEMENT_INSET_MAX_Z = 10;

/** Settled cube center height in the tray: floor top (1) + half a cube (2.5). */
export const SETTLED_Y = 3.5;

/** NEXT DEMO target center and panel size (W x H). */
export const NEXT_DEMO_CENTER = new vec3(20, 3, -5);
export const NEXT_DEMO_SIZE_W = 12;
export const NEXT_DEMO_SIZE_H = 6;

/** Text anchors. */
export const MESSAGE_ANCHOR = new vec3(-3.5, 12, 15);
export const PROGRESS_ANCHOR = new vec3(-3.5, 5, 16);

/** WorkspaceRoot world position (scene default pose). */
export const WORKSPACE_ROOT_WORLD = new vec3(0, -85, -60);
