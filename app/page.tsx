export default function Home() {
  const items = [
    { label: "Trim", href: "/trim", desc: "Main + Jib, Upwind/Downwind" },
    { label: "Start", href: "/start", desc: "Bias, time-distance, execution" },
    { label: "Tactics", href: "/tactics", desc: "Upwind + Downwind decisions" },
    { label: "Troubleshoot", href: "/troubleshoot", desc: "Fix speed/control fast" },
    { label: "Notes", href: "/notes", desc: "Save what worked" },
  ];

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-6 px-6 w-full">
        <h1 className="text-4xl font-bold tracking-tight">Layline</h1>
        <p className="text-lg opacity-80">A Cal 25 Sailing Guide</p>

        <div className="pt-8 space-y-4">
          {/* Panic button */}
          <a
            href="/troubleshoot/slow"
            className="block w-full max-w-sm mx-auto rounded-2xl bg-amber-400 text-black py-4 px-4 text-left shadow-lg active:scale-[0.98] transition"
          >
            <div className="text-lg font-semibold">I’M SLOW</div>
            <div className="text-sm opacity-80">Go to the fast fix checklist</div>
          </a>

          {/* Main navigation */}
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block w-full max-w-sm mx-auto rounded-2xl bg-white text-black py-4 px-4 text-left shadow-lg active:scale-[0.98] hover:bg-gray-200 transition"
            >
              <div className="text-lg font-semibold">{item.label}</div>
              <div className="text-sm opacity-70">{item.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}