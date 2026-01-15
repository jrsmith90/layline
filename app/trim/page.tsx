export default function Home() {
  return (
    <main className="min-h-screen p-10">
      <h1 className="text-4xl font-bold">Layline</h1>
      <p className="mt-2 text-lg opacity-80">A Cal 25 Sailing Guide</p>

      <div className="mt-8 grid gap-4 max-w-xl">
        <a className="rounded-xl border p-4 hover:bg-white/5" href="/trim">
          <div className="font-semibold">Trim</div>
          <div className="opacity-70">Main, jib, spinnaker basics</div>
        </a>

        <a className="rounded-xl border p-4 hover:bg-white/5" href="/rigging">
          <div className="font-semibold">Rigging</div>
          <div className="opacity-70">Controls, blocks, line routing</div>
        </a>

        <a className="rounded-xl border p-4 hover:bg-white/5" href="/tactics">
          <div className="font-semibold">Tactics</div>
          <div className="opacity-70">Starts, upwind, downwind</div>
        </a>
      </div>
    </main>
  );
}