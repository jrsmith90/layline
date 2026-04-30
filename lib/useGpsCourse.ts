"use client";

import { useEffect, useRef, useState } from "react";

type CourseState = {
  supported: boolean;
  permission: "unknown" | "granted" | "denied";
  lat: number | null;
  lon: number | null;
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
  error?: string;
};

export type GpsTrackPoint = {
  at: string;
  lat: number;
  lon: number;
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
};

const TRACK_STORAGE_KEY = "layline-phone-gps-track-v1";
const MAX_TRACK_POINTS = 2000;
const MIN_TRACK_INTERVAL_MS = 5000;

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

function readStoredTrack(): GpsTrackPoint[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(TRACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredTrack(points: GpsTrackPoint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(points));
}

export function useGpsCourse(enabled: boolean) {
  const [state, setState] = useState<CourseState>({
    supported: false,
    permission: "unknown",
    lat: null,
    lon: null,
    cogDeg: null,
    sogMps: null,
    accuracyM: null,
  });
  const [track, setTrack] = useState<GpsTrackPoint[]>(readStoredTrack);

  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const lastTrackAtRef = useRef(0);

  function clearTrack() {
    setTrack([]);
    writeStoredTrack([]);
    lastTrackAtRef.current = 0;
  }

  useEffect(() => {
    const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

    window.setTimeout(() => {
      setState((s) => ({
        ...s,
        supported,
        error: supported ? s.error : "Geolocation is not available in this browser.",
      }));
    }, 0);

    if (!enabled || !supported) return;

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
        const now = Date.now();

        setState((s) => ({
          ...s,
          permission: "granted",
          lat: latitude,
          lon: longitude,
          cogDeg: cog,
          sogMps: typeof speed === "number" ? speed : null,
          accuracyM: typeof accuracy === "number" ? accuracy : null,
          error: undefined,
        }));

        if (now - lastTrackAtRef.current >= MIN_TRACK_INTERVAL_MS) {
          lastTrackAtRef.current = now;

          setTrack((currentTrack) => {
            const nextTrack = [
              ...currentTrack,
              {
                at: new Date(now).toISOString(),
                lat: latitude,
                lon: longitude,
                cogDeg: cog,
                sogMps: typeof speed === "number" ? speed : null,
                accuracyM: typeof accuracy === "number" ? accuracy : null,
              },
            ].slice(-MAX_TRACK_POINTS);

            writeStoredTrack(nextTrack);
            return nextTrack;
          });
        }
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
      watchIdRef.current = null;
    };
  }, [enabled]);

  return {
    ...state,
    track,
    clearTrack,
  };
}
