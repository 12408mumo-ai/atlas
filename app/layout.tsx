import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/PwaInstall";

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
      { url: "/favicon.ico?v=4", sizes: "any" },
      { url: "/icons/sphere-192.png?v=4", sizes: "192x192", type: "image/png" },
      { url: "/icons/sphere-512.png?v=4", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/icons/sphere-192.png?v=4"],
    apple: [{ url: "/sphere-apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#28282A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
