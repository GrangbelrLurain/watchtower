import { createFileRoute } from "@tanstack/react-router";
import {
  FeatureGrid,
  HeroSection,
  SystemStatusCard,
} from "@/features/dashboard/ui";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <HeroSection />
      <FeatureGrid />
      <SystemStatusCard />
    </div>
  );
}
