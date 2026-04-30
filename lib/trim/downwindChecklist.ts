import type {
  ChecklistPhase,
  CrewCount,
  DownwindChecklistConfig,
  WeightDistributionNote,
} from "@/types/trim";

export const crewCountOptions: CrewCount[] = [3, 4, 5, 6];

const phases: ChecklistPhase[] = [
  "pre-rounding prep",
  "approach and rounding",
  "bear away",
  "pole on / pole set",
  "hoist",
  "trim until full",
  "jib down",
  "settle into downwind mode",
];

const masterSequence = phases.map((phase) => {
  const detailByPhase: Record<ChecklistPhase, string[]> = {
    "pre-rounding prep": [
      "Confirm spinnaker is packed, sheets and guys are clear, halyard is ready, and the pole is free to move.",
      "Assign the set: who calls pressure, who controls halyard, who squares the pole, and who keeps the boat turning.",
    ],
    "approach and rounding": [
      "Hold the upwind mode until the mark is made, then prepare for a smooth bear away without oversteering.",
      "Keep the jib drawing through the rounding so the bow stays powered and the spinnaker has clean air when it goes up.",
    ],
    "bear away": [
      "Turn down far enough that the hoist happens behind the main, with the boat stable and the apparent wind eased aft.",
      "Main eases in step with the turn; avoid loading the rig while the pole and kite are still being made.",
    ],
    "pole on / pole set": [
      "Mast works between the bulkhead and mast, helps the pole onto the mast ring, and confirms the outboard end is controlled.",
      "Bow keeps the pole clear of the forestay and confirms the guy is running before the hoist call.",
    ],
    hoist: [
      "Pit hoists hard and clean only after the boat has borne away enough and the pole is ready.",
      "Bow and mast keep the kite clear of lifelines, pulpit, and jib while the halyard goes up.",
    ],
    "trim until full": [
      "Trimmer trims until the spinnaker is full and stable; helm drives a steady angle for pressure before going lower.",
      "Do not drop the jib yet. Keep it up until the spinnaker is made, drawing, and under control.",
    ],
    "jib down": [
      "Once the call is Made, drop or furl the jib cleanly while the trimmer keeps the kite loaded.",
      "Keep weight movement quiet so the boat does not roll during the transition.",
    ],
    "settle into downwind mode": [
      "Mast moves back toward the middle of the boat unless still needed forward to fix gear.",
      "Trim and helm settle into the target mode: light air flow, medium air pressure, or heavy air control.",
    ],
  };

  return {
    phase,
    steps: detailByPhase[phase].map((detail, index) => ({
      phase,
      label: `${index + 1}`,
      detail,
    })),
  };
});

const weightDistribution: WeightDistributionNote[] = [
  {
    condition: "Light air",
    guidance:
      "Keep bodies low and slightly forward to reduce stern drag, but treat forward weight as working weight during the set. Once the kite is full, slide back toward the widest, quietest part of the boat and keep the bow from sticking.",
  },
  {
    condition: "Medium air",
    guidance:
      "Center the crew around the middle of the boat with only the bow and mast forward long enough to make the set. After Made, bring mast back and keep fore/aft trim neutral so the boat can accelerate without hobby-horsing.",
  },
  {
    condition: "Heavy air",
    guidance:
      "Prioritize control: keep weight low, aft enough to keep the bow from burying, and outboard as needed for roll control. Forward movement should be brief and purposeful, then everyone returns to stable downwind positions.",
  },
];

const calls = [
  "Ready for the set",
  "Bear away",
  "Pole on",
  "Pole set",
  "Hoist",
  "Trim",
  "Made",
  "Jib down",
  "Settle",
];

const commonMistakes = [
  "Dropping the jib too early, before the spinnaker is full and stable.",
  "Hoisting before the boat bears away enough, which loads the kite and makes the set harder.",
  "Pole not ready or not confirmed before the hoist call.",
  "Too much weight forward after the kite is made, slowing the boat or burying the bow.",
  "Mast person staying forward too long after the set instead of moving back toward the middle of the boat.",
];

export const downwindChecklistConfigs: Record<CrewCount, DownwindChecklistConfig> = {
  3: {
    crewCount: 3,
    title: "3 Crew Symmetric Set",
    description:
      "Compressed weather-mark set with combined roles. Keep the sequence simple, preserve boat speed, and avoid sending extra weight forward.",
    sequence: masterSequence,
    roles: [
      {
        role: "Helm / Main / Tactician",
        jobs: [
          "Call the set timing and traffic plan.",
          "Bear away smoothly around the weather mark.",
          "Ease main through the turn and stabilize the boat for the hoist.",
        ],
        duringSetPosition: "Aft at the helm with main controls within reach.",
        afterSetPosition: "Aft and low, driving to pressure and keeping the boat under the rig.",
      },
      {
        role: "Trim / Pit",
        jobs: [
          "Run the halyard hoist cleanly.",
          "Take over spinnaker trim as soon as the kite breaks open.",
          "Call Made when the spinnaker is full and stable.",
        ],
        duringSetPosition: "Companionway or cockpit edge where halyard and sheet are both reachable.",
        afterSetPosition: "Middle-to-aft trim position with a clear view of the luff.",
      },
      {
        role: "Mast / Bow",
        jobs: [
          "Attach and set the pole.",
          "Clear the spinnaker during the hoist.",
          "Control the jib drop only after the kite is made.",
        ],
        duringSetPosition: "Forward working zone between the bulkhead and mast, stepping forward only when needed.",
        afterSetPosition: "Back toward the middle of the boat once the pole, kite, and jib are under control.",
      },
    ],
    weightDistribution,
    calls,
    commonMistakes,
  },
  4: {
    crewCount: 4,
    title: "4 Crew Symmetric Set",
    description:
      "Standard short-handed layout: helm/main, pit, mast, and bow. The big win is clean handoffs and getting mast weight back after the set.",
    sequence: masterSequence,
    roles: [
      {
        role: "Helm / Main",
        jobs: [
          "Call the bear away and keep the boat stable.",
          "Ease main with the turn and protect speed through the rounding.",
          "Confirm when the boat is low enough for the hoist.",
        ],
        duringSetPosition: "Aft at helm and main controls.",
        afterSetPosition: "Aft, steering a steady downwind angle.",
      },
      {
        role: "Pit",
        jobs: [
          "Prepare halyard and controls before the mark.",
          "Hoist on command without pauses.",
          "Manage jib down after Made.",
        ],
        duringSetPosition: "Companionway or cockpit pit position.",
        afterSetPosition: "Middle of the boat, ready for vang, pole height, and cleanup.",
      },
      {
        role: "Mast",
        jobs: [
          "Guide the pole onto the mast ring.",
          "Jump or assist the halyard if the setup requires it.",
          "Keep the kite clear between the bulkhead and mast.",
        ],
        duringSetPosition: "Between the bulkhead and mast during the set.",
        afterSetPosition: "Back near the middle of the boat unless still fixing forward gear.",
      },
      {
        role: "Bow",
        jobs: [
          "Set the outboard pole end and verify the guy is clear.",
          "Help the kite clear the hatch, bag, or pulpit.",
          "Lead the jib drop after the spinnaker is stable.",
        ],
        duringSetPosition: "Forward only as far as needed to control pole and sail.",
        afterSetPosition: "Return from the bow as soon as the foredeck is clean.",
      },
    ],
    weightDistribution,
    calls,
    commonMistakes,
  },
  5: {
    crewCount: 5,
    title: "5 Crew Symmetric Set",
    description:
      "Dedicated trimmer lets pit focus on the hoist while mast and bow make the pole. Keep the jib until the trimmer calls the kite made.",
    sequence: masterSequence,
    roles: [
      {
        role: "Helm / Main",
        jobs: [
          "Drive the rounding and bear away.",
          "Ease main in sequence with the turn.",
          "Hold the boat steady for pole set and hoist.",
        ],
        duringSetPosition: "Aft at helm and mainsheet.",
        afterSetPosition: "Aft, balancing pressure and roll.",
      },
      {
        role: "Trimmer",
        jobs: [
          "Pre-load the active sheet lightly without choking the kite.",
          "Trim until the spinnaker fills and stabilizes.",
          "Call Made before the jib comes down.",
        ],
        duringSetPosition: "Cockpit trim position with clear sheet run and luff view.",
        afterSetPosition: "Primary downwind trim position, low and settled.",
      },
      {
        role: "Pit",
        jobs: [
          "Run halyard and pole controls.",
          "Hoist cleanly on command.",
          "Coordinate jib down after the trimmer calls Made.",
        ],
        duringSetPosition: "Companionway or pit station.",
        afterSetPosition: "Middle of the boat, cleaning lines and watching controls.",
      },
      {
        role: "Mast",
        jobs: [
          "Put the pole on the mast ring.",
          "Help the halyard move fast if needed.",
          "Keep the kite clear from the mast working zone.",
        ],
        duringSetPosition: "Between the bulkhead and mast until the kite is made.",
        afterSetPosition: "Move back toward mid-boat when the set is complete.",
      },
      {
        role: "Bow",
        jobs: [
          "Make the outboard pole end.",
          "Clear the tack, guy, and spinnaker bag.",
          "Handle the forward part of the jib down.",
        ],
        duringSetPosition: "Foredeck only as long as the pole and sail need hands.",
        afterSetPosition: "Back from the bow once the jib and gear are clear.",
      },
    ],
    weightDistribution,
    calls,
    commonMistakes,
  },
  6: {
    crewCount: 6,
    title: "6 Crew Symmetric Set",
    description:
      "Expanded race layout with dedicated helm, main/tactician, trimmer, pit, mast, and bow. Each person owns one job and confirms it clearly.",
    sequence: masterSequence,
    roles: [
      {
        role: "Helm",
        jobs: [
          "Steer the rounding and bear away.",
          "Hold a stable angle for the hoist.",
          "Drive to pressure once the spinnaker is made.",
        ],
        duringSetPosition: "Aft at the wheel or tiller.",
        afterSetPosition: "Aft, steering the downwind mode.",
      },
      {
        role: "Main / Tactician",
        jobs: [
          "Call traffic, layline, and timing.",
          "Ease main through the bear away.",
          "Confirm the next tactical mode after Made.",
        ],
        duringSetPosition: "Aft or cockpit-side with main controls and course view.",
        afterSetPosition: "Aft-to-middle, managing mode and communication.",
      },
      {
        role: "Trimmer",
        jobs: [
          "Own spinnaker sheet from hoist to full.",
          "Call Trim, Made, and pressure changes.",
          "Keep the kite breathing without overtrimming.",
        ],
        duringSetPosition: "Cockpit trim station with clean sheet lead.",
        afterSetPosition: "Primary trim station, low and braced.",
      },
      {
        role: "Pit",
        jobs: [
          "Manage halyard, topping lift, foreguy, and jib controls.",
          "Hoist fast on command.",
          "Execute jib down after Made.",
        ],
        duringSetPosition: "Pit or companionway station.",
        afterSetPosition: "Middle of the boat, cleaning lines and monitoring controls.",
      },
      {
        role: "Mast",
        jobs: [
          "Make the pole at the mast.",
          "Jump the halyard or clear hoist friction.",
          "Confirm the mast area is clear before moving aft.",
        ],
        duringSetPosition: "Working zone between the bulkhead and mast.",
        afterSetPosition: "Back toward mid-boat after the set unless still needed forward.",
      },
      {
        role: "Bow",
        jobs: [
          "Make the pole outboard end.",
          "Keep the kite, guy, and jib clear.",
          "Finish forward cleanup after jib down.",
        ],
        duringSetPosition: "Foredeck only for pole, kite, and jib tasks.",
        afterSetPosition: "Return from the foredeck once the bow is clear and stable.",
      },
    ],
    weightDistribution,
    calls,
    commonMistakes,
  },
};

export function getDownwindChecklistConfig(crewCount: CrewCount) {
  return downwindChecklistConfigs[crewCount];
}
