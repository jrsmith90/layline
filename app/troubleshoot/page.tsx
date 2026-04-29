// force redeploy
import Link from "next/link";

const troubleshootLinks = [
  { href: "/troubleshoot/slow", label: "Boat feels slow", tone: "bg-yellow-500 text-black" },
  { href: "/troubleshoot/overpowered", label: "Overpowered", tone: "bg-red-500 text-white" },
  { href: "/troubleshoot/pinching", label: "Pinching", tone: "bg-orange-500 text-white" },
  { href: "/troubleshoot/lane", label: "Lane trouble", tone: "bg-blue-500 text-white" },
  { href: "/troubleshoot/bad-air", label: "Bad air", tone: "bg-slate-600 text-white" },
];

export default function TroubleshootPage() {
  return (
    <div className="space-y-5 px-4 pb-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Troubleshoot</h1>

      <div className="grid gap-3">
        {troubleshootLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg p-4 font-semibold ${item.tone}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Link href="/" className="block text-center mt-4 text-sm underline">
        Back Home
      </Link>
    </div>
  );
}// force redeploy Sun Apr 12 21:02:58 EDT 2026
