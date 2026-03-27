import { createFileRoute } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { languageAtom } from "@/domain/i18n/store";
import { FeatureGrid, HeroSection, SystemStatusCard } from "@/features/dashboard/ui";
import { en } from "./en";
import { ko } from "./ko";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [version, setVersion] = useState<string>("");
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;

  useEffect(() => {
    getVersion().then(setVersion).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <HeroSection
        version={version}
        translations={{
          title: t.hero_title,
          accent: t.hero_title_accent,
          description: t.hero_description,
          btnDashboard: t.hero_btn_dashboard,
          btnAdd: t.hero_btn_add,
        }}
      />
      <FeatureGrid
        translations={{
          title: t.feature_grid_title,
          subtitle: t.feature_grid_subtitle,
          feature_1_title: t.feature_1_title,
          feature_1_desc: t.feature_1_desc,
          feature_2_title: t.feature_2_title,
          feature_2_desc: t.feature_2_desc,
          feature_3_title: t.feature_3_title,
          feature_3_desc: t.feature_3_desc,
        }}
      />
      <SystemStatusCard
        translations={{
          title: t.status_title,
          healthy: t.status_healthy,
          issue: t.status_issue,
          checking: t.status_checking,
          lastCheck: t.status_last_check,
        }}
      />
    </div>
  );
}
