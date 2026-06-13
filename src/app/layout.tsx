import SosAlertProvider from "./sos-alert-provider";
import InstallPrompt from "./install-prompt";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BUG - Bulungan untuk Goweser",
  description: "Platform keselamatan  pesepeda Kabupaten Bulungan",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
  <SosAlertProvider />
  <InstallPrompt />
  <Navbar />
  <main className="pb-20">{children}</main>
</body>
    </html>
  );
}