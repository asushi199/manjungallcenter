import type { MetadataRoute } from "next";
import {
  APP_DESCRIPTION,
  BRAND_THEME_COLOR,
  PWA_APP_NAME,
} from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PWA_APP_NAME,
    short_name: PWA_APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_THEME_COLOR,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
