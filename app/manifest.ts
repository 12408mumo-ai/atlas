import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?v=5",
    name: "Atlas — The World You Carry",
    short_name: "Atlas",
    description:
      "A personal tracking sanctuary for work, study, people, life and memory — guided by the Titan Atlas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#36454F",
    theme_color: "#36454F",
    icons: [
      {
        src: "/icons/icon-192.png?v=5",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
