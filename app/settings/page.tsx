"use client";

import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Settings"
        title="Settings"
        description="Connect live boat instruments, and configure how Layline runs on your device."
      />

      <WorkflowQuickLinks
        title="Boat data"
        items={[
          {
            href: "/settings/boat-data",
            label: "Boat Data Connection",
            detail: "Signal K, direct Navico, or Vulcan file import",
          },
          {
            href: "/instruments",
            label: "Live Instruments",
            detail: "The live instrument dashboard fed by your boat data connection",
          },
        ]}
      />
    </main>
  );
}
