"use client";

import { useEffect, type ReactNode } from "react";
import { useConnectionConfig } from "@/lib/boat-data/store";
import { startDemoMode, stopDemoMode } from "@/lib/boat-data/demoSource";
import { connectSignalK } from "@/lib/signalk/client";

/**
 * Owns the live boat-data connection lifecycle at the app root, the same way
 * PhoneGpsProvider owns the geolocation watch - so the WebSocket/demo generator
 * keeps running across navigation instead of only while /settings/boat-data is mounted.
 */
export function BoatDataConnectionProvider({ children }: { children: ReactNode }) {
  const config = useConnectionConfig();
  const { activeMode } = config;
  const { host, protocol, port, authToken, vesselContext, autoReconnect } = config.signalk;

  useEffect(() => {
    if (activeMode === "signalk") {
      const controller = connectSignalK({
        host,
        protocol,
        port,
        authToken,
        vesselContext,
        autoReconnect,
      });
      return () => controller.disconnect();
    }

    if (activeMode === "demo") {
      startDemoMode();
      return () => stopDemoMode();
    }

    return undefined;
  }, [activeMode, host, protocol, port, authToken, vesselContext, autoReconnect]);

  return children;
}
