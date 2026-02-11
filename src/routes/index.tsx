import { createFileRoute } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import {
  FeatureGrid,
  HeroSection,
  SystemStatusCard,
} from "@/features/dashboard/ui";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setVersion).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <HeroSection version={version} />
      <FeatureGrid />
      <SystemStatusCard />
    </div>
  );
}
