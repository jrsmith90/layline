export type CourseManualStatus = "active" | "archived" | null;

export type CourseStatus = "upcoming" | "active" | "completed" | "archived";

export type WaypointType = "start" | "mark" | "government_mark" | "turn" | "finish";

export type RoundingDirection = "port" | "starboard" | "none";

export type CourseWaypoint = {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  type: WaypointType;
  rounding: RoundingDirection;
  notes: string;
};

export type RaceResult = {
  id: string;
  finishPosition: number | null;
  fleetSize: number | null;
  elapsedTime: string;
  correctedTime: string;
  skipper: string;
  crewList: string;
  raceNotes: string;
  weatherNotes: string;
  windDirection: string;
  windSpeedKt: number | null;
  tideCurrentNotes: string;
  recordedAt: string;
};

export type RaceDebrief = {
  whatWentWell: string;
  whatWentWrong: string;
  tacticalLessons: string;
  sailTrimLessons: string;
  startingLessons: string;
  crewNotes: string;
  equipmentIssues: string;
  futureImprovements: string;
  updatedAt: string;
};

export type CourseLibraryEntry = {
  id: string;
  courseName: string;
  eventName: string;
  hostClub: string;
  raceDate: string; // YYYY-MM-DD
  description: string;
  startLocation: string;
  finishLocation: string;
  distanceNm: number | null;
  raceType: string;
  notes: string;
  waypoints: CourseWaypoint[];
  results: RaceResult[];
  debrief: RaceDebrief | null;
  manualStatus: CourseManualStatus;
  createdAt: string;
  updatedAt: string;
  duplicatedFromId?: string;
};

export type CourseLibraryStats = {
  totalRaces: number;
  wins: number;
  topThree: number;
  avgFinish: number | null;
  bestFinish: number | null;
  totalMilesRaced: number;
  longestRace: number | null;
  avgRaceDistance: number | null;
  governorsCupStarts: number;
  nationalsStarts: number;
  beerCanStarts: number;
  distanceRaces: number;
  buoyRaces: number;
};

export function deriveCourseStatus(
  entry: Pick<CourseLibraryEntry, "raceDate" | "manualStatus">,
  today: string,
): CourseStatus {
  if (entry.manualStatus === "archived") return "archived";
  if (entry.manualStatus === "active") return "active";
  return entry.raceDate > today ? "upcoming" : "completed";
}

export function computeStats(
  entries: CourseLibraryEntry[],
  today: string,
): CourseLibraryStats {
  const raced = entries.filter((e) => {
    const s = deriveCourseStatus(e, today);
    return s === "completed" || s === "active";
  });

  const finishes = raced
    .flatMap((e) => e.results.map((r) => r.finishPosition))
    .filter((p): p is number => p != null);

  const distances = raced
    .map((e) => e.distanceNm)
    .filter((d): d is number => d != null);

  const totalMilesRaced = distances.reduce((s, d) => s + d, 0);

  return {
    totalRaces: raced.length,
    wins: finishes.filter((p) => p === 1).length,
    topThree: finishes.filter((p) => p <= 3).length,
    avgFinish:
      finishes.length > 0
        ? Math.round((finishes.reduce((a, b) => a + b, 0) / finishes.length) * 10) / 10
        : null,
    bestFinish: finishes.length > 0 ? Math.min(...finishes) : null,
    totalMilesRaced: Math.round(totalMilesRaced * 10) / 10,
    longestRace: distances.length > 0 ? Math.max(...distances) : null,
    avgRaceDistance:
      distances.length > 0
        ? Math.round((distances.reduce((a, b) => a + b, 0) / distances.length) * 10) / 10
        : null,
    governorsCupStarts: raced.filter((e) =>
      e.eventName.toLowerCase().includes("governor"),
    ).length,
    nationalsStarts: raced.filter((e) =>
      e.eventName.toLowerCase().includes("national"),
    ).length,
    beerCanStarts: raced.filter((e) =>
      e.eventName.toLowerCase().includes("beer can") ||
      e.eventName.toLowerCase().includes("wednesday"),
    ).length,
    distanceRaces: raced.filter((e) =>
      e.raceType.toLowerCase().includes("distance") ||
      e.raceType.toLowerCase().includes("point-to-point"),
    ).length,
    buoyRaces: raced.filter((e) => e.raceType.toLowerCase().includes("buoy")).length,
  };
}
