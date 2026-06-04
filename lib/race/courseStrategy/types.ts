export type CourseZone = {
  id: string;
  label: string;
  headingDeg: number | null;
  description: string;
  windShiftRisk: "high" | "moderate" | "low" | "unknown";
  windShiftLocation: string;
  currentEffect: "favorable" | "adverse" | "neutral" | "unknown";
  laylineHeadingDeg: number | null;
  notes: string;
};

export type CourseStrategyAnswers = {
  courseId: string;
  zones: CourseZone[];
  openingLegBearingDeg: number | null;
  firstMarkDistance: number | null;
  strategyNotes: string;
};

export type CourseStrategyResult = {
  zoneAnalysis: CourseZone[];
  keyRisks: string[];
  recommendations: string[];
  referenceBasis: string[];
};

export type CourseStrategyRecord = {
  savedAtISO: string;
  courseId: string;
  zones: CourseZone[];
  openingLegBearingDeg: number | null;
  firstMarkDistance: number | null;
  strategyNotes: string;
  keyRisks: string[];
  recommendations: string[];
  referenceBasis: string[];
};
