"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { CourseWaypoint } from "@/types/courseLibrary";

type Props = {
  waypoints: CourseWaypoint[];
  height?: string;
};

const WAYPOINT_COLORS: Record<string, string> = {
  start: "#65c4b8",
  finish: "#65c4b8",
  government_mark: "#78b8c9",
  mark: "#d9b26b",
  turn: "#d9b26b",
};

export default function CourseWaypointMap({ waypoints, height = "360px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const valid = waypoints.filter((w) => w.lat != null && w.lon != null);
    if (valid.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    const center: [number, number] =
      valid.length === 1
        ? [valid[0]!.lat!, valid[0]!.lon!]
        : [
            valid.reduce((s, w) => s + w.lat!, 0) / valid.length,
            valid.reduce((s, w) => s + w.lon!, 0) / valid.length,
          ];

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, 9);

    mapRef.current = map;

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri Ocean Basemap",
        maxZoom: 17,
      },
    ).addTo(map);

    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
      attribution: "OpenSeaMap",
      maxZoom: 17,
      opacity: 0.8,
    }).addTo(map);

    // Draw route line
    if (valid.length > 1) {
      const latlngs = valid.map((w) => [w.lat!, w.lon!] as [number, number]);
      L.polyline(latlngs, {
        color: "#65c4b8",
        weight: 2,
        opacity: 0.7,
        dashArray: "6 4",
      }).addTo(map);
    }

    // Draw waypoint markers
    valid.forEach((wp, idx) => {
      const color = WAYPOINT_COLORS[wp.type] ?? "#7a9ea8";
      const isStartFinish = wp.type === "start" || wp.type === "finish";

      const icon = L.divIcon({
        html: `<div style="
          width: ${isStartFinish ? 22 : 18}px;
          height: ${isStartFinish ? 22 : 18}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #081520;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
          color: #081520;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        ">${idx + 1}</div>`,
        className: "",
        iconSize: [isStartFinish ? 22 : 18, isStartFinish ? 22 : 18],
        iconAnchor: [isStartFinish ? 11 : 9, isStartFinish ? 11 : 9],
      });

      const marker = L.marker([wp.lat!, wp.lon!], { icon }).addTo(map);

      const popup = `
        <div style="font-family:system-ui;min-width:140px;">
          <div style="font-size:11px;font-weight:900;color:#f0f4f4;margin-bottom:2px;">${wp.name || `Waypoint ${idx + 1}`}</div>
          <div style="font-size:10px;color:#7a9ea8;text-transform:uppercase;letter-spacing:0.1em;">${wp.type.replace(/_/g, " ")} · ${wp.rounding === "none" ? "no rounding" : wp.rounding}</div>
          ${wp.notes ? `<div style="font-size:10px;color:#cddde0;margin-top:4px;">${wp.notes}</div>` : ""}
          <div style="font-size:10px;color:#4a7a88;margin-top:2px;">${wp.lat?.toFixed(4)}, ${wp.lon?.toFixed(4)}</div>
        </div>
      `;
      marker.bindPopup(popup, {
        className: "layline-map-popup",
      });
    });

    // Fit bounds
    if (valid.length > 1) {
      const bounds = L.latLngBounds(valid.map((w) => [w.lat!, w.lon!] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasCoords = waypoints.some((w) => w.lat != null && w.lon != null);

  if (!hasCoords) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-dashed border-[color:var(--divider)] text-sm text-[color:var(--muted)]"
      >
        No coordinates — add lat/lon to waypoints to see the map
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, borderRadius: "var(--radius-card)", overflow: "hidden" }}
    />
  );
}
