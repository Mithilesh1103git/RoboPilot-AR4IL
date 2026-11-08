---
status: draft
---

# Design brief: RoboPilot-AR4IL

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
The person stands in front of a tabletop workspace with three colored cubes and a tray. Spatially anchored AR guidance sits on the workspace itself: the cube the Lens has chosen is highlighted, a small pick-up point sits on it, the tray's placement area glows softly, and a subtle cue points toward the tray. They pick up the cube with their hand, place it in the tray, and the Lens captures the demonstration as a structured record for robotic imitation learning. They concentrate on the physical task without looking at menus or operating a phone.

## Why it belongs on glasses
- Uses: shares your view, draws in the world, leaves your body free.
- Why it's better than the phone or laptop version: the demonstrator's hands stay free to do the manipulation, guidance sits on the cubes and tray instead of on a separate screen, and the demonstration is captured from the demonstrator's own first-person view, which is the viewpoint a robot learning by imitation needs.

## Product or overlay
- Type: overlay (guidance and capture over a real tabletop task). It's demonstrated as a product, using a fully virtual workspace.
- What the real version would sense: the real tabletop, real cubes and tray, hand motion, and object positions, using supported SPECS spatial tracking.
- Stand-in for the preview: a fully virtual tabletop workspace in Lens Studio Preview: a virtual tabletop, three colored 3D cubes at different positions, and a 3D tray with visible walls and a clearly defined placement area. Picking and placing uses simulated hand pinch/grab where Preview supports it, with mouse-based interaction as the fallback. Object coordinates are simulation-generated and must never be presented as physical sensor measurements. Keep the architecture extensible so the virtual workspace can later be replaced with a real-world workspace using supported SPECS spatial tracking.

## Where things live
- Where the user is looking during the main task: down at the tabletop, at the active cube and the tray.

### Workspace coordinate frame
- Origin: the center of the tabletop's top surface.
- Axes: **+X** to the user's right, **+Y** up from the tabletop, **+Z** away from the user.
- Units: centimeters (cm) everywhere: layout, logic and records.
- The same workspace-relative frame is used for initial, release and final positions.
- The positions below are object centers in this frame. Objects resting on the table have their bottom on Y = 0.

### Tabletop and viewing
- Tabletop: 80 cm (X) × 50 cm (Z) (default), top surface 75 cm above the floor (default). The table's center is about 60 cm in front of the user (default), so its near edge is about 35 cm away.
- Design target: a **52 cm wide active workspace (X −26 to +26)**. This replaces the earlier 40 cm estimate: the three cubes, the 27 cm tray footprint and the 12 cm NEXT DEMO target need about 52 cm once interaction gaps are included, so 40 cm couldn't hold them.
- Viewing distance: the user's eyes are about 160 cm above the floor (default), so the line of sight down to the table center is about 1 m.
- **Assumption, needs validation:** at about 1 m the usable view width is *estimated* at roughly 55–75 cm, interpolated from Snap's published usable-area guidance, which would leave margin around the 52 cm workspace. This is a design estimate, not a guaranteed SPECS hardware specification. Check it in SPECS 27 Interactive Preview by standing at the user position and confirming all cubes, the tray and NEXT DEMO are visible without turning the head.
- The active workspace spans X −26 to +26 and Z −13.5 to +16, well inside the tabletop (X −40 to +40, Z −25 to +25).

### Layout (left to right, workspace frame, cm)
| Element | Size (cm) | Center position (X, Y, Z) | Footprint X range | Footprint Z range |
|---|---|---|---|---|
| Cube 1 (red) | 5 × 5 × 5 | (−23.5, 2.5, −10) | −26 to −21 | −12.5 to −7.5 |
| Cube 2 (green) | 5 × 5 × 5 | (−23.5, 2.5, 0) | −26 to −21 | −2.5 to +2.5 |
| Cube 3 (blue) | 5 × 5 × 5 | (−23.5, 2.5, +10) | −26 to −21 | +7.5 to +12.5 |
| Tray (outer) | 27 × 5 × 27 (25 × 25 inside, 1 cm walls (default)) | (−3.5, 2.5, 0) | −17 to +10 | −13.5 to +13.5 |
| Tray placement area (interior floor surface) | 25 × 25 | (−3.5, 1, 0) | −16 to +9 | −12.5 to +12.5 |
| NEXT DEMO target | 12 wide × 6 tall | (+20, 3, −5) | +14 to +26 | about −6 to −4 |
| Confirmation / PLACEMENT MISSED / intro text | short single line | (−3.5, 12, +15) | centered over the tray | just behind the tray's far wall |
| Progress indicator | small single line | (−3.5, 5, +16) | centered over the tray | just behind the tray's far wall |

All sizes and positions in this table are (default) values derived from the learner's element sizes.

- Cubes: a column on the left, spaced 10 cm center to center (5 cm gaps between cubes), so each one can be grabbed without touching its neighbor. Colors red, green, blue (default; `cube_red` is from the learner's schema).
- Gaps: 4 cm of clear table between the cube column (X −21) and the tray's left wall (X −17), and 4 cm between the tray's right wall (X +10) and the NEXT DEMO target (X +14). No interactive elements overlap.
- Tray construction (default):
  - Floor: a 25 × 25 cm slab, **1 cm thick**, resting on the tabletop. Bottom at Y = 0, top (the interior floor) at **Y = 1**.
  - Walls: four solid walls, **1 cm thick**, surrounding the floor slab on all sides, each running from the tabletop (Y = 0) to **Y = 5** (5 cm wall height). Outer footprint 27 × 27 cm, interior 25 × 25 cm. The clear interior depth above the floor is 4 cm.
  - The tray is static: it doesn't move when cubes are placed.
- Valid placement: a released cube counts as inside the tray when its center is within the placement area inset by half a cube (X −13.5 to +6.5, Z −10 to +10) (default).
- Settled position: it then settles resting on the interior floor at that X/Z, with its center at **Y = interior floor height + 2.5 cm = 1 + 2.5 = 3.5**. The cube's bottom face touches the floor at Y = 1, so it neither intersects the floor nor floats. Its top (Y = 6) sits 1 cm above the wall tops.
- NEXT DEMO: stands upright on the tabletop immediately to the right of the tray (its bottom on the table, center 3 cm up), tilted about 30° back to face the user (default). It's a large, clearly visible pinch target.
- Text is placed behind the tray's far wall and raised, so it's read in the same glance as the tray and never covers a cube or the placement area.
- Pick-up point: a small marker attached to the active cube, not in screen space.
- Directional hint: a subtle cue anchored to the carried cube and pointing toward the tray's placement area, not in screen space.
- The existing scene's Table, Target-box and Disc may be reused or replaced to match this layout.
- No floating dashboards and no conventional menu interfaces.

## Hands and input
- Pick up: pinch/grab the active cube (SIK interactable, works with the mouse in Preview). The cube attaches to the simulated hand and follows its movement.
- Carry: move the cube toward the tray while holding it.
- Place: release the cube. If it's released inside the tray, it settles at a valid position inside the tray. If it's released outside the tray (on the tabletop or in mid-air), it returns smoothly to its start position.
- Next demonstration: pinch the NEXT DEMO target beside the tray.
- Only the active cube can be grabbed (default). The other cubes stay visible but subdued.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- Task intro: a short line introducing the task appears when the session starts, then fades after about 3 seconds (default).
- All three cubes and the tray: visible throughout. Cubes that aren't active are visually subdued.
- Active cube highlight (subtle outline or glow): shows when the Lens selects the cube from the predefined sequence, hides once it's placed successfully.
- Pick-up point: shows only when the user is expected to pick up the cube, fades out when they pinch or grab it.
- Directional hint toward the tray: shows while the cube is being carried, disappears when the cube reaches the tray's placement area.
- Tray placement-area highlight: soft and visible while a demonstration is active.
- Capture confirmation: "DEMO 01 CAPTURED", "DEMO 02 CAPTURED" or "DEMO 03 CAPTURED" (two-digit sequence number) shows near the tray after a successful placement, disappears after about 2 seconds.
- Progress indicator ("1 / 3 demonstrations captured"): subtle, near the tray, updates after each successful placement only.
- "PLACEMENT MISSED": shows briefly near the workspace when a cube is released outside the tray, then fades.
- NEXT DEMO: shows after a successful placement (demos 1 and 2), fades out when pinched, and then the next cube is highlighted. The next demonstration never starts automatically.
- After the third successful placement, NEXT DEMO is replaced with a final DEMONSTRATION COMPLETE state ("ALL DEMONSTRATIONS CAPTURED").
- Avoid excessive arrows, text or persistent visual instructions.
- If something needs attention out of view: none needed, since the whole task stays in view.

## Data capture
The capture layer is independent of the visual guidance system and uses only in-memory data structures for the current session. The Lens doesn't write files and doesn't persist anything across Preview sessions. Only measurements and events the Lens can actually obtain are included. Simulated coordinates are clearly marked as simulated.

### What the MVP records
- Initial object position, final object position (or release position, for failed attempts), pick and release events, timestamps and duration.
- **Continuous trajectory recording is out of scope.** The cube's path between pick and release isn't sampled or stored, and no record field describes or implies a trajectory.

### Session and IDs
- A unique session ID is generated when a session starts.
- Cubes follow a predefined sequence (red, green, blue (default)) so the dataset has a consistent task structure.
- Each cube has **one stable demonstration ID** (`demo_001` red, `demo_002` green, `demo_003` blue (default)) that stays the same across all of its retries.

### Lifecycle (per cube)
1. When the demonstration begins, capture the cube's initial position.
2. On pinch/grab, record the pick event and timestamp.
3. On release, record the release event, timestamp and release position.
4. Determine placement success.
5. If it's successful: capture the final settled position and print the completed record.
6. If it failed: print the failed-attempt record and return the cube to its start position.

### Retry semantics
- `attempt_number` is the 1-based number of the attempt (one pick followed by one release) on the current cube. Failed and successful attempts share the same counter: the first attempt is 1, and each failed attempt increases it by 1 for the next try. For example: fail (1), fail (2), success (3). A cube placed on the first try has a successful record with `attempt_number: 1` and no failed records.
- The successful record's `attempt_number` identifies the attempt that succeeded, and equals the number of failed records for that cube plus 1.
- A failed attempt does **not** increase the completed-demonstration count, does not advance the sequence, and does not change the demonstration ID. The same cube stays active for a retry.
- The completed-demonstration count (shown by the progress indicator and the session summary) increases only on a successful placement.
- For each retry, the pick and release timestamps and duration in the completed record are those of the successful attempt.

### Successful demonstration record
Exactly one completed record per cube, printed to the Lens Studio Logger as a single JSON line:

```json
{
  "session_id": "session_001",
  "demonstration_id": "demo_001",
  "sequence_number": 1,
  "attempt_number": 1,
  "task_type": "pick_and_place",
  "coordinate_system": { "unit": "cm", "reference_frame": "workspace" },
  "data_source": "simulated",
  "object": {
    "object_id": "cube_red",
    "initial_position": { "x": 0, "y": 0, "z": 0 },
    "final_position": { "x": 0, "y": 0, "z": 0 }
  },
  "tray": { "tray_id": "target_tray", "placement_success": true },
  "interaction": {
    "pick_event": true,
    "release_event": true,
    "pick_timestamp_ms": 0,
    "release_timestamp_ms": 0,
    "duration_ms": 0
  },
  "capture": { "status": "completed", "timestamp": "ISO-8601 timestamp" }
}
```
**Example values are placeholders.** Every zero in this example (`initial_position`, `final_position`, `pick_timestamp_ms`, `release_timestamp_ms`, `duration_ms`), the `"session_001"`, `"demo_001"`, `attempt_number: 1` and the `"ISO-8601 timestamp"` string show the field format only. They aren't actual measured or simulated output. A real record contains the values produced at runtime. For example, a successful red cube would have `final_position.y` = 3.5 and `final_position.x`/`z` inside the valid-placement range.

The `data_source` field is a default added to mark simulated coordinates. `*_timestamp_ms` values are measured from session start (default).

### Failed attempt record
Logged separately as its own JSON line when a cube is released outside the tray: `session_id`, `demonstration_id`, `attempt_number`, `object_id`, `initial_position`, `release_position`, `failure_reason: "released_outside_tray"`, `status: "failed"`, `timestamp`, plus the same `coordinate_system` and `data_source`. It must never be treated as a successful imitation-learning example.

### Session summary
After the third successful demonstration, print a summary to the Logger with the total number of completed demonstrations, the individual demonstration IDs and their completion statuses.

Structure the records so they can later be converted into a robot-compatible imitation-learning dataset for RoboPilot-Sim2Real.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. **AC1 Spatial guidance:** the active cube is highlighted, the pick-up point stays spatially attached to it, and the tray's placement area is visible.
2. **AC2 Successful pick-and-place:** the user can grab a cube, carry it and release it inside the tray using mouse-based pinch interaction in Lens Studio Preview. The cube settles into a valid position inside the tray.
3. **AC3 Failed placement recovery:** releasing a cube outside the tray returns it to its original position, logs a failed attempt and lets the same cube be retried without advancing the sequence.
4. **AC4 Sequential demonstration:** after a successful placement, a capture confirmation appears. Pinching the spatially anchored NEXT DEMO target beside the tray activates the next cube. The sequence progresses through all three cubes and eventually displays DEMONSTRATION COMPLETE.
5. **AC5 Structured data capture:** each successful demonstration generates a structured JSON record in the Lens Studio Logger containing session ID, demonstration ID, object identity, initial and final positions in centimeters, interaction timestamps, duration and placement status. Failed attempts are distinguishable from successful demonstrations.

The final experience must be testable entirely in Lens Studio SPECS 27 Preview using the available mouse-based interaction.

## Out of scope
- Recognizing or tracking real cubes, a real table or real hands (the virtual workspace stands in).
- Continuous trajectory recording (sampling the cube's path between pick and release).
- Capturing first-person camera frames or hand-joint data.
- Writing files to the laptop, or persisting data across Preview sessions.
- Custom or two-hand gestures. Voice input.
- Exporting the dataset to RoboPilot-Sim2Real (only the record structure is prepared for it).

## Risks and open questions
- Feel unproven: how comfortable and accurate real hand grabbing of small cubes is on actual SPECS glasses.
- The 52 cm workspace width depends on the *assumed* 55–75 cm usable view width at about 1 m, which isn't a confirmed SPECS specification. Validate it in SPECS 27 Interactive Preview. It also assumes a standing user looking down at the table from about 1 m. A seated user or a different table height would change how much fits in view.
- Replacing the virtual workspace with a real one depends on SPECS spatial tracking capabilities that aren't tested in this version.
- The recorded positions are simulation-generated and not physical sensor measurements. They must stay labeled that way.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- Workspace frame: +Z in the workspace frame points *away* from the user, while a Lens Studio camera with identity rotation looks down world −Z. Compute recorded positions relative to a workspace root object and convert them into the workspace frame defined above (X right, Y up, Z away), rather than logging raw world coordinates.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
