# Layline GitHub Projects Backlog

This backlog turns the 90-day "digital tactician" roadmap into GitHub-ready work items for `jrsmith90/layline`.

## Recommended Project Setup

Create a new GitHub Project named `Layline 90-Day Tactical Coach`.

Link the `jrsmith90/layline` repository to the project so repository issues can be added directly.

Use the built-in `Status` field plus project custom fields by default.
If you already use organization-level issue fields, map the same values there instead of duplicating them.

### Custom Fields

| Field | Type | Values / Notes |
| --- | --- | --- |
| `Status` | Built-in or single select | `Backlog`, `Ready`, `In Progress`, `Blocked`, `Review`, `Done` |
| `Priority` | Single select | `P0`, `P1`, `P2` |
| `Sprint` | Single select | `S1`, `S2`, `S3`, `S4`, `S5`, `S6` |
| `Area` | Single select | `Race State`, `Data Sources`, `Session Backend`, `Performance`, `Tactics`, `Review`, `UX Ops` |
| `Type` | Single select | `Feature`, `Tech Debt`, `Research`, `Validation` |
| `Estimate` | Single select | `XS`, `S`, `M`, `L`, `XL` |
| `Dependencies` | Text | Use backlog ids such as `R1-01` |
| `Target Date` | Date | Optional, useful for roadmap view |

### Labels

Create these labels once and reuse them across every ticket:

- `area:race-state`
- `area:data-sources`
- `area:session-backend`
- `area:performance`
- `area:tactics`
- `area:review`
- `area:ux-ops`
- `type:feature`
- `type:tech-debt`
- `type:research`
- `type:validation`
- `priority:p0`
- `priority:p1`
- `priority:p2`
- `sprint:s1`
- `sprint:s2`
- `sprint:s3`
- `sprint:s4`
- `sprint:s5`
- `sprint:s6`

### Milestones

Use one milestone per sprint plus a final release milestone:

- `Sprint 1 - Shared Race State` due `2026-05-27`
- `Sprint 2 - Persistence And Session Backbone` due `2026-06-10`
- `Sprint 3 - Automatic Race Progression` due `2026-06-24`
- `Sprint 4 - Boat-Specific Performance Layer` due `2026-07-08`
- `Sprint 5 - Tactical Options Engine` due `2026-07-22`
- `Sprint 6 - Review, Learning, And Validation` due `2026-08-05`
- `Digital Tactician MVP` due `2026-08-11`

### Suggested Views

- `Backlog`: table, grouped by `Sprint`, sorted by `Priority`
- `Current Sprint`: board, filtered to the active `Sprint` value and `Status` not equal to `Done`
- `Roadmap`: roadmap layout using `Target Date`
- `By Area`: board grouped by `Area`
- `Validation`: table filtered to `Type:Validation` or `Type:Research`

## Intake Order

1. Create the project and add the custom fields above.
2. Create the labels and milestones.
3. Create repository issues from the ticket blocks below.
4. Add the issues to the project in bulk.
5. Fill project fields from each ticket's metadata block.
6. Save a project template after the fields and views feel right.

## Ticket Format

Each ticket below is intentionally formatted for direct copy into a GitHub issue.

- The heading is the issue title.
- The `Meta` block maps cleanly to labels, milestones, and project fields.
- The remaining sections can be pasted into the issue body.

---

## [Backlog] R1-01 Create canonical RaceState domain model

**Meta**
- Milestone: `Sprint 1 - Shared Race State`
- Labels: `area:race-state`, `type:feature`, `priority:p0`, `sprint:s1`
- Priority: `P0`
- Sprint: `S1`
- Area: `Race State`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `None`
- Target Date: `2026-05-15`

**Summary**
Create a single typed `RaceState` domain model that represents boat state, wind state, course state, leg state, confidence, and source metadata.

**Acceptance Criteria**
- A shared type exists for `RaceState` and related subtypes.
- Boat, wind, course, and confidence data can be represented without component-local assumptions.
- Shared selectors can consume the model without depending on page UI state.

**File Targets**
- `lib/race/state/types.ts`
- `lib/race/state/deriveRaceState.ts`
- `lib/race/state/selectors.ts`

## [Backlog] R1-02 Create race data-source abstraction layer

**Meta**
- Milestone: `Sprint 1 - Shared Race State`
- Labels: `area:data-sources`, `type:feature`, `priority:p0`, `sprint:s1`
- Priority: `P0`
- Sprint: `S1`
- Area: `Data Sources`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R1-01`
- Target Date: `2026-05-18`

**Summary**
Introduce a source interface so live race features can consume browser GPS now and instrument feeds later through the same contract.

**Acceptance Criteria**
- A generic race input source interface exists.
- `useGpsCourse` is adapted to the new abstraction instead of being the direct dependency everywhere.
- Source metadata includes freshness and confidence hooks for later use.

**File Targets**
- `lib/race/dataSources/types.ts`
- `lib/race/dataSources/phoneGpsSource.ts`
- `lib/useGpsCourse.ts`

## [Backlog] R1-03 Move live cockpit to shared race-state selectors

**Meta**
- Milestone: `Sprint 1 - Shared Race State`
- Labels: `area:race-state`, `type:tech-debt`, `priority:p0`, `sprint:s1`
- Priority: `P0`
- Sprint: `S1`
- Area: `Race State`
- Type: `Tech Debt`
- Estimate: `L`
- Dependencies: `R1-01`, `R1-02`
- Target Date: `2026-05-20`

**Summary**
Refactor the live cockpit so it reads derived race-state selectors instead of owning core interpretation logic locally.

**Acceptance Criteria**
- `RaceLiveCockpit` consumes shared race-state selectors for live calls.
- Existing behavior is preserved or intentionally improved with no duplicate derivation logic left behind.
- The component surface becomes presentation-first instead of decision-engine-first.

**File Targets**
- `components/race/RaceLiveCockpit.tsx`

## [Backlog] R1-04 Move course tracker to shared race-state selectors

**Meta**
- Milestone: `Sprint 1 - Shared Race State`
- Labels: `area:race-state`, `type:tech-debt`, `priority:p0`, `sprint:s1`
- Priority: `P0`
- Sprint: `S1`
- Area: `Race State`
- Type: `Tech Debt`
- Estimate: `M`
- Dependencies: `R1-01`, `R1-02`
- Target Date: `2026-05-22`

**Summary**
Refactor the active course tracker to derive course, leg, and mark state from the same shared selectors as the cockpit.

**Acceptance Criteria**
- `ActiveCourseTracker` and `RaceLiveCockpit` agree on active leg and mark interpretation from the same state.
- No duplicate course-state derivation remains in the tracker component.
- Shared selectors cover the tracker use cases cleanly.

**File Targets**
- `components/race/ActiveCourseTracker.tsx`

## [Backlog] R1-05 Add confidence plumbing to live race state

**Meta**
- Milestone: `Sprint 1 - Shared Race State`
- Labels: `area:race-state`, `type:feature`, `priority:p1`, `sprint:s1`
- Priority: `P1`
- Sprint: `S1`
- Area: `Race State`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R1-01`, `R1-02`
- Target Date: `2026-05-26`

**Summary**
Make confidence an explicit part of race-state derivation so low quality inputs degrade calls deliberately instead of only surfacing as loose warnings.

**Acceptance Criteria**
- Low speed, stale wind, and weak GPS quality can lower race-state confidence.
- Shared selectors expose confidence and reasons, not just a boolean.
- Live consumers can branch on confidence without custom component logic.

**File Targets**
- `lib/race/courseTracker.ts`
- `lib/race/state/types.ts`
- `lib/race/state/deriveRaceState.ts`

## [Backlog] R2-01 Replace browser-only active session persistence with shared session repository

**Meta**
- Milestone: `Sprint 2 - Persistence And Session Backbone`
- Labels: `area:session-backend`, `type:feature`, `priority:p0`, `sprint:s2`
- Priority: `P0`
- Sprint: `S2`
- Area: `Session Backend`
- Type: `Feature`
- Estimate: `L`
- Dependencies: `R1-01`
- Target Date: `2026-05-29`

**Summary**
Move race sessions beyond browser-local storage so sessions survive refreshes, device changes, and multi-screen use.

**Acceptance Criteria**
- A shared repository exists for loading and saving active sessions.
- Local storage remains a fallback instead of the primary truth.
- Active session recovery works after refresh without losing recorder context.

**File Targets**
- `lib/raceSessionStore.ts`
- `app/api/*`

## [Backlog] R2-02 Add session schema for fused race-state snapshots

**Meta**
- Milestone: `Sprint 2 - Persistence And Session Backbone`
- Labels: `area:session-backend`, `type:feature`, `priority:p0`, `sprint:s2`
- Priority: `P0`
- Sprint: `S2`
- Area: `Session Backend`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R2-01`
- Target Date: `2026-06-01`

**Summary**
Persist periodic race-state snapshots so review can reconstruct what the app believed in the moment, not just raw GPS and notes.

**Acceptance Criteria**
- Session storage supports fused state snapshots on a cadence.
- Stored snapshots include confidence, selected sources, and active leg details.
- Review code can load snapshots without recomputing everything from scratch.

**File Targets**
- `lib/raceSessionStore.ts`
- `lib/race/state/types.ts`

## [Backlog] R2-03 Persist weather-source metadata with tactical decisions

**Meta**
- Milestone: `Sprint 2 - Persistence And Session Backbone`
- Labels: `area:session-backend`, `type:feature`, `priority:p1`, `sprint:s2`
- Priority: `P1`
- Sprint: `S2`
- Area: `Session Backend`
- Type: `Feature`
- Estimate: `S`
- Dependencies: `R2-01`, `R2-02`
- Target Date: `2026-06-03`

**Summary**
Record which wind or current source drove each tactical call so review can explain whether a bad call came from bad logic or bad inputs.

**Acceptance Criteria**
- Decision records store source id, freshness, confidence, and course section relevance.
- Recorder uses the new metadata consistently for saved calls.
- Review surfaces the stored source metadata without manual reconstruction.

**File Targets**
- `components/race/RaceRecorderPanel.tsx`
- `lib/raceSessionStore.ts`

## [Backlog] R2-04 Add remote session recovery with local fallback

**Meta**
- Milestone: `Sprint 2 - Persistence And Session Backbone`
- Labels: `area:session-backend`, `type:feature`, `priority:p1`, `sprint:s2`
- Priority: `P1`
- Sprint: `S2`
- Area: `Session Backend`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R2-01`, `R2-02`
- Target Date: `2026-06-05`

**Summary**
Allow the app to recover active or recent race sessions from shared storage while still falling back cleanly to local browser data.

**Acceptance Criteria**
- Session recovery checks shared storage first and local storage second.
- Review and active race flows can resume from either source.
- Recovery errors degrade gracefully and do not wipe local data.

**File Targets**
- `lib/raceSessionStore.ts`
- `app/race/review/page.tsx`

## [Backlog] R2-05 Turn Race Mode and Learning Mode into real application behavior

**Meta**
- Milestone: `Sprint 2 - Persistence And Session Backbone`
- Labels: `area:ux-ops`, `type:feature`, `priority:p1`, `sprint:s2`
- Priority: `P1`
- Sprint: `S2`
- Area: `UX Ops`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R1-03`, `R1-04`
- Target Date: `2026-06-09`

**Summary**
Make the mode switch alter downstream behavior so race mode favors terse high-confidence prompts while learning mode exposes more explanation and coaching.

**Acceptance Criteria**
- Mode selection is stored in shared app state, not only on the home page.
- Race mode reduces noise and explanation volume in live views.
- Learning mode expands why, fix, and teaching context in live views.

**File Targets**
- `app/page.tsx`
- `components/race/RaceLiveCockpit.tsx`
- `components/race/ActiveCourseTracker.tsx`
- `lib/race/*`

## [Backlog] R3-01 Auto-detect active leg transitions

**Meta**
- Milestone: `Sprint 3 - Automatic Race Progression`
- Labels: `area:race-state`, `type:feature`, `priority:p0`, `sprint:s3`
- Priority: `P0`
- Sprint: `S3`
- Area: `Race State`
- Type: `Feature`
- Estimate: `L`
- Dependencies: `R1-01`, `R1-03`, `R1-04`
- Target Date: `2026-06-12`

**Summary**
Advance the active leg automatically from boat movement and mark geometry so the crew no longer needs to tap through normal roundings.

**Acceptance Criteria**
- The app can detect a valid leg transition after rounding behavior.
- Manual override remains available when automatic detection is unsure.
- Live cockpit and tracker update leg state from the same transition event.

**File Targets**
- `lib/race/legDetection.ts`
- `components/race/RaceLiveCockpit.tsx`
- `components/race/ActiveCourseTracker.tsx`

## [Backlog] R3-02 Add mark-rounding confirmation states

**Meta**
- Milestone: `Sprint 3 - Automatic Race Progression`
- Labels: `area:race-state`, `type:feature`, `priority:p1`, `sprint:s3`
- Priority: `P1`
- Sprint: `S3`
- Area: `Race State`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R3-01`
- Target Date: `2026-06-15`

**Summary**
Introduce explicit `approaching`, `rounding`, and `settled on new leg` states to reduce abrupt transitions and improve coaching around marks.

**Acceptance Criteria**
- Mark-phase state is part of race-state derivation.
- Live views can distinguish pre-rounding and post-rounding coaching.
- State transitions do not oscillate on noisy GPS traces.

**File Targets**
- `lib/race/courseTracker.ts`
- `lib/race/state/types.ts`
- `components/race/RaceLiveCockpit.tsx`
- `components/race/ActiveCourseTracker.tsx`

## [Backlog] R3-03 Add stale-input detection

**Meta**
- Milestone: `Sprint 3 - Automatic Race Progression`
- Labels: `area:data-sources`, `type:feature`, `priority:p0`, `sprint:s3`
- Priority: `P0`
- Sprint: `S3`
- Area: `Data Sources`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R1-02`, `R1-05`
- Target Date: `2026-06-17`

**Summary**
Detect stale GPS, weather, and nearby observation inputs and use that health signal to reduce confidence or suppress bad calls.

**Acceptance Criteria**
- Source health is computed centrally instead of ad hoc in components.
- Stale inputs change confidence and user messaging consistently.
- Health data is available to both live views and recorder logic.

**File Targets**
- `lib/race/state/sourceHealth.ts`
- `components/race/RaceLiveCockpit.tsx`

## [Backlog] R3-04 Add automatic wind-source ranking

**Meta**
- Milestone: `Sprint 3 - Automatic Race Progression`
- Labels: `area:data-sources`, `type:feature`, `priority:p0`, `sprint:s3`
- Priority: `P0`
- Sprint: `S3`
- Area: `Data Sources`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R1-05`, `R3-03`
- Target Date: `2026-06-19`

**Summary**
Score available wind sources by relevance so the live engine can prefer the right source for the current leg and course section.

**Acceptance Criteria**
- Wind sources are ranked by distance, freshness, relevance, and agreement.
- The chosen source and why it won are visible in the UI or debugging output.
- Manual override remains possible when the crew wants to force a source.

**File Targets**
- `lib/race/windSourceRanking.ts`
- `components/race/RaceLiveCockpit.tsx`

## [Backlog] R3-05 Add regression tests for race progression and stale-input edge cases

**Meta**
- Milestone: `Sprint 3 - Automatic Race Progression`
- Labels: `area:race-state`, `type:validation`, `priority:p1`, `sprint:s3`
- Priority: `P1`
- Sprint: `S3`
- Area: `Race State`
- Type: `Validation`
- Estimate: `M`
- Dependencies: `R3-01`, `R3-02`, `R3-03`, `R3-04`
- Target Date: `2026-06-23`

**Summary**
Capture real race scenarios as regression tests so rounding, layline, and stale-input logic stays stable as the tactical engine grows.

**Acceptance Criteria**
- Tests cover false rounding, overstood layline, stale wind, and missed mark edge cases.
- New automatic progression logic is exercised without requiring UI rendering.
- Failing scenarios are easy to extend with new fixtures later.

**File Targets**
- `lib/race/__tests__/legDetection.test.ts`
- `lib/race/__tests__/courseTracker.test.ts`

## [Backlog] R4-01 Introduce boat-performance configuration

**Meta**
- Milestone: `Sprint 4 - Boat-Specific Performance Layer`
- Labels: `area:performance`, `type:feature`, `priority:p0`, `sprint:s4`
- Priority: `P0`
- Sprint: `S4`
- Area: `Performance`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R1-01`
- Target Date: `2026-06-26`

**Summary**
Create a boat profile configuration for target angles, target speeds, maneuver losses, and sail crossovers so tactical calls are boat-specific.

**Acceptance Criteria**
- Boat performance data can be configured without code changes to the tactical engine.
- Target angle and speed tables exist for at least the primary wind bands.
- Maneuver loss and sail crossover values live in the same profile system.

**File Targets**
- `data/performance/boatProfile.ts`
- `data/performance/polars.ts`
- `data/performance/sailCrossovers.ts`

## [Backlog] R4-02 Connect tack calibration to race-day targets

**Meta**
- Milestone: `Sprint 4 - Boat-Specific Performance Layer`
- Labels: `area:performance`, `type:feature`, `priority:p0`, `sprint:s4`
- Priority: `P0`
- Sprint: `S4`
- Area: `Performance`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R4-01`
- Target Date: `2026-06-29`

**Summary**
Use measured tack calibration to adjust race-day target angles and layline assumptions instead of treating calibration as a separate side panel.

**Acceptance Criteria**
- Tack calibration feeds the active performance model.
- Race-day measured values can override default boat targets when confidence is high enough.
- The system falls back cleanly when no calibration exists yet.

**File Targets**
- `lib/race/tackCalibration.ts`
- `lib/race/performance/getRaceTargets.ts`

## [Backlog] R4-03 Add performance delta metrics to live views

**Meta**
- Milestone: `Sprint 4 - Boat-Specific Performance Layer`
- Labels: `area:performance`, `type:feature`, `priority:p1`, `sprint:s4`
- Priority: `P1`
- Sprint: `S4`
- Area: `Performance`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R4-01`, `R4-02`
- Target Date: `2026-07-01`

**Summary**
Show whether the boat is above, on, or below target speed and angle so coaching can distinguish tactical choices from execution misses.

**Acceptance Criteria**
- Live views show clear target deltas for speed and angle when enough data exists.
- Delta logic uses the configured boat profile plus race-day adjustments.
- Missing inputs degrade gracefully without fake precision.

**File Targets**
- `components/race/RaceLiveCockpit.tsx`
- `components/race/ActiveCourseTracker.tsx`

## [Backlog] R4-04 Add start-line tactical scoring v1

**Meta**
- Milestone: `Sprint 4 - Boat-Specific Performance Layer`
- Labels: `area:tactics`, `type:feature`, `priority:p1`, `sprint:s4`
- Priority: `P1`
- Sprint: `S4`
- Area: `Tactics`
- Type: `Feature`
- Estimate: `L`
- Dependencies: `R3-04`, `R4-01`
- Target Date: `2026-07-03`

**Summary**
Rank start-side options using line bias, shift bias, bailout risk, and selected wind source so the start workflow feeds the same tactical model as the race cockpit.

**Acceptance Criteria**
- Start recommendations are ranked instead of descriptive only.
- The scoring input model is explicit and testable.
- The output explains the main reason each start option ranks where it does.

**File Targets**
- `app/start/page.tsx`
- `lib/start/startScoring.ts`

## [Backlog] R4-05 Add acceptance tests for boat-profile switching

**Meta**
- Milestone: `Sprint 4 - Boat-Specific Performance Layer`
- Labels: `area:performance`, `type:validation`, `priority:p1`, `sprint:s4`
- Priority: `P1`
- Sprint: `S4`
- Area: `Performance`
- Type: `Validation`
- Estimate: `S`
- Dependencies: `R4-01`, `R4-02`
- Target Date: `2026-07-07`

**Summary**
Protect the performance layer with tests that prove different boat profiles produce different tactical targets without engine rewrites.

**Acceptance Criteria**
- Tests cover at least two boat profiles or profile variants.
- Target angle and speed outputs change predictably by profile.
- Calibration overrides are covered by at least one scenario.

**File Targets**
- `lib/race/__tests__/*`
- `lib/start/__tests__/*`

## [Backlog] R5-01 Replace single live call with ranked tactical options

**Meta**
- Milestone: `Sprint 5 - Tactical Options Engine`
- Labels: `area:tactics`, `type:feature`, `priority:p0`, `sprint:s5`
- Priority: `P0`
- Sprint: `S5`
- Area: `Tactics`
- Type: `Feature`
- Estimate: `XL`
- Dependencies: `R3-04`, `R4-01`, `R4-02`, `R4-03`
- Target Date: `2026-07-10`

**Summary**
Evolve the cockpit from one rule-based answer into a ranked set of tactical options with confidence, expected gain, and main risk.

**Acceptance Criteria**
- The live engine can produce at least three ranked options.
- Each option includes confidence, expected gain, and primary risk.
- Existing one-line call output is preserved as a derived "top option" display.

**File Targets**
- `lib/race/tacticalOptions.ts`
- `components/race/RaceLiveCockpit.tsx`

## [Backlog] R5-02 Add tactical horizons for now, soon, and leg setup

**Meta**
- Milestone: `Sprint 5 - Tactical Options Engine`
- Labels: `area:tactics`, `type:feature`, `priority:p0`, `sprint:s5`
- Priority: `P0`
- Sprint: `S5`
- Area: `Tactics`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R5-01`
- Target Date: `2026-07-13`

**Summary**
Split tactical output into immediate, near-term, and leg-horizon guidance so the crew can act now without losing the bigger setup.

**Acceptance Criteria**
- The tactical engine exposes `now`, `soon`, and `leg` guidance layers.
- The cockpit UI can display all three without becoming noisy.
- Horizon guidance is consistent with the top-ranked option.

**File Targets**
- `lib/race/tacticalOptions.ts`
- `components/race/RaceLiveCockpit.tsx`

## [Backlog] R5-03 Add manual fleet-context inputs

**Meta**
- Milestone: `Sprint 5 - Tactical Options Engine`
- Labels: `area:tactics`, `type:feature`, `priority:p1`, `sprint:s5`
- Priority: `P1`
- Sprint: `S5`
- Area: `Tactics`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R5-01`
- Target Date: `2026-07-15`

**Summary**
Add a lightweight way for the crew to tell the app about clear lanes, cover threats, crossing risk, or leebow pressure so options reflect the fleet around them.

**Acceptance Criteria**
- The UI supports fast entry of core fleet-context flags.
- Tactical ranking changes when fleet-context inputs are present.
- Fleet-context state is persisted in the active session for review.

**File Targets**
- `components/race/FleetContextPanel.tsx`
- `components/race/RaceLiveCockpit.tsx`
- `lib/raceSessionStore.ts`

## [Backlog] R5-04 Add role-based tactical output shaping

**Meta**
- Milestone: `Sprint 5 - Tactical Options Engine`
- Labels: `area:tactics`, `type:feature`, `priority:p1`, `sprint:s5`
- Priority: `P1`
- Sprint: `S5`
- Area: `Tactics`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R5-01`, `R5-02`
- Target Date: `2026-07-17`

**Summary**
Render the same tactical result differently for helm, tactician, and trimmer so each role hears the part of the call they need most.

**Acceptance Criteria**
- A shared tactical result can be transformed into role-specific output.
- At least helm, tactician, and trimmer views are supported.
- The role layer stays presentation-focused and does not fork tactical logic.

**File Targets**
- `lib/race/coachOutput.ts`
- `components/race/RaceLiveCockpit.tsx`

## [Backlog] R5-05 Add voice-ready tactical phrasing

**Meta**
- Milestone: `Sprint 5 - Tactical Options Engine`
- Labels: `area:ux-ops`, `type:feature`, `priority:p1`, `sprint:s5`
- Priority: `P1`
- Sprint: `S5`
- Area: `UX Ops`
- Type: `Feature`
- Estimate: `S`
- Dependencies: `R5-04`
- Target Date: `2026-07-21`

**Summary**
Produce concise spoken-command versions of tactical outputs so the system can evolve into an audible onboard coach later.

**Acceptance Criteria**
- Every top tactical option has a short spoken form under roughly 12 words.
- Spoken output keeps the action first and explanation second.
- The phrasing layer is reusable for future voice output or notifications.

**File Targets**
- `lib/race/coachOutput.ts`

## [Backlog] R6-01 Upgrade review into phase-based coaching

**Meta**
- Milestone: `Sprint 6 - Review, Learning, And Validation`
- Labels: `area:review`, `type:feature`, `priority:p0`, `sprint:s6`
- Priority: `P0`
- Sprint: `S6`
- Area: `Review`
- Type: `Feature`
- Estimate: `L`
- Dependencies: `R2-02`, `R5-01`
- Target Date: `2026-07-24`

**Summary**
Reframe review around race phases such as start, first beat, mid-leg, roundings, and downwind so the output feels like coaching instead of logs.

**Acceptance Criteria**
- Review groups decisions and outcomes by race phase.
- Phase grouping works from stored session and fused-state data.
- The UI makes it easy to scan which phase cost or gained the most.

**File Targets**
- `lib/raceSessionStore.ts`
- `app/race/review/page.tsx`

## [Backlog] R6-02 Add top wins, top misses, and next-race drills

**Meta**
- Milestone: `Sprint 6 - Review, Learning, And Validation`
- Labels: `area:review`, `type:feature`, `priority:p0`, `sprint:s6`
- Priority: `P0`
- Sprint: `S6`
- Area: `Review`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R6-01`
- Target Date: `2026-07-28`

**Summary**
Turn each race session into a training artifact with repeatable strengths, missed opportunities, and the next drills to focus on.

**Acceptance Criteria**
- Review produces three wins, three misses, and three drills automatically.
- Drill suggestions tie back to recorded calls or performance deltas.
- The output is readable on mobile and desktop without digging through logs.

**File Targets**
- `lib/raceSessionStore.ts`
- `app/race/review/page.tsx`

## [Backlog] R6-03 Add source-quality review

**Meta**
- Milestone: `Sprint 6 - Review, Learning, And Validation`
- Labels: `area:review`, `type:feature`, `priority:p1`, `sprint:s6`
- Priority: `P1`
- Sprint: `S6`
- Area: `Review`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R2-03`, `R3-04`, `R6-01`
- Target Date: `2026-07-30`

**Summary**
Help review answer whether a bad result came from flawed reasoning, stale data, or the wrong wind source for the leg.

**Acceptance Criteria**
- Review surfaces source choice, freshness, and confidence alongside decisions.
- Sessions with repeated bad-source patterns are easy to spot.
- The feature works without requiring manual note taking during the race.

**File Targets**
- `app/race/review/page.tsx`
- `lib/raceSessionStore.ts`

## [Backlog] R6-04 Add expert debrief export package

**Meta**
- Milestone: `Sprint 6 - Review, Learning, And Validation`
- Labels: `area:review`, `type:feature`, `priority:p1`, `sprint:s6`
- Priority: `P1`
- Sprint: `S6`
- Area: `Review`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R2-02`, `R6-01`, `R6-02`
- Target Date: `2026-08-03`

**Summary**
Export a clean race package for outside coaching review, including track, fused state, tactical calls, and source metadata.

**Acceptance Criteria**
- Export includes enough context for an external reviewer to replay decisions.
- Export format is documented and stable enough for repeated use.
- Sensitive or noisy fields are excluded or clearly labeled.

**File Targets**
- `lib/raceSessionStore.ts`
- `app/race/review/page.tsx`

## [Backlog] R6-05 Run three on-water validation cycles and tune thresholds

**Meta**
- Milestone: `Sprint 6 - Review, Learning, And Validation`
- Labels: `area:review`, `type:validation`, `priority:p0`, `sprint:s6`
- Priority: `P0`
- Sprint: `S6`
- Area: `Review`
- Type: `Validation`
- Estimate: `L`
- Dependencies: `R5-01`, `R6-01`
- Target Date: `2026-08-05`

**Summary**
Validate the digital tactician MVP on the water, tune thresholds from observed misses, and lock the most important improvements before release.

**Acceptance Criteria**
- At least three field sessions are completed and reviewed.
- False positives, missed calls, and confusing prompts are logged and triaged.
- Threshold or prompt changes are documented and tied back to observed evidence.

**File Targets**
- `lib/race/courseTracker.ts`
- `lib/race/tackCalibration.ts`
- `docs/validation-notes/*`

## [Backlog] X-01 Add debug event trail for every live recommendation

**Meta**
- Milestone: `Digital Tactician MVP`
- Labels: `area:ux-ops`, `type:tech-debt`, `priority:p1`
- Priority: `P1`
- Sprint: `Cross-cutting`
- Area: `UX Ops`
- Type: `Tech Debt`
- Estimate: `M`
- Dependencies: `R5-01`
- Target Date: `2026-08-08`

**Summary**
Record why the engine chose a recommendation so debugging and review do not depend on guesswork.

**Acceptance Criteria**
- Live recommendations emit a structured debug trail.
- Debug output can be stored or surfaced without polluting the cockpit UI.
- Review or development tooling can inspect the recommendation trail later.

**File Targets**
- `lib/race/tacticalOptions.ts`
- `lib/raceSessionStore.ts`

## [Backlog] X-02 Add scenario fixtures from real races for replay testing

**Meta**
- Milestone: `Digital Tactician MVP`
- Labels: `area:review`, `type:validation`, `priority:p1`
- Priority: `P1`
- Sprint: `Cross-cutting`
- Area: `Review`
- Type: `Validation`
- Estimate: `M`
- Dependencies: `R3-05`, `R5-01`
- Target Date: `2026-08-08`

**Summary**
Capture anonymized real-race scenarios so engine changes can be replayed against realistic tactical moments before they hit the boat again.

**Acceptance Criteria**
- Fixtures represent real race states instead of only synthetic cases.
- Replay fixtures are easy to extend as new edge cases appear.
- The tactical engine can run against fixtures in tests or dev tooling.

**File Targets**
- `lib/race/__fixtures__/*`
- `lib/race/__tests__/*`

## [Backlog] X-03 Add "why confidence is low" UI in live and review flows

**Meta**
- Milestone: `Digital Tactician MVP`
- Labels: `area:ux-ops`, `type:feature`, `priority:p1`
- Priority: `P1`
- Sprint: `Cross-cutting`
- Area: `UX Ops`
- Type: `Feature`
- Estimate: `S`
- Dependencies: `R1-05`, `R3-03`
- Target Date: `2026-08-09`

**Summary**
Explain low confidence clearly so the crew knows when to trust the app less and why.

**Acceptance Criteria**
- Live views and review both surface confidence reasons consistently.
- Confidence explanations point to concrete causes such as stale wind or weak GPS.
- Explanations remain short in race mode and fuller in learning mode.

**File Targets**
- `components/race/RaceLiveCockpit.tsx`
- `app/race/review/page.tsx`

## [Backlog] X-04 Add lightweight admin editing for boat profile and tactical thresholds

**Meta**
- Milestone: `Digital Tactician MVP`
- Labels: `area:performance`, `type:feature`, `priority:p2`
- Priority: `P2`
- Sprint: `Cross-cutting`
- Area: `Performance`
- Type: `Feature`
- Estimate: `M`
- Dependencies: `R4-01`, `R5-01`
- Target Date: `2026-08-10`

**Summary**
Make the most important performance and tactical thresholds editable without code changes so the crew can tune the system after validation.

**Acceptance Criteria**
- Core profile and threshold values can be edited without touching source files.
- Validation rules prevent obviously broken values.
- Changes are traceable and can be rolled back.

**File Targets**
- `data/performance/*`
- `app/*`

## [Backlog] X-05 Document race-day operator workflow

**Meta**
- Milestone: `Digital Tactician MVP`
- Labels: `area:ux-ops`, `type:research`, `priority:p1`
- Priority: `P1`
- Sprint: `Cross-cutting`
- Area: `UX Ops`
- Type: `Research`
- Estimate: `S`
- Dependencies: `R2-05`, `R5-04`
- Target Date: `2026-08-11`

**Summary**
Write the operator playbook for how the crew should actually use the app during a race so adoption does not depend on tribal knowledge.

**Acceptance Criteria**
- The workflow covers setup, pre-start, active race, troubleshooting, and review.
- Role-specific usage is documented where the app behavior differs by role.
- The document is short enough to be used on a real race morning.

**File Targets**
- `docs/race-day-operator-workflow.md`

## Definition Of Done For The 90-Day Program

- Live cockpit and tracker share the same race-state engine.
- Course progression is mostly automatic.
- Wind source choice is ranked instead of manually trusted by default.
- Tactical output is ranked options rather than a single opaque answer.
- Boat-specific targets meaningfully influence live calls.
- Sessions are durable across refreshes and devices.
- Review produces actionable coaching, not only historical logs.
- The system is tuned with at least three on-water validation cycles.
