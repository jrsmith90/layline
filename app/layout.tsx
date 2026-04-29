import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Layline — Sailing Tactics App",
  description:
    "A tactical sailing app for race prep, trim, weather, starts, and course decisions.",
};

export const viewport: Viewport = {
  themeColor: "#0B1F33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
