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
  // The client portal must never be indexed by search engines (the pages
  // also set <meta name="robots" content="noindex">).
  async headers() {
    return [
      {
        source: "/:locale(en|es)/portal/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/api/portal/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      // The partner (alliance) portal — same rules.
      {
        source: "/:locale(en|es)/partners/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/api/partners/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      // "Join Diamante Conecta 360": not indexed for now (owner's choice).
      {
        source: "/:locale(en|es)/conecta/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/conecta/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

// withBotId adds the rewrites Vercel BotID needs for its invisible
// challenge on the public /book page (see instrumentation-client.ts).
export default withBotId(withNextIntl(nextConfig));
