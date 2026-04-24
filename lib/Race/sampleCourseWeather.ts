import courseGeometry from "@/race/course-geometry-2026-hhsw-distance.json";
import { getTempestForecastByLatLon, type TempestPointForecast } from "@/lib/weather/tempestClient";

type MarkId = keyof typeof courseGeometry.marks;
type CourseId = keyof typeof courseGeometry.courses;

export type SampledPoint = {
  id: string;
  kind: "mark" | "midpoint";
  lat: number;
  lon: number;
  forecast: TempestPointForecast;
};

export type SampledLeg = {
  legNumber: number;
  fromMark: MarkId;
  toMark: MarkId;
  bearingDeg: number;
  distanceNmCalculated: number;
  samples: SampledPoint[];
};

export type SampledCourseWeather = {
  courseId: CourseId;
  sampledAt: string;
  startFinishMark: MarkId;
  courseSequence: MarkId[] | null;
  marks: Record<string, SampledPoint>;
  legs: SampledLeg[];
};

function midpoint(lat1: number, lon1: number, lat2: number, lon2: number) {
  return {
    lat: Number(((lat1 + lat2) / 2).toFixed(6)),
    lon: Number(((lon1 + lon2) / 2).toFixed(6))
  };
}

function assertCourseExists(courseId: string): asserts courseId is CourseId {
  if (!(courseId in courseGeometry.courses)) {
    throw new Error(`Unknown course ID: ${courseId}`);
  }
}

export async function sampleCourseWeather(courseId: string): Promise<SampledCourseWeather> {
  assertCourseExists(courseId);

  const course = courseGeometry.courses[courseId];
  const sequence = course.sequence ?? [];
  const uniqueMarkIds = [...new Set(sequence)] as MarkId[];

  const sampledMarksEntries = await Promise.all(
    uniqueMarkIds.map(async (markId) => {
      const mark = courseGeometry.marks[markId];
      const forecast = await getTempestForecastByLatLon({
        lat: mark.lat,
        lon: mark.lon
      });

      return [
        markId,
        {
          id: markId,
          kind: "mark" as const,
          lat: mark.lat,
          lon: mark.lon,
          forecast
        }
      ] as const;
    })
  );

  const sampledMarks = Object.fromEntries(sampledMarksEntries);

  const sampledLegs = await Promise.all(
    course.legs.map(async (leg) => {
      const from = courseGeometry.marks[leg.fromMark];
      const to = courseGeometry.marks[leg.toMark];
      const mid = midpoint(from.lat, from.lon, to.lat, to.lon);

      const midpointForecast = await getTempestForecastByLatLon({
        lat: mid.lat,
        lon: mid.lon
      });

      return {
        legNumber: leg.legNumber,
        fromMark: leg.fromMark,
        toMark: leg.toMark,
        bearingDeg: leg.bearingDeg,
        distanceNmCalculated: leg.distanceNmCalculated,
        samples: [
          sampledMarks[leg.fromMark],
          {
            id: `${leg.fromMark}_${leg.toMark}_mid`,
            kind: "midpoint" as const,
            lat: mid.lat,
            lon: mid.lon,
            forecast: midpointForecast
          },
          sampledMarks[leg.toMark]
        ]
      };
    })
  );

  return {
    courseId,
    sampledAt: new Date().toISOString(),
    startFinishMark: courseGeometry.startFinishMark as MarkId,
    courseSequence: course.sequence,
    marks: sampledMarks,
    legs: sampledLegs
  };
}