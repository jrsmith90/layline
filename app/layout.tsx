import type { Metadata, Viewport } from "next";
import { AppModeProvider } from "@/components/display/AppModeProvider";
import { DisplayModeProvider } from "@/components/display/DisplayModeProvider";
import { PhoneGpsProvider } from "@/components/gps/PhoneGpsProvider";
import { AppNavigationButtons } from "@/components/navigation/AppNavigationButtons";
import { AppSidebar } from "@/components/navigation/AppSidebar";
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
        <AppModeProvider>
          <DisplayModeProvider>
            <PhoneGpsProvider>
              <div className="flex min-h-screen overflow-x-hidden">
                <AppSidebar />
                <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden pb-24">
                  <AppNavigationButtons />
                  {children}
                </div>
              </div>
            </PhoneGpsProvider>
          </DisplayModeProvider>
        </AppModeProvider>
      </body>
    </html>
  );
}
