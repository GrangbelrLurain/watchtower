import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import clsx from "clsx";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DomainStatus } from "@/entities/domain/types/domain_status";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";

export const Route = createFileRoute("/domains/status/logs")({
  component: StatusLogs,
});

function StatusLogs() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [logs, setLogs] = useState<DomainStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async (targetDate: string) => {
    setLoading(true);
    try {
      const response = await invoke<{ success: boolean; data: DomainStatus[] }>(
        "get_domain_status_logs",
        { date: targetDate },
      );
      if (response.success) {
        setLogs(response.data.reverse());
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(date);
  }, [date, fetchLogs]);

  const changeDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate.toISOString().split("T")[0]);
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.url.toLowerCase().includes(search.toLowerCase()) ||
      log.group.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading && logs.length === 0) {
    return <LoadingScreen onCancel={() => setLoading(false)} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Status History
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Review detailed status logs for all domains.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => changeDate(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm font-bold text-slate-700 outline-none bg-transparent"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => changeDate(1)}
            disabled={date === new Date().toISOString().split("T")[0]}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <Card className="p-4 bg-white/50 backdrop-blur-sm border-slate-200">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by URL or Group..."
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Time
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Domain
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Latency
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">
                  Level
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <FileText className="w-10 h-10 text-slate-300" />
                      <p className="text-sm font-medium text-slate-400">
                        No logs found for this date.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr
                    key={`${log.url}-${log.timestamp}-${i}`}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour12: false,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">
                          {log.url}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {log.group}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "text-xs font-bold",
                          log.ok ? "text-green-600" : "text-rose-600",
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-600 tabular-nums">
                        {log.latency}ms
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge
                        variant={{
                          color:
                            log.level === "error"
                              ? "red"
                              : log.level === "warning"
                                ? "amber"
                                : "green",
                        }}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
