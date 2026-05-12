

import { formatCourseLabel, getAllCourseIds, getCourseCode, getCourseData } from "./getCourseData";

export type RouteBiasCourseType =
  | "local_short"
  | "channel_mid"
  | "channel_long"
  | "multi_zone"
  | "custom";

export type OpeningLegType =
  | "mostly_upwind"
  | "close_reach"
  | "beam_reach"
  | "broad_reach"
  | "unknown";

export type PressureSide = "shore" | "bay" | "even" | "unclear";

export type CurrentSide =
  | "shore_less_adverse"
  | "bay_less_adverse"
  | "shore_more_favorable"
  | "bay_more_favorable"
  | "even"
  | "unclear";

export type WindTrend =
  | "building"
  | "fading"
  | "steady"
  | "oscillating"
  | "unstable"
  | "unknown";

export type EdgeStrength = "strong" | "moderate" | "weak" | "unclear";

export type RouteBiasPromptOption<T extends string> = {
  value: T;
  label: string;
};

export type RouteBiasPrompt<T extends string = string> = {
  id: string;
  label: string;
  type: "select" | "number";
  required: boolean;
  options?: RouteBiasPromptOption<T>[];
  placeholder?: string;
  unit?: string;
};

export type RouteBiasInputModel = {
  courseId: string;
  courseType: RouteBiasCourseType;
  firstMark: string | null;
  firstLegBearingDeg: number | null;
  totalDistanceNm: number | null;
  prompts: {
    announcedCourse: RouteBiasPrompt;
    openingLegType: RouteBiasPrompt<OpeningLegType>;
    windDirectionDeg: RouteBiasPrompt;
    windSpeedKt: RouteBiasPrompt;
    windTrend: RouteBiasPrompt<WindTrend>;
    pressureSide: RouteBiasPrompt<PressureSide>;
    currentSide: RouteBiasPrompt<CurrentSide>;
    edgeStrength: RouteBiasPrompt<EdgeStrength>;
  };
  notes: string[];
};

function getCourseType(courseId: string): RouteBiasCourseType {
  const courseCode = getCourseCode(courseId);

  if (courseCode === "99") return "custom";
  if (courseCode === "short" || courseCode === "shortR") return "local_short";
  if (courseCode === "medium" || courseCode === "mediumR") return "channel_mid";
  if (courseCode === "1" || courseCode === "1R") return "local_short";
  if (courseCode === "2" || courseCode === "2R") return "channel_mid";
  if (courseCode === "3" || courseCode === "3R") return "channel_long";
  if (courseCode === "4" || courseCode === "4R") return "multi_zone";
  return "custom";
}

function getCourseNotes(courseId: string): string[] {
  switch (getCourseCode(courseId)) {
    case "short":
    case "shortR":
      return [
        "Treat this as the EWE Spirit short pursuit course.",
        "Expect the Severn River mouth and WR87 leg to make pressure and traffic management matter.",
        "Confirm final course direction and pursuit start time before leaving the dock."
      ];
    case "medium":
    case "mediumR":
      return [
        "Treat this as the EWE Spirit medium pursuit course.",
        "The Hackett Point and WR87 triangle makes open-bay pressure and current more important.",
        "Confirm final course direction and pursuit start time before leaving the dock."
      ];
    case "1":
    case "1R":
      return [
        "Treat this as a local tactical race.",
        "Pressure and local shoreline effects matter most.",
        "Do not overcommit early unless the edge is obvious."
      ];
    case "2":
    case "2R":
      return [
        "Treat this as a mid-channel race.",
        "Balance current relief against open-bay pressure.",
        "In lighter air, current may matter more than pressure."
      ];
    case "3":
    case "3R":
      return [
        "Treat this as a longer channel race.",
        "Look harder at trend persistence and sustained current exposure.",
        "Avoid making a low-confidence early side bet."
      ];
    case "4":
    case "4R":
      return [
        "Treat this as a multi-zone race.",
        "Do not optimize only the first leg.",
        "A small gain early can create a worse setup later."
      ];
    case "99":
      return [
        "Custom course announced by RC.",
        "Confirm sequence, first mark, and first-leg angle before scoring route bias."
      ];
    default:
      return [];
  }
}

export function getRouteBiasInputs(courseId: string): RouteBiasInputModel {
  const course = getCourseData(courseId);
  const courseType = getCourseType(courseId);

  return {
    courseId,
    courseType,
    firstMark: course.firstMark,
    firstLegBearingDeg: course.firstLeg?.bearingDeg ?? null,
    totalDistanceNm: course.totalDistanceNmSI ?? course.totalDistanceNmCalculated,
    prompts: {
      announcedCourse: {
        id: "announcedCourse",
        label: "Which course was announced?",
        type: "select",
        required: true,
        options: getAllCourseIds().map((id) => ({
          value: id,
          label: formatCourseLabel(id)
        }))
      },
      openingLegType: {
        id: "openingLegType",
        label: "How would you describe the opening leg?",
        type: "select",
        required: true,
        options: [
          { value: "mostly_upwind", label: "Mostly upwind" },
          { value: "close_reach", label: "Close reach" },
          { value: "beam_reach", label: "Beam reach" },
          { value: "broad_reach", label: "Broad reach" },
          { value: "unknown", label: "Unsure" }
        ]
      },
      windDirectionDeg: {
        id: "windDirectionDeg",
        label: "Expected wind direction",
        type: "number",
        required: true,
        placeholder: "Enter direction",
        unit: "°"
      },
      windSpeedKt: {
        id: "windSpeedKt",
        label: "Expected wind speed",
        type: "number",
        required: true,
        placeholder: "Enter speed",
        unit: "kt"
      },
      windTrend: {
        id: "windTrend",
        label: "What is the wind trend?",
        type: "select",
        required: true,
        options: [
          { value: "building", label: "Building" },
          { value: "fading", label: "Fading" },
          { value: "steady", label: "Steady" },
          { value: "oscillating", label: "Oscillating" },
          { value: "unstable", label: "Unstable" },
          { value: "unknown", label: "Unclear" }
        ]
      },
      pressureSide: {
        id: "pressureSide",
        label: "Where does pressure look better for the first leg?",
        type: "select",
        required: true,
        options: [
          { value: "shore", label: "Closer to shore" },
          { value: "bay", label: "Out in the bay" },
          { value: "even", label: "Looks even" },
          { value: "unclear", label: "Unclear" }
        ]
      },
      currentSide: {
        id: "currentSide",
        label: "Where is the better current setup for the first leg?",
        type: "select",
        required: true,
        options: [
          { value: "shore_less_adverse", label: "Less adverse current near shore" },
          { value: "bay_less_adverse", label: "Less adverse current in the bay" },
          { value: "shore_more_favorable", label: "More favorable current near shore" },
          { value: "bay_more_favorable", label: "More favorable current in the bay" },
          { value: "even", label: "Looks even" },
          { value: "unclear", label: "Unclear" }
        ]
      },
      edgeStrength: {
        id: "edgeStrength",
        label: "How strong is the edge?",
        type: "select",
        required: true,
        options: [
          { value: "strong", label: "Strong" },
          { value: "moderate", label: "Moderate" },
          { value: "weak", label: "Weak" },
          { value: "unclear", label: "Unclear" }
        ]
      }
    },
    notes: getCourseNotes(courseId)
  };
}
