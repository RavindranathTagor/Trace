import Dashboard from "@/components/Dashboard";

// Full-screen product at /app (the landing page at / embeds the same component).
export default function AppPage() {
  return (
    <div className="h-screen">
      <Dashboard autoTour />
    </div>
  );
}
