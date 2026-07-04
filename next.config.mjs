/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep file parsers out of the bundler (they do dynamic requires / fs reads).
    serverComponentsExternalPackages: ["mammoth", "xlsx", "unpdf", "pdfjs-dist"],
  },
};

export default nextConfig;
