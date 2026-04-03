import { createFileRoute } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import { useAtom, useAtomValue } from "jotai";
import { BookOpen, History, Plus, Server } from "lucide-react";
import { useEffect, useState } from "react";
import {
  apiLoggingCountAtom,
  domainCountAtom,
  proxyLocalRoutingEnabledAtom,
  proxyRunningAtom,
  setupDismissedAtom,
} from "@/domain/app-status/store";
import { languageAtom } from "@/domain/i18n/store";
import {
  buildQuickStats,
  ProxyStatusBadge,
  QuickActionsCard,
  QuickStatsRow,
  RecentActivityGrid,
  SetupProgressCard,
  useDashboardData,
} from "@/features/dashboard/ui/DashboardComponents";
import { Badge } from "@/shared/ui/badge/badge";
import { en } from "./en";
import { ko } from "./ko";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [version, setVersion] = useState<string>("");
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;
  const langKey = lang === "ko" ? "ko" : "en";

  const domainCount = useAtomValue(domainCountAtom);
  const apiLoggingCount = useAtomValue(apiLoggingCountAtom);
  const proxyRunning = useAtomValue(proxyRunningAtom);
  const proxyLocalRouting = useAtomValue(proxyLocalRoutingEnabledAtom);
  const [setupDismissed, setSetupDismissed] = useAtom(setupDismissedAtom);

  const { monitorItems, apiLogs } = useDashboardData();

  useEffect(() => {
    getVersion().then(setVersion).catch(console.error);
  }, []);

  // ── Setup progress ──────────────────────────────────────────────────────────
  const setupSteps = [
    {
      label: t.step1Label,
      done: (domainCount ?? 0) > 0,
      href: "/domains/regist",
      actionLabel: t.step1Action,
    },
    {
      label: t.step2Label,
      done: !!(proxyRunning && proxyLocalRouting),
      href: "/proxy/dashboard",
      actionLabel: t.step2Action,
    },
    {
      label: t.step3Label,
      done: (apiLoggingCount ?? 0) > 0,
      href: "/apis/settings",
      actionLabel: t.step3Action,
    },
  ];

  // Auto-set setup dismissed if all steps completed
  useEffect(() => {
    const allDone = (domainCount ?? 0) > 0 && !!(proxyRunning && proxyLocalRouting) && (apiLoggingCount ?? 0) > 0;
    if (allDone && !setupDismissed) {
      setSetupDismissed(true);
    }
  }, [domainCount, proxyRunning, proxyLocalRouting, apiLoggingCount, setupDismissed, setSetupDismissed]);

  // ── Quick stats ─────────────────────────────────────────────────────────────
  const stats = buildQuickStats(domainCount, apiLoggingCount, proxyRunning, proxyLocalRouting, apiLogs.length, langKey);

  // ── Quick actions ───────────────────────────────────────────────────────────
  const quickActions = [
    {
      label: t.qa1Label,
      description: t.qa1Desc,
      href: "/domains/regist",
      icon: <Plus className="w-4 h-4" />,
      color: "bg-primary/10 text-primary",
    },
    {
      label: t.qa2Label,
      description: t.qa2Desc,
      href: "/apis/logs",
      icon: <History className="w-4 h-4" />,
      color: "bg-secondary/10 text-secondary",
    },
    {
      label: t.qa3Label,
      description: t.qa3Desc,
      href: "/apis/schema",
      icon: <BookOpen className="w-4 h-4" />,
      color: "bg-accent/10 text-accent",
    },
    {
      label: t.qa4Label,
      description: t.qa4Desc,
      href: "/proxy/setup",
      icon: <Server className="w-4 h-4" />,
      color: "bg-base-300 text-base-content/60",
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-base-content tracking-tight">{t.title}</h1>
            {version && (
              <Badge variant={{ color: "blue" }} className="bg-primary/10 text-primary border-primary/20">
                v{version}
              </Badge>
            )}
          </div>
          <p className="text-base-content/60 text-sm">{t.subtitle}</p>
        </div>
        <ProxyStatusBadge lang={langKey} />
      </header>

      {/* ── Setup Progress Card (disappears when all done or dismissed) ── */}
      {!setupDismissed && (
        <SetupProgressCard steps={setupSteps} lang={langKey} onDismiss={() => setSetupDismissed(true)} />
      )}

      {/* ── Quick Stats ── */}
      <QuickStatsRow stats={stats} />

      {/* ── Recent Activity ── */}
      <RecentActivityGrid monitorItems={monitorItems} apiLogs={apiLogs} lang={langKey} />

      {/* ── Quick Actions ── */}
      <QuickActionsCard actions={quickActions} title={t.quickActionsTitle} />
    </div>
  );
}
