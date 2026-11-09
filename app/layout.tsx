import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/PwaInstall";
import { AtlasGlowCursor } from "@/components/AtlasGlowCursor";
import { WavesBackground } from "@/components/WavesBackground";
import { PersistentAiOrb } from "@/components/PersistentAiOrb";

export const metadata: Metadata = {
  title: "Atlas — the world you carry",
  description:
    "A personal tracking sanctuary for work, study, people, life and memory. Named for the Titan who holds the world.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atlas",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=5", sizes: "any" },
      { url: "/icons/icon-192.png?v=5", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=5", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/icons/icon-192.png?v=5"],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#36454F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/glass-tokens.css" />
        {/* Typekit — the studio kit requested for Atlas */}
        <link rel="stylesheet" href="https://use.typekit.net/iyo4kyx.css" />
        {/* Graceful companions, used only if the kit faces are unavailable */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap"
        />
      </head>
      <body>
        <WavesBackground />
        <AtlasGlowCursor />
        <ServiceWorkerRegister />
        <PersistentAiOrb />
        {children}
      </body>
    </html>
  );
}
