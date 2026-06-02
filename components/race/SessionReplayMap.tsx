"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  WMSTileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GpsTrackPoint } from "@/lib/useGpsCourse";

const NOAA_REPLAY_WMS_URL =
  "https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer";
const NOAA_REPLAY_WMS_LAYERS = "1";

type SessionReplayMapProps = {
  track: GpsTrackPoint[];
  pastTrack: GpsTrackPoint[];
  selectionTrack: GpsTrackPoint[];
  currentPoint: GpsTrackPoint | null;
  selectionStartPoint: GpsTrackPoint | null;
  selectionEndPoint: GpsTrackPoint | null;
};

function ReplayFitBounds({
  bounds,
}: {
  bounds: [[number, number], [number, number]];
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize(false);
    map.fitBounds(bounds, {
      padding: [18, 18],
      animate: false,
    });
  }, [bounds, map]);

  return null;
}

function toLatLngs(points: GpsTrackPoint[]) {
  return points
    .filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lon),
    )
    .map((point) => [point.lat, point.lon] as [number, number]);
}

function computeBounds(points: GpsTrackPoint[]) {
  const latLngs = toLatLngs(points);
  if (latLngs.length === 0) {
    return {
      center: [38.95, -76.35] as [number, number],
      bounds: [
        [38.9, -76.45],
        [39.0, -76.25],
      ] as [[number, number], [number, number]],
    };
  }

  const lats = latLngs.map((point) => point[0]);
  const lons = latLngs.map((point) => point[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latPad = Math.max((maxLat - minLat) * 0.12, 0.0015);
  const lonPad = Math.max((maxLon - minLon) * 0.12, 0.0015);

  return {
    center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2] as [number, number],
    bounds: [
      [minLat - latPad, minLon - lonPad],
      [maxLat + latPad, maxLon + lonPad],
    ] as [[number, number], [number, number]],
  };
}

export default function SessionReplayMap(props: SessionReplayMapProps) {
  const fullTrack = useMemo(() => toLatLngs(props.track), [props.track]);
  const pastTrack = useMemo(() => toLatLngs(props.pastTrack), [props.pastTrack]);
  const selectionTrack = useMemo(
    () => toLatLngs(props.selectionTrack),
    [props.selectionTrack],
  );
  const directProgressTrack =
    fullTrack.length >= 2
      ? ([fullTrack[0], fullTrack[fullTrack.length - 1]] as [[number, number], [number, number]])
      : null;
  const currentPosition =
    props.currentPoint &&
    Number.isFinite(props.currentPoint.lat) &&
    Number.isFinite(props.currentPoint.lon)
      ? ([props.currentPoint.lat, props.currentPoint.lon] as [number, number])
      : null;
  const selectionStartPosition =
    props.selectionStartPoint &&
    Number.isFinite(props.selectionStartPoint.lat) &&
    Number.isFinite(props.selectionStartPoint.lon)
      ? ([props.selectionStartPoint.lat, props.selectionStartPoint.lon] as [number, number])
      : null;
  const selectionEndPosition =
    props.selectionEndPoint &&
    Number.isFinite(props.selectionEndPoint.lat) &&
    Number.isFinite(props.selectionEndPoint.lon)
      ? ([props.selectionEndPoint.lat, props.selectionEndPoint.lon] as [number, number])
      : null;
  const mapBounds = useMemo(() => computeBounds(props.track), [props.track]);

  return (
    <MapContainer
      center={mapBounds.center}
      zoom={13}
      minZoom={8}
      maxZoom={18}
      scrollWheelZoom
      style={{ height: "420px", backgroundColor: "#bfdfe9" }}
      attributionControl
      className="w-full"
    >
      <ReplayFitBounds bounds={mapBounds.bounds} />
      <WMSTileLayer
        url={NOAA_REPLAY_WMS_URL}
        layers={NOAA_REPLAY_WMS_LAYERS}
        format="image/png"
        transparent
        version="1.3.0"
        attribution="NOAA Chart Display Service"
        opacity={0.78}
      />

      {fullTrack.length >= 2 && (
        <Polyline
          positions={fullTrack}
          pathOptions={{
            color: "rgba(15,23,42,0.28)",
            weight: 4,
          }}
        />
      )}

      {directProgressTrack && (
        <Polyline
          positions={directProgressTrack}
          pathOptions={{
            color: "rgba(15,23,42,0.4)",
            weight: 2,
            dashArray: "6 6",
          }}
        />
      )}

      {selectionTrack.length >= 2 && (
        <Polyline
          positions={selectionTrack}
          pathOptions={{
            color: "#22d3ee",
            weight: 6,
            opacity: 0.95,
          }}
        />
      )}

      {pastTrack.length >= 2 && (
        <Polyline
          positions={pastTrack}
          pathOptions={{
            color: "#ec4899",
            weight: 5,
            opacity: 0.95,
          }}
        />
      )}

      {fullTrack.length >= 2 && (
        <>
          <CircleMarker
            center={fullTrack[0]}
            radius={6}
            pathOptions={{
              color: "#f8fafc",
              fillColor: "#f8fafc",
              fillOpacity: 1,
              weight: 2,
            }}
          />
          <CircleMarker
            center={fullTrack[fullTrack.length - 1]}
            radius={6.5}
            pathOptions={{
              color: "#0f172a",
              fillColor: "#2dd4bf",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        </>
      )}

      {selectionStartPosition && (
        <CircleMarker
          center={selectionStartPosition}
          radius={7}
          pathOptions={{
            color: "#f59e0b",
            fillColor: "#0f172a",
            fillOpacity: 1,
            weight: 3,
          }}
        />
      )}

      {selectionEndPosition && (
        <CircleMarker
          center={selectionEndPosition}
          radius={7}
          pathOptions={{
            color: "#22d3ee",
            fillColor: "#0f172a",
            fillOpacity: 1,
            weight: 3,
          }}
        />
      )}

      {currentPosition && (
        <CircleMarker
          center={currentPosition}
          radius={8}
          pathOptions={{
            color: "#fff7ed",
            fillColor: "#f59e0b",
            fillOpacity: 1,
            weight: 2.5,
          }}
        />
      )}
    </MapContainer>
  );
}
