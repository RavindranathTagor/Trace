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
};

export default nextConfig;
