import { NextRequest, NextResponse } from "next/server";
import { getTempestForecastByLatLon } from "@/lib/weather/tempestClient";

function parseCoordinate(value: string | null) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const lat = parseCoordinate(request.nextUrl.searchParams.get("lat"));
  const lon = parseCoordinate(request.nextUrl.searchParams.get("lon"));

  if (lat == null || lon == null) {
    return NextResponse.json(
      { available: false, error: "Use lat and lon query params for point forecast sampling." },
      { status: 400 },
    );
  }

  try {
    const forecast = await getTempestForecastByLatLon({ lat, lon });

    return NextResponse.json({
      available: true,
      lat,
      lon,
      fetchedAt: forecast.fetchedAt,
      current: forecast.current ?? null,
      hourly: forecast.hourly?.slice(0, 6) ?? [],
    });
  } catch (error) {
    return NextResponse.json({
      available: false,
      lat,
      lon,
      error: error instanceof Error ? error.message : "Forecast assist unavailable.",
    });
  }
}
