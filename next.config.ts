import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads a worker script by relative path at
  // runtime; bundling it breaks that resolution, so it needs native
  // require() instead — same reasoning as the @react-pdf/renderer entry
  // Next.js externalizes by default.
  serverExternalPackages: ["pdf-parse"],
};

export default withNextIntl(nextConfig);
