"use client";

import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { ConnectionModeSelector } from "@/components/boat-data/ConnectionModeSelector";
import { DataDiagnostics } from "@/components/boat-data/DataDiagnostics";

export default function BoatDataSettingsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Settings / Boat Data"
        title="Boat Data Connection"
        description="Bring live instrument data from the B&G Vulcan 7 and your NMEA 2000 network into Layline. Signal K is the recommended path — it stays on your boat's local network and never needs to reach the public internet."
        badges={["Signal K", "Direct Navico", "File Import"]}
      />

      <ConnectionModeSelector />
      <DataDiagnostics />
    </main>
  );
}
