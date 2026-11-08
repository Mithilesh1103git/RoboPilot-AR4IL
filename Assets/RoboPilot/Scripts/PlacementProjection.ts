/**
 * PlacementProjection.ts
 *
 * Owns: intersecting an interactor ray (world space) with a horizontal plane
 * of the workspace frame (default: tray rim, workspace Y = 5), and the X/Z
 * placement-area boundary test.
 *
 * Pure helper module: no scene side effects, no @component, no logging.
 *
 * Why a projection: with mouse / far-ray (Indirect) input, SIK keeps a grabbed
 * object at the ray distance captured at grab time, so the object's height is
 * a by-product of that sphere, not a user decision. The projected rim-plane
 * point stands in for "where the user is putting it". Near-hand (Direct)
 * placement should use the object's actual position instead.
 *
 * Math is done in WorkspaceRoot LOCAL space (right-handed, same as the scene);
 * the result is converted to the workspace frame (Z flipped) at the end.
 * Because the ray direction is normalised in world space and the world->local
 * map is affine, the ray parameter t is the world-space distance along the ray.
 */
import {
  localToWorkspace,
  PLACEMENT_INSET_MIN_X,
  PLACEMENT_INSET_MAX_X,
  PLACEMENT_INSET_MIN_Z,
  PLACEMENT_INSET_MAX_Z,
} from "./WorkspaceFrame";

/** Workspace-frame height of the tray rim (wall tops), cm. */
export const RIM_PLANE_Y = 5;

/** Below this world-space length a direction is treated as zero. */
const ZERO_DIRECTION_EPSILON = 1e-6;

/**
 * The ray must point downward by at least this much (local-space Y component
 * of the normalised direction) to count as hitting the plane from above.
 * 1e-3 is about 0.06 degrees below horizontal.
 */
const PARALLEL_EPSILON = 1e-3;

export type ProjectionFailureReason =
  | "invalid_root"
  | "null_ray"
  | "non_finite_ray"
  | "zero_direction"
  | "parallel_or_upward"
  | "behind_origin"
  | "beyond_max_distance";

export type ProjectionResult =
  | { ok: true; wsPoint: vec3; distance: number }
  | { ok: false; reason: ProjectionFailureReason };

function isFiniteVec(v: vec3): boolean {
  return isFinite(v.x) && isFinite(v.y) && isFinite(v.z);
}

/**
 * Intersect a world-space ray with the workspace plane Y = planeY.
 *
 * @param root          WorkspaceRoot SceneObject (origin of the workspace frame).
 * @param startWorld    Ray origin in world space (interactor.startPoint).
 * @param directionWorld Ray direction in world space (interactor.direction). Need not be normalised.
 * @param maxDistance   Maximum accepted distance along the ray, cm (interactor.maxRaycastDistance).
 * @param planeY        Workspace-frame plane height, cm. Defaults to the tray rim.
 */
export function projectRayToWorkspacePlane(
  root: SceneObject | null,
  startWorld: vec3 | null,
  directionWorld: vec3 | null,
  maxDistance: number,
  planeY: number = RIM_PLANE_Y
): ProjectionResult {
  if (root === null || isNull(root)) {
    return { ok: false, reason: "invalid_root" };
  }
  if (startWorld === null || directionWorld === null) {
    return { ok: false, reason: "null_ray" };
  }
  if (!isFiniteVec(startWorld) || !isFiniteVec(directionWorld)) {
    return { ok: false, reason: "non_finite_ray" };
  }
  if (directionWorld.length < ZERO_DIRECTION_EPSILON) {
    return { ok: false, reason: "zero_direction" };
  }

  const dirWorld = directionWorld.normalize();
  const inv = root.getTransform().getInvertedWorldTransform();
  const o = inv.multiplyPoint(startWorld);
  const d = inv.multiplyDirection(dirWorld);

  // Workspace Y equals local Y (only Z is flipped), so the plane is local y = planeY.
  if (d.y > -PARALLEL_EPSILON) {
    return { ok: false, reason: "parallel_or_upward" };
  }

  const t = (planeY - o.y) / d.y;
  if (!isFinite(t) || t <= 0) {
    return { ok: false, reason: "behind_origin" };
  }
  if (t > maxDistance) {
    return { ok: false, reason: "beyond_max_distance" };
  }

  const local = o.add(d.uniformScale(t));
  return { ok: true, wsPoint: localToWorkspace(local), distance: t };
}

/**
 * True when a workspace-frame point's X/Z lies inside the valid placement area
 * (tray interior inset by half a cube). Y is ignored on purpose.
 */
export function isInsidePlacementXZ(wsPoint: vec3): boolean {
  return (
    wsPoint.x >= PLACEMENT_INSET_MIN_X &&
    wsPoint.x <= PLACEMENT_INSET_MAX_X &&
    wsPoint.z >= PLACEMENT_INSET_MIN_Z &&
    wsPoint.z <= PLACEMENT_INSET_MAX_Z
  );
}
