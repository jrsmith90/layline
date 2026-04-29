import type { Metadata, Viewport } from "next";
import { PhoneGpsProvider } from "@/components/gps/PhoneGpsProvider";
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
        <PhoneGpsProvider>
          <div className="min-h-screen overflow-x-hidden pb-24">
            {children}
          </div>
        </PhoneGpsProvider>
      </body>
    </html>
  );
}
