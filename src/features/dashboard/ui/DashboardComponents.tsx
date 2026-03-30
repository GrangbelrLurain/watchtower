import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Activity, ArrowRight, CheckCircle2, Globe, History, Server, Wifi, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { domainCountAtom, proxyActiveAtom, proxyRunningAtom } from "@/domain/app-status/store";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
  color: string;
  bg: string;
}

interface SetupStep {
  label: string;
  done: boolean;
  href: string;
  actionLabel: string;
}

interface RecentMonitorItem {
  url: string;
  level: string;
  latency?: number;
}

interface RecentApiLog {
  id: string;
  method: string;
  path: string;
  status_code: number | null;
  timestamp: string;
}

// ── SetupProgressCard ────────────────────────────────────────────────────────

interface SetupProgressCardProps {
  steps: SetupStep[];
  lang: "ko" | "en";
  onDismiss: () => void;
}

const SETUP_T = {
  ko: {
    title: "시작하기",
    subtitle: "아래 단계를 완료하면 Watchtower의 모든 기능을 사용할 수 있어요.",
    done: "완료",
    skip: "건너뛰기",
  },
  en: {
    title: "Getting Started",
    subtitle: "Complete the steps below to unlock all Watchtower features.",
    done: "Done",
    skip: "Skip",
  },
};

export function SetupProgressCard({ steps, lang, onDismiss }: SetupProgressCardProps) {
  const t = SETUP_T[lang];
  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  // Once all done, it should naturally stay hidden via the parent but checking here too
  if (allDone) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t.title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
            {completedCount}/{steps.length}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors group"
            title={t.skip}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full bg-indigo-100 rounded-full h-1.5 mb-5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              step.done ? "opacity-50" : "bg-white shadow-sm border border-indigo-100"
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-indigo-300 shrink-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-indigo-400">{i + 1}</span>
              </div>
            )}
            <span
              className={`text-sm flex-1 ${step.done ? "text-slate-400 line-through" : "text-slate-700 font-medium"}`}
            >
              {step.label}
            </span>
            {!step.done && (
              <Link to={step.href}>
                <Button variant="primary" size="sm" className="gap-1 shrink-0 text-xs h-7">
                  {step.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── QuickStatsRow ────────────────────────────────────────────────────────────

interface QuickStatsRowProps {
  stats: QuickStat[];
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Link key={stat.href} to={stat.href}>
          <Card className="p-5 bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-200 group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                <div className={stat.color}>{stat.icon}</div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800 leading-none">{stat.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ── RecentActivityGrid ────────────────────────────────────────────────────────

interface RecentActivityGridProps {
  monitorItems: RecentMonitorItem[];
  apiLogs: RecentApiLog[];
  lang: "ko" | "en";
}

const ACTIVITY_T = {
  ko: {
    monitorTitle: "최근 모니터링",
    apiTitle: "최근 API 요청",
    viewAll: "전체 보기",
    healthy: "정상",
    warning: "경고",
    error: "오류",
    noMonitor: "모니터링 데이터가 없어요",
    noApi: "API 로그가 없어요",
  },
  en: {
    monitorTitle: "Recent Monitor",
    apiTitle: "Recent API Requests",
    viewAll: "View All",
    healthy: "Healthy",
    warning: "Warning",
    error: "Error",
    noMonitor: "No monitoring data yet",
    noApi: "No API logs yet",
  },
};

const levelConfig = {
  info: { dot: "bg-green-500", badge: "text-green-600 bg-green-50" },
  warning: { dot: "bg-amber-500", badge: "text-amber-600 bg-amber-50" },
  error: { dot: "bg-red-500", badge: "text-red-600 bg-red-50" },
};

const statusColor = (code: number | null) => {
  if (code === null) {
    return "text-slate-400";
  }
  if (code >= 500) {
    return "text-red-600";
  }
  if (code >= 400) {
    return "text-amber-600";
  }
  if (code >= 300) {
    return "text-blue-600";
  }
  return "text-green-600";
};

export function RecentActivityGrid({ monitorItems, apiLogs, lang }: RecentActivityGridProps) {
  const t = ACTIVITY_T[lang];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monitor */}
      <Card className="p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500" />
            {t.monitorTitle}
          </h2>
          <Link
            to="/monitor"
            className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1"
          >
            {t.viewAll} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {monitorItems.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">{t.noMonitor}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {monitorItems.slice(0, 5).map((item, i) => {
              const cfg = levelConfig[item.level as keyof typeof levelConfig] ?? levelConfig.info;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className="text-sm font-mono text-slate-700 flex-1 truncate">{item.url}</span>
                  {item.latency !== undefined && (
                    <span className="text-xs text-slate-400 shrink-0">{item.latency}ms</span>
                  )}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                    {t[item.level as keyof typeof t] ?? item.level}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* API Logs */}
      <Card className="p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-violet-500" />
            {t.apiTitle}
          </h2>
          <Link
            to="/apis/logs"
            className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1"
          >
            {t.viewAll} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {apiLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">{t.noApi}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {apiLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-14 text-center shrink-0">
                  {log.method}
                </span>
                <span className="text-xs font-mono text-slate-700 flex-1 truncate">{log.path}</span>
                <span className={`text-xs font-bold shrink-0 ${statusColor(log.status_code)}`}>
                  {log.status_code ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── DashboardDataProvider ────────────────────────────────────────────────────

interface DashboardData {
  monitorItems: RecentMonitorItem[];
  apiLogs: RecentApiLog[];
}

export function useDashboardData(): DashboardData {
  const [monitorItems, setMonitorItems] = useState<RecentMonitorItem[]>([]);
  const [apiLogs, setApiLogs] = useState<RecentApiLog[]>([]);
  const domainCount = useAtomValue(domainCountAtom);

  useEffect(() => {
    if (domainCount === 0 || domainCount === null) {
      return;
    }

    invokeApi("get_latest_status")
      .then((res) => {
        if (res.success && res.data) {
          setMonitorItems(res.data.slice(0, 5));
        }
      })
      .catch(console.error);

    const today = new Date().toISOString().split("T")[0];
    invokeApi("get_api_logs", { payload: { date: today } })
      .then((res) => {
        if (res.success && res.data) {
          setApiLogs(res.data.slice(0, 5).map((l) => ({ ...l, status_code: l.status_code ?? null })));
        }
      })
      .catch(console.error);
  }, [domainCount]);

  return { monitorItems, apiLogs };
}

// ── ProxyStatusBadge ─────────────────────────────────────────────────────────

export function ProxyStatusBadge({ lang }: { lang: "ko" | "en" }) {
  const proxyActive = useAtomValue(proxyActiveAtom);
  const proxyRunning = useAtomValue(proxyRunningAtom);

  if (proxyRunning === null) {
    return null;
  }

  return (
    <Link to="/proxy/dashboard">
      <div
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
          proxyActive
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-slate-100 text-slate-500 border border-slate-200",
        )}
      >
        <Server className="w-3.5 h-3.5" />
        {proxyActive
          ? lang === "ko"
            ? "프록시 활성"
            : "Proxy Active"
          : lang === "ko"
            ? "프록시 비활성"
            : "Proxy Inactive"}
        <div
          className={clsx("w-1.5 h-1.5 rounded-full", proxyActive ? "bg-green-500 animate-pulse" : "bg-slate-400")}
        />
      </div>
    </Link>
  );
}

// ── QuickActions ─────────────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

interface QuickActionsCardProps {
  actions: QuickAction[];
  title: string;
}

export function QuickActionsCard({ actions, title }: QuickActionsCardProps) {
  return (
    <Card className="p-5 bg-white">
      <h2 className="font-bold text-slate-800 mb-4">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Link key={action.href} to={action.href}>
            <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group cursor-pointer">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}>{action.icon}</div>
              <div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Helper: build quick stats ─────────────────────────────────────────────────

export function buildQuickStats(
  domainCount: number | null,
  apiLoggingCount: number | null,
  proxyRunning: boolean | null,
  proxyLocalRouting: boolean | null,
  todayApiCount: number,
  lang: "ko" | "en",
): QuickStat[] {
  const ko = lang === "ko";
  return [
    {
      label: ko ? "등록된 도메인" : "Domains",
      value: domainCount ?? "—",
      icon: <Globe className="w-5 h-5" />,
      href: "/domains/dashboard",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: ko ? "API 로깅 도메인" : "API Logging",
      value: apiLoggingCount ?? "—",
      icon: <Wifi className="w-5 h-5" />,
      href: "/apis/dashboard",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: ko ? "오늘 API 요청" : "Today's Requests",
      value: todayApiCount,
      icon: <History className="w-5 h-5" />,
      href: "/apis/logs",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: ko ? "프록시 상태" : "Proxy Status",
      value:
        proxyRunning === null
          ? "—"
          : !proxyRunning
            ? ko
              ? "중지됨"
              : "Stopped"
            : proxyLocalRouting
              ? ko
                ? "활성"
                : "Active"
              : ko
                ? "비활성"
                : "Inactive",
      icon: proxyRunning && proxyLocalRouting ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />,
      href: "/proxy/dashboard",
      color: proxyRunning && proxyLocalRouting ? "text-green-600" : "text-slate-400",
      bg: proxyRunning && proxyLocalRouting ? "bg-green-50" : "bg-slate-50",
    },
  ];
}
