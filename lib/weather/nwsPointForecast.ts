export type NwsPointForecast = {
  lat: number;
  lon: number;
  source: "nws";
  fetchedAt: string;
  pointUrl: string;
  forecastHourlyUrl: string;
  current?: {
    windAvgKts?: number;
    windGustKts?: number;
    windDirectionDeg?: number;
  };
  hourly?: Array<{
    timeISO: string;
    windAvgKts?: number;
    windGustKts?: number;
    windDirectionDeg?: number;
    precipProbability?: number;
    airTempF?: number;
  }>;
  raw?: unknown;
};

type NwsPointLookupResponse = {
  properties?: {
    forecastHourly?: string;
  };
};

type NwsHourlyForecastResponse = {
  properties?: {
    generatedAt?: string;
    periods?: Array<{
      startTime?: string;
      temperature?: number;
      temperatureUnit?: string;
      probabilityOfPrecipitation?: {
        value?: number | null;
      };
      windSpeed?: string;
      windDirection?: string;
    }>;
  };
};

const CARDINAL_DIRECTION_TO_DEG: Record<string, number> = {
  N: 0,
  NNE: 23,
  NE: 45,
  ENE: 68,
  E: 90,
  ESE: 113,
  SE: 135,
  SSE: 158,
  S: 180,
  SSW: 203,
  SW: 225,
  WSW: 248,
  W: 270,
  WNW: 293,
  NW: 315,
  NNW: 338,
};

function mphToKts(value?: number): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return Number((value * 0.868976).toFixed(2));
}

function parseNwsWindDirection(direction?: string) {
  if (!direction) return undefined;
  return CARDINAL_DIRECTION_TO_DEG[direction.trim().toUpperCase()];
}

function parseNwsWindSpeedRange(windSpeed?: string) {
  if (!windSpeed) {
    return {
      windAvgKts: undefined,
      windGustKts: undefined,
    };
  }

  const raw = windSpeed.trim().toLowerCase();
  if (!raw || raw === "calm") {
    return {
      windAvgKts: 0,
      windGustKts: 0,
    };
  }

  const matches = raw.match(/\d+(?:\.\d+)?/g) ?? [];
  const values = matches
    .map((match) => Number(match))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return {
      windAvgKts: undefined,
      windGustKts: undefined,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.length >= 2 ? (min + max) / 2 : min;

  return {
    windAvgKts: mphToKts(avg),
    windGustKts: values.length >= 2 ? mphToKts(max) : undefined,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "Layline sailing tactics app (local development)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`NOAA/NWS API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function getNwsForecastByLatLon(params: {
  lat: number;
  lon: number;
}): Promise<NwsPointForecast> {
  const pointUrl = `https://api.weather.gov/points/${params.lat},${params.lon}`;
  const point = await fetchJson<NwsPointLookupResponse>(pointUrl);
  const forecastHourlyUrl = point.properties?.forecastHourly;

  if (!forecastHourlyUrl) {
    throw new Error("NOAA/NWS did not return an hourly forecast URL for this location.");
  }

  const hourlyForecast = await fetchJson<NwsHourlyForecastResponse>(forecastHourlyUrl);
  const periods = hourlyForecast.properties?.periods ?? [];

  const hourly = periods
    .map((period) => {
      if (!period.startTime) return null;

      const wind = parseNwsWindSpeedRange(period.windSpeed);

      return {
        timeISO: period.startTime,
        windAvgKts: wind.windAvgKts,
        windGustKts: wind.windGustKts,
        windDirectionDeg: parseNwsWindDirection(period.windDirection),
        precipProbability:
          typeof period.probabilityOfPrecipitation?.value === "number"
            ? period.probabilityOfPrecipitation.value
            : undefined,
        airTempF:
          typeof period.temperature === "number" && period.temperatureUnit === "F"
            ? period.temperature
            : undefined,
      };
    })
    .filter(
      (
        period,
      ): period is NonNullable<typeof period> => period != null,
    );

  const firstPeriod = hourly[0];

  return {
    lat: params.lat,
    lon: params.lon,
    source: "nws",
    fetchedAt: hourlyForecast.properties?.generatedAt ?? new Date().toISOString(),
    pointUrl,
    forecastHourlyUrl,
    current: firstPeriod
      ? {
          windAvgKts: firstPeriod.windAvgKts,
          windGustKts: firstPeriod.windGustKts,
          windDirectionDeg: firstPeriod.windDirectionDeg,
        }
      : undefined,
    hourly,
    raw: hourlyForecast,
  };
}
