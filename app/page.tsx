import LandingPage from "@/components/LandingPage";

// The marketing landing at "/". The actual UI lives in components/LandingPage.tsx so
// both "/" and "/home" can render it via a normal client-component import (re-exporting
// a client default across routes breaks the RSC client manifest at build time).
export default function Page() {
  return <LandingPage />;
}
