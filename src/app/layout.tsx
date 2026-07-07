import GowesProvider from "./gowes-provider";
import PantauProvider from "./pantau-provider";
import NavProvider from "./nav-provider";
import ActivityDock from "./activity-dock";
import SosAlertProvider from "./sos-alert-provider";
import InstallPrompt from "./install-prompt";
import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
// Font display bergaya atletik/racing untuk judul & angka besar
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "BUG - Bulungan untuk Goweser",
  description: "Platform keselamatan  pesepeda Kabupaten Bulungan",
};

export const viewport: Viewport = {
  themeColor: "#052e16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${barlow.variable} font-body bg-gray-50 min-h-screen`}>
        <GowesProvider>
          <PantauProvider>
            <NavProvider>
              <SosAlertProvider />
              <InstallPrompt />
              <Navbar />
              <ActivityDock />
              <main className="pb-20">{children}</main>
            </NavProvider>
          </PantauProvider>
        </GowesProvider>
      </body>
    </html>
  );
}