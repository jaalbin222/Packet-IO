import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { PacketProvider } from "@/components/packet-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-tight" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Packet.io",
    template: "%s · Packet.io",
  },
  description: "Data infrastructure for on-site applications. Map site tags, then deploy against one canonical model.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${tight.variable} ${mono.variable}`}>
        <PacketProvider>
          <Shell>{children}</Shell>
        </PacketProvider>
      </body>
    </html>
  );
}
