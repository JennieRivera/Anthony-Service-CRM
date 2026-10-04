import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withBotId } from "botid/next/config";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads a worker script by relative path at
  // runtime; bundling it breaks that resolution, so it needs native
  // require() instead — same reasoning as the @react-pdf/renderer entry
  // Next.js externalizes by default.
  serverExternalPackages: ["pdf-parse"],
};

// withBotId adds the rewrites Vercel BotID needs for its invisible
// challenge on the public /book page (see instrumentation-client.ts).
export default withBotId(withNextIntl(nextConfig));
