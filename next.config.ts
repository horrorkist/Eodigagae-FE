import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  /* config options here */
  ...(distDir ? { distDir } : {}),
  images: {
    remotePatterns: [
      new URL("http://tong.visitkorea.or.kr/**"),
      new URL("https://imagedelivery.net/**"),
    ],
  },
};

export default nextConfig;
