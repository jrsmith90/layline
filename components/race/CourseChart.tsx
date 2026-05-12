import type { GpsTrackPoint } from "@/lib/useGpsCourse";
import type { CourseSummary } from "@/data/race/getCourseData";

type ChartPoint = {
  id?: string;
  label?: string;
  name?: string;
  lat: number;
  lon: number;
};

type CourseChartProps = {
  courseData: CourseSummary;
  track?: GpsTrackPoint[];
  title?: string;
  subtitle?: string;
};

const WIDTH = 720;
const HEIGHT = 460;
const PADDING = 46;

function formatNumber(value: number | null | undefined, decimals = 1) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(decimals)
    : "--";
}

function boundsFor(points: ChartPoint[]) {
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latPad = Math.max((maxLat - minLat) * 0.14, 0.006);
  const lonPad = Math.max((maxLon - minLon) * 0.14, 0.006);

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  };
}

function project(point: ChartPoint, bounds: ReturnType<typeof boundsFor>) {
  const lonSpan = bounds.maxLon - bounds.minLon || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;

  return {
    x: PADDING + ((point.lon - bounds.minLon) / lonSpan) * (WIDTH - PADDING * 2),
    y: PADDING + ((bounds.maxLat - point.lat) / latSpan) * (HEIGHT - PADDING * 2),
  };
}

function linePath(points: ChartPoint[], bounds: ReturnType<typeof boundsFor>) {
  return points
    .map((point, index) => {
      const plotted = project(point, bounds);
      return `${index === 0 ? "M" : "L"} ${plotted.x.toFixed(1)} ${plotted.y.toFixed(1)}`;
    })
    .join(" ");
}

export default function CourseChart({
  courseData,
  track = [],
  title = "Course chart",
  subtitle,
}: CourseChartProps) {
  const coursePoints =
    courseData.course.sequence
      ?.map<ChartPoint | null>((markId) => {
        const mark = courseData.marks[markId];
        return mark
          ? {
              id: String(markId),
              label: String(markId),
              name: mark.name,
              lat: mark.lat,
              lon: mark.lon,
            }
          : null;
      })
      .filter((point): point is ChartPoint => point != null) ?? [];
  const trackPoints = track
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
    .map((point) => ({ lat: point.lat, lon: point.lon }));
  const allPoints = [...coursePoints, ...trackPoints];

  if (coursePoints.length < 2 || allPoints.length < 2) {
    return (
      <section className="layline-panel p-4">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Select a course with mark geometry to draw the chart.
        </p>
      </section>
    );
  }

  const bounds = boundsFor(allPoints);
  const coursePath = linePath(coursePoints, bounds);
  const trackPath = trackPoints.length >= 2 ? linePath(trackPoints, bounds) : "";
  const totalDistance =
    courseData.totalDistanceNmSI ?? courseData.totalDistanceNmCalculated;

  return (
    <section className="layline-panel overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="layline-kicker">Geo Chart</div>
          <h2 className="mt-1 text-xl font-black">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-[color:var(--muted)]">{subtitle}</p>
          )}
        </div>
        <div className="text-right text-xs text-[color:var(--muted)]">
          <div>Course {courseData.courseId}</div>
          <div>{formatNumber(totalDistance, 1)} nm</div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[color:var(--divider)] bg-[#08233a]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${title} for course ${courseData.courseId}`}
          className="aspect-[1.565] w-full"
        >
          <rect width={WIDTH} height={HEIGHT} fill="#08233a" />
          <path
            d="M 60 72 C 160 34 228 104 356 62 S 572 92 672 46"
            fill="none"
            stroke="rgba(127,183,255,0.13)"
            strokeWidth="26"
          />
          <path
            d="M 40 344 C 158 300 226 382 352 328 S 562 356 684 294"
            fill="none"
            stroke="rgba(0,168,168,0.10)"
            strokeWidth="34"
          />

          <g stroke="rgba(216,224,232,0.10)" strokeWidth="1">
            {[0, 1, 2, 3].map((line) => (
              <line
                key={`v-${line}`}
                x1={PADDING + line * ((WIDTH - PADDING * 2) / 3)}
                x2={PADDING + line * ((WIDTH - PADDING * 2) / 3)}
                y1={PADDING}
                y2={HEIGHT - PADDING}
              />
            ))}
            {[0, 1, 2, 3].map((line) => (
              <line
                key={`h-${line}`}
                x1={PADDING}
                x2={WIDTH - PADDING}
                y1={PADDING + line * ((HEIGHT - PADDING * 2) / 3)}
                y2={PADDING + line * ((HEIGHT - PADDING * 2) / 3)}
              />
            ))}
          </g>

          {trackPath && (
            <path
              d={trackPath}
              fill="none"
              stroke="#ec4899"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              opacity="0.9"
            />
          )}

          <path
            d={coursePath}
            fill="none"
            stroke="#f59e0b"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />

          {courseData.course.legs.map((leg) => {
            const from = courseData.marks[leg.fromMark];
            const to = courseData.marks[leg.toMark];
            if (!from || !to) return null;
            const fromPoint = project(from, bounds);
            const toPoint = project(to, bounds);
            const midX = (fromPoint.x + toPoint.x) / 2;
            const midY = (fromPoint.y + toPoint.y) / 2;

            return (
              <g key={leg.legNumber}>
                <circle cx={midX} cy={midY} r="13" fill="#071625" stroke="#f59e0b" />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="#f4f6f8"
                >
                  {leg.legNumber}
                </text>
              </g>
            );
          })}

          {coursePoints.map((point) => {
            const plotted = project(point, bounds);
            return (
              <g key={`${point.label}-${plotted.x}-${plotted.y}`}>
                <circle
                  cx={plotted.x}
                  cy={plotted.y}
                  r="10"
                  fill="#12283f"
                  stroke="#d8e0e8"
                  strokeWidth="2"
                />
                <text
                  x={plotted.x}
                  y={plotted.y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="900"
                  fill="#f4f6f8"
                >
                  {point.label}
                </text>
                <text
                  x={Math.min(WIDTH - 70, plotted.x + 15)}
                  y={plotted.y - 12}
                  fontSize="11"
                  fontWeight="700"
                  fill="#d8e0e8"
                >
                  {point.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-5 rounded-full bg-[#f59e0b]" />
          Planned course
        </span>
        {trackPath && (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-5 rounded-full bg-[#ec4899]" />
            GPS track
          </span>
        )}
      </div>
    </section>
  );
}
