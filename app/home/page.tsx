import LandingPage from "@/components/LandingPage";

// A fresh alias of the landing. "/" is rewritten here by middleware so the landing is
// served from a route that was never cached as the dashboard, bypassing the stale
// 1-year CDN/prerender that had pinned "/" to the old build.
export default function HomePage() {
  return <LandingPage />;
}
