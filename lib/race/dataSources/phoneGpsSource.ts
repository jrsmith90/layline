"use client";

import { useEffect, useRef, useState } from "react";
import type {
  RaceInputSourceSnapshot,
  RaceInputSourceState,
  RaceInputTrackPoint,
  RaceSourceConfidenceHint,
  RaceSourceFreshness,
} from "./types";

type PhoneGpsSnapshotState = Omit<
  RaceInputSourceSnapshot,
  "enabled" | "supported" | "freshness" | "confidence"
>;

const TRACK_STORAGE_KEY = "layline-phone-gps-track-v1";
const MAX_TRACK_POINTS = 2000;
const MIN_TRACK_INTERVAL_MS = 5000;
const GPS_FRESH_MS = 5000;
const GPS_STALE_MS = 15000;
const LOW_CONFIDENCE_ACCURACY_M = 35;
const LOW_CONFIDENCE_SOG_KT = 1.2;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function wrap360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function speedKt(sogMps: number | null) {
  return sogMps == null ? null : sogMps * 1.943844;
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  return wrap360(toDeg(Math.atan2(y, x)));
}

function readStoredTrack(): RaceInputTrackPoint[] {
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

function writeStoredTrack(points: RaceInputTrackPoint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(points));
}

function getFreshness(observedAt: string | null, nowMs: number): RaceSourceFreshness {
  if (!observedAt) return "unknown";

  const observedAtMs = new Date(observedAt).getTime();
  if (Number.isNaN(observedAtMs)) return "unknown";

  const ageMs = Math.max(0, nowMs - observedAtMs);

  if (ageMs <= GPS_FRESH_MS) return "fresh";
  if (ageMs <= GPS_STALE_MS) return "aging";
  return "stale";
}

function getConfidenceHint(params: {
  snapshot: PhoneGpsSnapshotState;
  freshness: RaceSourceFreshness;
  supported: boolean;
  enabled: boolean;
}): RaceSourceConfidenceHint {
  const { snapshot, freshness, supported, enabled } = params;

  if (!supported || !enabled || snapshot.permission === "denied") {
    return "none";
  }

  if (!snapshot.position || snapshot.cogDeg == null) {
    return "none";
  }

  if (freshness === "stale") return "low";
  if (freshness === "aging") return "medium";
  if (snapshot.accuracyM != null && snapshot.accuracyM > LOW_CONFIDENCE_ACCURACY_M) {
    return "low";
  }

  const sogKt = speedKt(snapshot.sogMps);
  if (sogKt != null && sogKt < LOW_CONFIDENCE_SOG_KT) {
    return "low";
  }

  return "high";
}

export function usePhoneGpsSource(enabled: boolean): RaceInputSourceState {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [snapshot, setSnapshot] = useState<PhoneGpsSnapshotState>({
    permission: "unknown",
    position: null,
    cogDeg: null,
    sogMps: null,
    accuracyM: null,
    observedAt: null,
  });
  const [track, setTrack] = useState<RaceInputTrackPoint[]>(readStoredTrack);
  const [clockMs, setClockMs] = useState(() => Date.now());

  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const lastTrackAtRef = useRef(0);

  function clearTrack() {
    setTrack([]);
    writeStoredTrack([]);
    lastTrackAtRef.current = 0;
  }

  useEffect(() => {
    if (!enabled && snapshot.observedAt == null) return;

    const interval = window.setInterval(() => setClockMs(Date.now()), 5000);
    return () => window.clearInterval(interval);
  }, [enabled, snapshot.observedAt]);

  useEffect(() => {
    if (!enabled || !supported) return;

    const geo = navigator.geolocation;

    watchIdRef.current = geo.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        const observedAt = new Date(position.timestamp).toISOString();

        let cogDeg: number | null = null;

        if (typeof heading === "number" && !Number.isNaN(heading)) {
          cogDeg = wrap360(heading);
        } else {
          const last = lastPosRef.current;
          if (last) {
            cogDeg = bearingDeg(last.lat, last.lon, latitude, longitude);
          }
        }

        lastPosRef.current = { lat: latitude, lon: longitude };
        const nowMs = Date.now();
        setClockMs(nowMs);

        setSnapshot((current) => ({
          ...current,
          permission: "granted",
          position: {
            lat: latitude,
            lon: longitude,
          },
          cogDeg,
          sogMps: typeof speed === "number" ? speed : null,
          accuracyM: typeof accuracy === "number" ? accuracy : null,
          observedAt,
          error: undefined,
        }));

        if (nowMs - lastTrackAtRef.current >= MIN_TRACK_INTERVAL_MS) {
          lastTrackAtRef.current = nowMs;

          setTrack((currentTrack) => {
            const nextTrack = [
              ...currentTrack,
              {
                at: observedAt,
                lat: latitude,
                lon: longitude,
                cogDeg,
                sogMps: typeof speed === "number" ? speed : null,
                accuracyM: typeof accuracy === "number" ? accuracy : null,
              },
            ].slice(-MAX_TRACK_POINTS);

            writeStoredTrack(nextTrack);
            return nextTrack;
          });
        }
      },
      (error) => {
        setSnapshot((current) => ({
          ...current,
          permission: error.code === 1 ? "denied" : current.permission,
          error: error.message,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    );

    return () => {
      if (watchIdRef.current !== null) geo.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [enabled, supported]);

  const freshness = getFreshness(snapshot.observedAt, clockMs);
  const confidence = getConfidenceHint({ snapshot, freshness, supported, enabled });

  return {
    sourceId: "phone_gps",
    kind: "phone_gps",
    label: "Phone GPS",
    snapshot: {
      ...snapshot,
      enabled,
      supported,
      freshness,
      confidence,
      error: supported ? snapshot.error : "Geolocation is not available in this browser.",
    },
    track,
    clearTrack,
  };
}
