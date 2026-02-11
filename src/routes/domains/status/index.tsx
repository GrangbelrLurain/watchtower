import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Filter,
  RefreshCcw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DomainStatus } from "@/entities/domain/types/domain_status";
import { VirtualizedGroupSection } from "@/features/domain-status/ui/VirtualizedGroupSection";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";

export const Route = createFileRoute("/domains/status/")({
  component: Index,
});

function Index() {
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(
    new Date().toLocaleTimeString(),
  );

  const [siteCheck, setSiteCheck] = useState<DomainStatus[]>([]);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string[]>([]);

  // Fetch the latest status already stored in backend
  const fetchLatest = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await invokeApi("get_latest_status");
      if (response.success && response.data.length > 0) {
        setSiteCheck(response.data);
        // Find the latest timestamp from data
        const latestTime =
          response.data.length > 0
            ? new Date(response.data[0].timestamp).toLocaleTimeString()
            : new Date().toLocaleTimeString();
        setLastUpdated(latestTime);
      }
    } catch (err) {
      console.error("Failed to fetch latest status:", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Manual refresh that triggers a new check
  const handleManualRefresh = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await invokeApi("check_domain_status");
      if (response.success) {
        setSiteCheck(response.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to perform manual refresh:", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    fetchLatest();

    // Poll for the latest data every 30 seconds
    const interval = setInterval(() => {
      fetchLatest();
    }, 1000 * 30);

    return () => clearInterval(interval);
  }, [fetchLatest]);

  const stats = useMemo(() => {
    const healthy = siteCheck.filter((s) => s.level === "info").length;
    const warnings = siteCheck.filter((s) => s.level === "warning").length;
    const errors = siteCheck.filter((s) => s.level === "error").length;
    const avgLatency =
      siteCheck.length > 0
        ? Math.round(
            siteCheck.reduce(
              (acc, s) => acc + (typeof s.latency === "number" ? s.latency : 0),
              0,
            ) / siteCheck.length,
          )
        : 0;

    return { healthy, warnings, errors, avgLatency };
  }, [siteCheck]);

  const groupedSites = useMemo(() => {
    const filtered = siteCheck
      .filter((item) =>
        search ? item.url.toLowerCase().includes(search.toLowerCase()) : true,
      )
      .filter((item) =>
        !filterLevel.length ? true : filterLevel.includes(item.level),
      );

    return filtered.reduce(
      (acc, obj) => {
        const key = obj.group || "Default";
        if (!acc[key]) acc[key] = [];
        acc[key].push(obj);
        return acc;
      },
      {} as Record<string, DomainStatus[]>,
    );
  }, [siteCheck, search, filterLevel]);

  const copyUrls = async () => {
    const reportContent = Object.entries(groupedSites)
      .map(([group, apps]) => {
        const errorList = apps
          .map(
            (app) =>
              `  • ${app.url} (${app.level.toUpperCase()}): ${app.status}`,
          )
          .join("\n");
        return `[${group}]\n${errorList}`;
      })
      .join("\n\n");

    if (reportContent) {
      await navigator.clipboard.writeText(
        `🌍 Monitoring Report (${new Date().toLocaleTimeString()})\n\n${reportContent}`,
      );
      alert("Report copied to clipboard!");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <AnimatePresence>
        {isFetching && siteCheck.length === 0 && (
          <LoadingScreen
            key="status-loader"
            onCancel={() => setIsFetching(false)}
          />
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Real-time Status
            </h1>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Last synched:{" "}
              <span className="font-bold text-slate-700">{lastUpdated}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleManualRefresh}
            className="gap-2 flex items-center"
          >
            <RefreshCcw
              className={clsx(
                "w-4 h-4 inline-block",
                isFetching && "animate-spin",
              )}
            />
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={copyUrls}
            className="gap-2 shadow-lg shadow-blue-500/20 flex items-center"
          >
            <Copy className="w-4 h-4 inline-block" />
            Copy Report
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
              Healthy
            </p>
            <p className="text-xl font-bold">{stats.healthy}</p>
          </div>
        </Card>
        <Card className="p-4 bg-white flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
              Warnings
            </p>
            <p className="text-xl font-bold">{stats.warnings}</p>
          </div>
        </Card>
        <Card
          className={clsx(
            "p-4 flex items-center gap-4 border-0 transition-all duration-500",
            stats.errors > 0
              ? "bg-rose-50 text-rose-700 shadow-lg shadow-rose-100 ring-2 ring-rose-200"
              : "bg-white text-slate-900 border border-slate-100",
          )}
        >
          <div
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center",
              stats.errors > 0
                ? "bg-rose-200 text-rose-700"
                : "bg-slate-50 text-slate-400",
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p
              className={clsx(
                "text-[10px] uppercase font-bold tracking-widest",
                stats.errors > 0 ? "text-rose-500" : "text-slate-400",
              )}
            >
              Critical
            </p>
            <p className="text-xl font-bold">{stats.errors}</p>
          </div>
        </Card>
        <Card className="p-4 bg-white flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
              Latency avg
            </p>
            <p className="text-xl font-bold">{stats.avgLatency}ms</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by domain name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          <div className="flex gap-2">
            {[
              { id: "info", label: "Healthy", color: "green" },
              { id: "warning", label: "Warning", color: "amber" },
              { id: "error", label: "Critical", color: "red" },
            ].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() =>
                  setFilterLevel((prev) =>
                    prev.includes(l.id)
                      ? prev.filter((i) => i !== l.id)
                      : [...prev, l.id],
                  )
                }
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border",
                  filterLevel.includes(l.id)
                    ? {
                        "bg-green-100 text-green-700 border-green-200":
                          l.id === "info",
                        "bg-amber-100 text-amber-700 border-amber-200":
                          l.id === "warning",
                        "bg-red-100 text-red-700 border-red-200":
                          l.id === "error",
                      }
                    : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 pb-20">
        {Object.entries(groupedSites).length > 0 ? (
          Object.entries(groupedSites).map(([group, apps]) => (
            <VirtualizedGroupSection key={group} group={group} apps={apps} />
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="p-6 bg-slate-50 rounded-full">
              <Search className="w-10 h-10 text-slate-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                No matching status checks
              </h3>
              <p className="text-sm text-slate-400">
                Try adjusting your filters or search terms.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setFilterLevel([]);
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
