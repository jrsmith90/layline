import "./globals.css";

export const metadata = {
  title: "Layline — A Cal 25 Sailing Guide",
  description:
    "On-deck trim, tactics, and troubleshooting for Cal 25 racing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen px-4 py-5 bg-[color:var(--bg)]">
          <div className="mx-auto w-full max-w-md space-y-5">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}