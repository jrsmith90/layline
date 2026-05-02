import Link from "next/link";
import ActiveCourseTracker from "@/components/race/ActiveCourseTracker";

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <Link
        href="/race/pre-race"
        className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
      >
        Pre-race route bias
      </Link>
      <Link
        href="/race/live"
        className="ml-2 inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
      >
        Race live cockpit
      </Link>
      <Link
        href="/race/review"
        className="ml-2 inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
      >
        Race review
      </Link>
      <ActiveCourseTracker />
    </main>
  );
}
