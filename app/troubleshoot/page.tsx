// force redeploy
export default function TroubleshootPage() {
  return (
    <div className="space-y-5 px-4 pb-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Troubleshoot</h1>

      <div className="grid gap-3">
        <a href="/trim/main" className="block rounded-lg bg-red-500 text-white p-4 font-semibold">
          Mainsail Trim
        </a>

        <a href="/trim/jib" className="block rounded-lg bg-orange-500 text-white p-4 font-semibold">
          Headsail Trim
        </a>

        <a href="/trim/spin" className="block rounded-lg bg-blue-500 text-white p-4 font-semibold">
          Spinnaker Trim
        </a>
      </div>

      <a href="/" className="block text-center mt-4 text-sm underline">
        Back Home
      </a>
    </div>
  );
}// force redeploy Sun Apr 12 21:02:58 EDT 2026
