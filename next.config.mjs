/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep file parsers out of the bundler (they do dynamic requires / fs reads).
    serverComponentsExternalPackages: ["mammoth", "xlsx", "unpdf", "pdfjs-dist"],
  },
  // Don't fail the production build on lint/type warnings — the hosted `next build`
  // enforces these (unlike local `next dev`). Keeps the Render deploy unblocked.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // The marketing landing (/) and the product (/app) must NOT be cached for a year by
  // the CDN — Next's default `s-maxage=31536000` on static routes was pinning an old
  // prerender at the edge (so / kept serving a stale build). Force revalidation.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
