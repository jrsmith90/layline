"use client";

import { useEffect, useRef, useState } from "react";

type CourseState = {
  supported: boolean;
  permission: "unknown" | "granted" | "denied";
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
  error?: string;
};

function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function toDeg(r: number) {
  return (r * 180) / Math.PI;
}
function wrap360(d: number) {
  return (d % 360 + 360) % 360;
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return wrap360(toDeg(Math.atan2(y, x)));
}

export function useGpsCourse(enabled: boolean) {
  const [state, setState] = useState<CourseState>({
    supported: typeof navigator !== "undefined" && "geolocation" in navigator,
    permission: "unknown",
    cogDeg: null,
    sogMps: null,
    accuracyM: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!state.supported) return;

    const geo = navigator.geolocation;

    watchIdRef.current = geo.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;

        let cog: number | null = null;

        if (typeof heading === "number" && !Number.isNaN(heading)) {
          cog = wrap360(heading);
        } else {
          const last = lastPosRef.current;
          if (last) {
            cog = bearingDeg(last.lat, last.lon, latitude, longitude);
          }
        }

        lastPosRef.current = { lat: latitude, lon: longitude };

        setState((s) => ({
          ...s,
          permission: "granted",
          cogDeg: cog,
          sogMps: typeof speed === "number" ? speed : null,
          accuracyM: typeof accuracy === "number" ? accuracy : null,
          error: undefined,
        }));
      },
      (err) => {
        setState((s) => ({
          ...s,
          permission: err.code === 1 ? "denied" : s.permission,
          error: err.message,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) geo.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return state;
}