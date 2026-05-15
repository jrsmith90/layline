import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import ActiveCourseTracker from "@/components/race/ActiveCourseTracker";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Live Tracking"
        title="Watch mark progress without fighting the interface."
        description="Course Tracker is for leg geometry, layline timing, and manual recovery. The goal here is quick interpretation, not more tactical noise."
        badges={["Mark Progress", "Layline Timing", "Recovery Controls"]}
      />

      <WorkflowQuickLinks
        title="Next Steps"
        items={[
          { href: "/race/pre-race", label: "Pre-Race", detail: "Return to the opening plan and setup context" },
          { href: "/race/live", label: "Race Live", detail: "View the condensed cockpit call stack" },
          { href: "/race/review", label: "Review", detail: "Replay what happened after the race" },
          { href: "/race/tactical-board", label: "Tactical Board", detail: "Adjust the saved wind and geometry baseline" },
        ]}
      />

      <ActiveCourseTracker />
    </main>
  );
}
