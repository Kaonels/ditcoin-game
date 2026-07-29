import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DITCOIN SOLANA EMPIRE — Build your crypto empire",
  description:
    "DITCOIN SOLANA EMPIRE — buy property, collect rent, build an empire on Solana. " +
    "Connect Phantom to own your character, houses and SOL. Free to play.",
  keywords: [
    "Ditcoin",
    "Solana",
    "Phantom",
    "web3 game",
    "crypto empire",
    "play to earn",
    "SOL",
    "blockchain game",
  ],
  authors: [{ name: "DITCOIN" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "DITCOIN SOLANA EMPIRE",
    description: "Buy property. Collect rent. Build an empire on Solana.",
    siteName: "DITCOIN SOLANA EMPIRE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DITCOIN SOLANA EMPIRE",
    description: "Buy property. Collect rent. Build an empire on Solana.",
  },
};

// Force a dark, non-zoomable viewport so the iframe-hosted game fills the whole screen
// on mobile without iOS auto-zooming or showing a white flash before the iframe paints.
export const viewport: Viewport = {
  themeColor: "#0c0f14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, padding: 0, background: "#0c0f14", overflow: "hidden" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
