import "./globals.css";

export const metadata = {
  title: "Layline — A Cal 25 Sailing Guide",
  description: "Race-day tuning and decisions for the Cal 25",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur">
          <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-3">
            <a
              href="/"
              className="text-xl font-bold tracking-tight"
            >
              Layline
            </a>
            <span className="text-sm opacity-60">
              Cal 25
            </span>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}