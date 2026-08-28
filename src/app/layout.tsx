import GowesProvider from "./gowes-provider";
import IzinPanggilan from "@/components/izin-panggilan";
import TombolCatat from "@/components/tombol-catat";
import { SkripTema } from "@/components/tema";
import PeralihanHalaman from "@/components/peralihan-halaman";
import PantauProvider from "./pantau-provider";
import NavProvider from "./nav-provider";
import ActivityDock from "./activity-dock";
import PushRegistrar from "./push-registrar";
import SessionKeeper from "./session-keeper";
import NavLoadingProvider from "./nav-loading";
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
      <head><SkripTema /></head>
      <body className={`${inter.variable} ${barlow.variable} font-body bg-[var(--latar)] text-slate-200 min-h-screen`}>
        <GowesProvider>
          <PantauProvider>
            <NavProvider>
              <NavLoadingProvider>
                <SosAlertProvider />
                <SessionKeeper />
                <PushRegistrar />
                <InstallPrompt />
                <IzinPanggilan />
        <TombolCatat />
        <Navbar />
                <ActivityDock />
                <main className="pb-[68px]"><PeralihanHalaman>{children}</PeralihanHalaman></main>
              </NavLoadingProvider>
            </NavProvider>
          </PantauProvider>
        </GowesProvider>
      </body>
    </html>
  );
}
