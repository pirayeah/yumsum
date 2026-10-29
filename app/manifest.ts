import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YumSum",
    short_name: "YumSum",
    start_url: `${base}/`,
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#f5f5f4",
    icons: [{ src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml" }],
  };
}
