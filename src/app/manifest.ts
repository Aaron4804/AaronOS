import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "AaronOS", short_name: "AaronOS",
    description: "Personal workspace for training, planning and daily routines",
    start_url: "/dashboard", scope: "/", display: "standalone",
    theme_color: "#101212", background_color: "#101212",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
