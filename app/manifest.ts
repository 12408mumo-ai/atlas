import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?v=4",
    name: "Atlas — The World You Carry",
    short_name: "Atlas",
    description:
      "A personal tracking sanctuary for work, study, people, life and memory — guided by the Titan Atlas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#28282A",
    theme_color: "#28282A",
    icons: [
      {
        src: "/icons/sphere-192.png?v=4",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/sphere-512.png?v=4",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/sphere-maskable-512.png?v=4",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
