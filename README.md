# RoboPilot-AR4IL
### Augmented Reality for Imitation Learning

**An AR-based pick-and-place demonstration interface for capturing structured manipulation demonstrations and preparing them for robot imitation learning.**

<p align="center">
  <strong>See it. Demonstrate it. Capture it. Teach robots.</strong>
</p>

---

## Overview

RoboPilot-AR4IL explores how Augmented Reality (AR) can make robot teaching more intuitive.

Traditional robot programming often requires specialized interfaces, manual coordinate configuration, or carefully scripted motion sequences. RoboPilot-AR4IL investigates an alternative: allowing a human to demonstrate a manipulation task through an interactive spatial interface.

The project provides an AR workspace containing a tabletop, target tray, and interactive objects. A user performs a pick-and-place task by selecting an object, moving it into the target area, and releasing it.

The system evaluates the placement, manages the demonstration sequence, and captures structured interaction records in JSON format.

These records represent simulated manipulation demonstrations that can serve as a foundation for future imitation-learning datasets and robot learning workflows.

**RoboPilot-AR4IL is designed as an AR demonstration-capture extension to the broader RoboPilot ecosystem.**

## Problem Statement

Teaching robots manipulation tasks remains challenging.

Common approaches involve:

- Programming robot trajectories manually.
- Configuring task-specific coordinates and constraints.
- Developing custom interfaces for collecting demonstrations.
- Converting human demonstrations into structured training data.
- Managing successful and unsuccessful task attempts.

An intuitive interface for demonstrating manipulation tasks could reduce the complexity of collecting demonstrations.

RoboPilot-AR4IL explores this concept through an interactive AR workspace.

## Solution

RoboPilot-AR4IL provides a spatial pick-and-place environment where users can demonstrate sequential object manipulation.

The current implementation includes:

1. A spatial tabletop workspace.
2. Three independently interactive objects.
3. A target tray with placement boundaries.
4. Object selection and manipulation using the Spectacles Interaction Kit.
5. Placement validation using workspace coordinates and ray projection.
6. Automatic object settling after successful placement.
7. Failed-placement detection and demonstration recording.
8. Sequential demonstration progression.
9. Structured JSON output for each manipulation attempt.
10. A completion state after all three demonstrations.

The captured records include object positions, interaction timestamps, placement decisions, task identifiers, and success or failure status.

---

## Key Features

### 1. Spatial AR Workspace

The application establishes a structured workspace containing:

- Tabletop
- Target tray
- Red cube
- Green cube
- Blue cube
- Next Demo interface
- Message and progress anchors

All workspace objects use a common coordinate reference frame.

### 2. Interactive Object Manipulation

Users can grab and manipulate objects using the Spectacles Interaction Kit (SIK).

The current implementation has been tested using mouse-based interaction in Lens Studio Preview.

The interaction pipeline detects:

- Manipulation start
- Object movement
- Manipulation end
- Placement position

### 3. Ray-Projected Placement Validation

Mouse-based or indirect interaction does not provide a reliable physical release height.

RoboPilot-AR4IL therefore projects the interactor ray onto the tray's placement plane.

The projected workspace coordinates are used to determine whether the object has been released inside the valid placement region.

This separates placement validation from unreliable mouse-driven vertical movement.

### 4. Automatic Placement and Recovery

When an object is released:

- A valid placement is accepted.
- The object settles at the configured placement height.
- An invalid placement is rejected.
- The failed attempt is recorded.
- The object can be retried.

### 5. Sequential Demonstration Workflow

The current task consists of three demonstrations:

**Red → Green → Blue**

Each object must be successfully placed before the demonstration sequence advances.

After all three demonstrations are completed, the application displays:

**DEMONSTRATION COMPLETE**

### 6. Structured Demonstration Capture

Every manipulation attempt generates a JSON record.

The records distinguish successful and failed attempts and include:

- Session ID
- Demonstration ID
- Sequence number
- Attempt number
- Object identity
- Initial position
- Release position
- Projected placement point
- Final position, when applicable
- Placement result
- Interaction timestamps
- Data source

The current implementation labels its captured records as `simulated`.

---

## System Architecture

```text
                  ROBO PILOT - AR4IL
                          |
                          v
               AR Spatial Workspace
                          |
          +---------------+---------------+
          |               |               |
       Tabletop        Objects         Target Tray
                          |
                          v
                Object Interaction
                          |
                 Spectacles SIK
                          |
                          v
                Manipulation Events
                          |
                          v
               PickPlaceController
                          |
              +-----------+-----------+
              |                       |
              v                       v
        Placement Logic          Task Sequence
              |                       |
       Ray Projection           Red → Green → Blue
              |
       Tray Boundary Check
              |
       +------+------+
       |             |
       v             v
     Valid         Invalid
       |             |
       v             v
   Settle Object   Return / Retry
       |             |
       +------+------+
              |
              v
       Demonstration Recorder
              |
              v
          JSON Records
              |
              v
       Completion Summary
```

## Technology Stack

| Technology | Purpose |
|---|---|
| Snap Lens Studio | AR application development |
| Snap Spectacles platform | Target spatial computing platform |
| TypeScript | Application logic and scripting |
| Spectacles Interaction Kit (SIK) | Object interaction and manipulation |
| Lens Studio Scene System | Spatial objects and hierarchy |
| JSON | Structured demonstration records |

**Current SIK package:** SpectaclesInteractionKit 0.18.0.

The project also uses SpectaclesUIKit and associated Lens Studio assets.

---

## Workspace Coordinate System

RoboPilot-AR4IL uses a local workspace coordinate system to keep task geometry independent of the workspace's world-space placement.

### Coordinate conventions

| Property | Convention |
|---|---|
| Unit | Centimetres |
| Reference frame | Workspace |
| Origin | Tabletop centre |
| +X | Right |
| +Y | Up |
| +Z | Away |
| Lens world mapping | `(x, y, -z)` |

### Workspace geometry

| Component | Configuration |
|---|---|
| Tabletop | 80 × 2 × 50 cm |
| Cube dimensions | 5 × 5 × 5 cm |
| Cube resting centre | Y = 3.5 cm |
| Tray interior X | -16 to +9 cm |
| Tray interior Z | -10 to +10 cm |
| Tray rim plane | Y = 5 cm |
| WorkspaceRoot initial position | (0, -85, -60) |

The placement validation region accounts for the cube dimensions, ensuring that a valid cube placement remains within the tray's interior boundaries.

The workspace is organized around `WorkspaceRoot`, allowing the complete environment to be repositioned while preserving its local geometry.

---

## Project Structure

The primary implementation files are organized under `Assets/RoboPilot`.

```text
Assets/
└── RoboPilot/
    ├── Scripts/
    │   ├── WorkspaceFrame.ts
    │   ├── WorkspaceFrameSelfTest.ts
    │   ├── PlacementProjection.ts
    │   ├── CubeGrabProbe.ts
    │   └── PickPlaceController.ts
    │
    └── ...
```

### Core scripts

| Script | Responsibility |
|---|---|
| `WorkspaceFrame.ts` | Workspace coordinate transformations and geometry constants |
| `WorkspaceFrameSelfTest.ts` | Workspace coordinate and object-position validation |
| `PlacementProjection.ts` | Interactor ray projection onto the placement plane |
| `CubeGrabProbe.ts` | Interaction diagnostics and grab/move/release logging |
| `PickPlaceController.ts` | Pick-and-place workflow, placement decisions, sequencing and JSON recording |

The Lens Studio scene is stored at:

```text
Assets/Scene.scene
```

The scene contains the workspace, interactive objects, controller and associated components.

---

## How It Works

### Step 1: Initialize the workspace

The application initializes the spatial environment and its workspace coordinate frame.

The controller creates a demonstration session and activates the first object.

### Step 2: Grab an object

The user selects an interactive cube.

SIK manipulation events are used to detect the beginning of the interaction.

### Step 3: Move the object

The selected object follows the user's interaction.

The application observes its movement and calculates a projected placement point using the interactor ray.

### Step 4: Validate placement

On release, the system projects the interactor ray onto the tray rim plane.

The projected X/Z coordinates are checked against the valid placement region.

The system does not rely on mouse release height for placement decisions.

### Step 5: Process the result

**Successful placement**

- Accept the placement.
- Settle the object at Y = 3.5 cm.
- Record a successful demonstration.
- Advance the task sequence.

**Failed placement**

- Reject the placement.
- Record the failed attempt.
- Return the object to its starting position.
- Allow another attempt.

### Step 6: Capture demonstration data

The recorder generates structured JSON records containing the interaction and placement information.

### Step 7: Complete the task

After the red, green and blue objects have all been successfully placed, the application displays the completion message and generates a session summary.

---

## Demonstration Data Format

The system produces one JSON record per manipulation attempt.

### Example: Successful demonstration

```json
{
  "session_id": "session_example",
  "demonstration_id": "demo_001",
  "sequence_number": 1,
  "attempt_number": 1,
  "task_type": "pick_and_place",
  "coordinate_system": {
    "unit": "cm",
    "reference_frame": "workspace"
  },
  "data_source": "simulated",
  "object": {
    "object_id": "cube_red",
    "initial_position": {
      "x": -23.5,
      "y": 2.5,
      "z": -10
    },
    "release_position": {
      "x": -10.22,
      "y": 2.87,
      "z": -3.08
    },
    "placement_point": {
      "x": -10.09,
      "y": 5,
      "z": -3.73
    },
    "placement_method": "ray_projection",
    "final_position": {
      "x": -10.09,
      "y": 3.5,
      "z": -3.73
    }
  },
  "tray": {
    "tray_id": "target_tray",
    "placement_success": true
  },
  "interaction": {
    "pick_event": true,
    "release_event": true,
    "pick_timestamp_ms": 2054,
    "release_timestamp_ms": 4479,
    "duration_ms": 2425
  },
  "capture": {
    "status": "completed"
  }
}
```

### Example: Failed demonstration

```json
{
  "session_id": "session_example",
  "demonstration_id": "demo_001",
  "sequence_number": 1,
  "attempt_number": 1,
  "task_type": "pick_and_place",
  "coordinate_system": {
    "unit": "cm",
    "reference_frame": "workspace"
  },
  "data_source": "simulated",
  "object_id": "cube_red",
  "initial_position": {
    "x": -23.5,
    "y": 2.5,
    "z": -10
  },
  "release_position": {
    "x": 16.14,
    "y": 9.7,
    "z": 5.18
  },
  "placement_point": {
    "x": 16.97,
    "y": 5,
    "z": 10.5
  },
  "placement_method": "ray_projection",
  "pick_timestamp_ms": 3679,
  "release_timestamp_ms": 4849,
  "failure_reason": "released_outside_tray",
  "status": "failed"
}
```

The examples illustrate the current capture schema. Actual values depend on the interaction.

---

## Validation and Testing

The implementation has been tested in Lens Studio Preview.

### Workspace validation

`WorkspaceFrameSelfTest` completed successfully:

```text
SUMMARY ALL PASS
passed = 12
failed = 0
```

The 12 checks include:

- 4 coordinate round-trip checks.
- 7 object-position checks.
- 1 workspace-to-world transformation check.

### Interaction validation

Manual mouse-based Preview testing verified:

| Test | Result |
|---|---|
| Red cube grab and release | Passed |
| Green cube grab and release | Passed |
| Blue cube grab and release | Passed |
| Ray-projected placement | Passed |
| Valid placement detection | Passed |
| Cube settling at Y = 3.5 cm | Passed |
| Invalid placement detection | Passed |
| Failed-attempt JSON recording | Passed |
| Red → Green → Blue progression | Passed |
| Unique demonstration IDs | Passed |
| Three-demonstration completion summary | Passed |
| Completion message after blue placement | Passed |

### Re-entrant event handling

During testing, a duplicate-recording issue was identified.

Disabling manipulation inside the release handler caused SIK to emit another manipulation-end event synchronously.

A state transition guard was added at the beginning of the release handler to prevent duplicate processing.

Subsequent Preview logs confirmed exactly three unique successful demonstration records for the three-object sequence.

### Build status

The validated project state achieved:

- Successful TypeScript compilation.
- Zero TypeScript errors.
- No runtime errors or warnings during the verified Preview session.
- Workspace self-test: 12/12 passed.

---

## Running the Project

### Prerequisites

- Snap Lens Studio.
- A compatible Lens Studio version supporting the project.
- Spectacles Interaction Kit.
- The project dependencies and assets included in the repository.

The currently verified development environment uses SIK 0.18.0.

### Setup

1. Clone or download the repository.
2. Open the `RoboPilot-AR4IL.esproj` project in Lens Studio.
3. Allow Lens Studio to load the assets and compile the TypeScript scripts.
4. Verify that compilation completes without errors.
5. Select the appropriate Spectacles Preview configuration.
6. Start Preview.
7. Interact with the cubes using the mouse.

### Run the demonstration

1. Grab the red cube.
2. Move it into the target tray.
3. Release it.
4. Activate NEXT DEMO when available.
5. Repeat with the green cube.
6. Repeat with the blue cube.
7. Confirm that the demonstration completion message appears.

An unsuccessful placement can be tested by releasing an object outside the tray.

**Note:** The verified interaction workflow uses mouse-based Lens Studio Preview input. Physical Spectacles hand-interaction behavior has not been independently validated in this development cycle.

---

## Current Scope and Limitations

RoboPilot-AR4IL is currently a functional simulated AR demonstration-capture prototype.

The following distinctions are important:

**Implemented and tested**
- Spatial pick-and-place workspace.
- Mouse-based SIK manipulation.
- Placement validation through ray projection.
- Successful placement settling.
- Failed-placement detection and JSON recording.
- Sequential three-object workflow.
- Demonstration completion handling.
- Structured simulated demonstration records.

**Not yet implemented or validated**
- Physical robot control.
- Direct export into a robot-specific training pipeline.
- Robot trajectory reconstruction.
- Joint-space or end-effector trajectory capture.
- Real-world Spectacles hand-tracking validation.
- Sim-to-real policy deployment.
- Automated imitation-learning model training.
- Persistent dataset storage beyond the current Logger-based JSON output.

The current JSON records are structured demonstration metadata and interaction summaries. They should not be interpreted as complete robot trajectories or a ready-to-train imitation-learning dataset.

---

## Future Roadmap

### Phase 1 — AR Demonstration Interface
- Expand spatial guidance.
- Improve visual feedback during manipulation.
- Add richer task instructions and progress indicators.

### Phase 2 — Demonstration Data
- Persistent JSON/JSONL dataset export.
- Capture richer spatial interaction samples.
- Record object trajectories over time.
- Add dataset validation and replay.

### Phase 3 — Imitation Learning Integration
- Convert demonstrations into robot-compatible representations.
- Develop trajectory preprocessing pipelines.
- Train behavior-cloning or other imitation-learning policies.
- Evaluate learned manipulation behavior.

### Phase 4 — RoboPilot Ecosystem Integration
- Integrate with RoboPilot-Sim2Real.
- Replay demonstrations in a robotics simulator.
- Evaluate transfer from demonstrated behavior to simulated robot execution.
- Explore eventual real-robot deployment.

---

## Relationship with the RoboPilot Ecosystem

RoboPilot-AR4IL is intended to complement the broader RoboPilot ecosystem.

| Project | Focus |
|---|---|
| RoboPilot-AR4IL | AR-based human manipulation demonstrations |
| RoboPilot-VR4IL | VR-based demonstration and imitation-learning workflows |
| RoboPilot-Sim2Real | Simulation-driven robot learning and sim-to-real research |

The long-term vision is to explore how AR and VR interfaces can make robot teaching more accessible, while simulation and learning systems transform demonstrations into executable robot behavior.

These integrations are future development directions, not capabilities claimed by the current AR4IL implementation.

---

## Why RoboPilot-AR4IL?

The project explores a simple but powerful idea:

**Instead of programming every robot movement, let humans demonstrate the task through an intuitive spatial interface.**

RoboPilot-AR4IL takes an initial step toward this approach by combining spatial computing, interactive manipulation, geometric validation and structured demonstration capture.

It establishes a foundation for investigating how human demonstrations can eventually contribute to robot imitation learning.

---

## Acknowledgements

Built using Snap Lens Studio and Spectacles Interaction Kit.

Part of the broader RoboPilot exploration into spatial computing, imitation learning and robot manipulation.

---

## License

Add the repository's chosen license here before public distribution. Check the licenses of all third-party packages and assets before redistribution.

---

<p align="center">
  <strong>RoboPilot-AR4IL</strong><br/>
  <em>Teaching robots through spatial demonstrations.</em>
</p>