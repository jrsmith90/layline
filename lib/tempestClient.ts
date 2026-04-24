export type TempestPointForecast = {
  lat: number;
  lon: number;
  source: "tempest";
  fetchedAt: string;
  units: "imperial";
  current?: {
    windAvgKts?: number;
    windLullKts?: number;
    windGustKts?: number;
    windDirectionDeg?: number;
    airTempF?: number;
    pressureMb?: number;
  };
  hourly?: Array<{
    timeISO: string;
    windAvgKts?: number;
    windGustKts?: number;
    windDirectionDeg?: number;
    precipProbability?: number;
    airTempF?: number;
  }>;
  daily?: Array<{
    dateISO: string;
    windAvgKts?: number;
    windGustKts?: number;
    windDirectionDeg?: number;
    precipProbability?: number;
    airTempHighF?: number;
    airTempLowF?: number;
  }>;
  raw?: unknown;
};

type TempestForecastResponse = {
  current_conditions?: {
    wind_avg?: number;
    wind_gust?: number;
    wind_direction?: number;
    air_temperature?: number;
    sea_level_pressure?: number;
  };
  forecast?: {
    hourly?: Array<{
      time?: string;
      wind_avg?: number;
      wind_gust?: number;
      wind_direction?: number;
      precip_probability?: number;
      air_temperature?: number;
    }>;
    daily?: Array<{
      day_start_local?: string;
      wind_avg?: number;
      wind_gust?: number;
      wind_direction?: number;
      precip_probability?: number;
      air_temp_high?: number;
      air_temp_low?: number;
    }>;
  };
};

function mphToKts(value?: number): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return Number((value * 0.868976).toFixed(2));
}

export type GetForecastOptions = {
  lat: number;
  lon: number;
  apiKey?: string;
};

export async function getTempestForecastByLatLon(
  options: GetForecastOptions
): Promise<TempestPointForecast> {
  const apiKey = options.apiKey ?? process.env.TEMPEST_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TEMPEST_API_KEY");
  }

  const params = new URLSearchParams({
    latitude: String(options.lat),
    longitude: String(options.lon),
    units_temp: "f",
    units_wind: "mph",
    units_pressure: "mb",
    units_precip: "in",
    api_key: apiKey
  });

  const url = `https://swd.weatherflow.com/swd/rest/better_forecast?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Tempest API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as TempestForecastResponse;

  return {
    lat: options.lat,
    lon: options.lon,
    source: "tempest",
    fetchedAt: new Date().toISOString(),
    units: "imperial",
    current: data.current_conditions
      ? {
          windAvgKts: mphToKts(data.current_conditions.wind_avg),
          windLullKts: undefined,
          windGustKts: mphToKts(data.current_conditions.wind_gust),
          windDirectionDeg: data.current_conditions.wind_direction,
          airTempF: data.current_conditions.air_temperature,
          pressureMb: data.current_conditions.sea_level_pressure
        }
      : undefined,
    hourly:
      data.forecast?.hourly?.map((item) => ({
        timeISO: item.time ?? "",
        windAvgKts: mphToKts(item.wind_avg),
        windGustKts: mphToKts(item.wind_gust),
        windDirectionDeg: item.wind_direction,
        precipProbability: item.precip_probability,
        airTempF: item.air_temperature
      })) ?? [],
    daily:
      data.forecast?.daily?.map((item) => ({
        dateISO: item.day_start_local ?? "",
        windAvgKts: mphToKts(item.wind_avg),
        windGustKts: mphToKts(item.wind_gust),
        windDirectionDeg: item.wind_direction,
        precipProbability: item.precip_probability,
        airTempHighF: item.air_temp_high,
        airTempLowF: item.air_temp_low
      })) ?? [],
    raw: data
  };
}