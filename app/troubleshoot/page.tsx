// force redeploy
import Link from "next/link";

export default function TroubleshootPage() {
  return (
    <div className="space-y-5 px-4 pb-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Troubleshoot</h1>

      <div className="grid gap-3">
        <Link href="/trim/main" className="block rounded-lg bg-red-500 text-white p-4 font-semibold">
          Mainsail Trim
        </Link>

        <Link href="/trim/jib" className="block rounded-lg bg-orange-500 text-white p-4 font-semibold">
          Headsail Trim
        </Link>

        <Link href="/trim/spin" className="block rounded-lg bg-blue-500 text-white p-4 font-semibold">
          Spinnaker Trim
        </Link>
      </div>

      <Link href="/" className="block text-center mt-4 text-sm underline">
        Back Home
      </Link>
    </div>
  );
}// force redeploy Sun Apr 12 21:02:58 EDT 2026
