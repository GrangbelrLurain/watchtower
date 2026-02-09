import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Hash,
  History,
  Info,
  Search,
  Server,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DomainStatus } from "@/entities/domain/types/domain_status";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";
import { Modal } from "@/shared/ui/modal/Modal";

export const Route = createFileRoute("/domains/status/logs")({
  component: StatusLogs,
});

function StatusLogs() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [logs, setLogs] = useState<DomainStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<DomainStatus | null>(null);

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

  const filteredLogs = useMemo(() => {
    if (!search) return logs;
    const lowerSearch = search.toLowerCase();
    return logs.filter(
      (log) =>
        log.url.toLowerCase().includes(lowerSearch) ||
        log.group.toLowerCase().includes(lowerSearch),
    );
  }, [logs, search]);

  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  return (
    <div className="flex flex-col gap-6 pb-20">
      <AnimatePresence>
        {loading && logs.length === 0 && (
          <LoadingScreen key="logs-loader" onCancel={() => setLoading(false)} />
        )}
      </AnimatePresence>
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

      <div
        ref={parentRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-slate-200 relative"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-40">
            <FileText className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">
              No logs found for this date.
            </p>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-20 flex items-center bg-slate-50 border-b border-slate-100 px-6 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[120px] text-center">
                Time
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[200px] grow text-center">
                Domain
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[100px] text-center">
                Status
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[300px] text-center">
                Message
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[100px] text-center">
                Latency
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[100px] text-center">
                Level
              </div>
            </div>
            <div
              className="relative w-full min-w-[1000px]"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const log = filteredLogs[virtualRow.index];
                return (
                  <button
                    type="button"
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="absolute top-0 left-0 w-full flex items-center px-6 py-4 hover:bg-slate-50 transition-all border-b border-slate-50 cursor-pointer group/row outline-none focus-visible:bg-blue-50/30 focus-visible:ring-1 focus-visible:ring-blue-100"
                    onClick={() => setSelectedLog(log)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedLog(log);
                      }
                    }}
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="text-xs font-mono text-slate-500 whitespace-nowrap w-[120px] text-center">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour12: false,
                      })}
                    </div>
                    <div className="flex flex-col min-w-0 pr-4 w-[200px] grow text-center">
                      <span
                        className="text-sm font-bold text-slate-700 truncate block"
                        title={log.url}
                      >
                        {log.url}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium truncate block">
                        {log.group}
                      </span>
                    </div>
                    <div className="min-w-0 pr-4 w-[100px] text-center">
                      <span
                        className={clsx(
                          "text-xs font-bold truncate block",
                          log.ok ? "text-green-600" : "text-rose-600",
                        )}
                        title={log.status}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="min-w-0 pr-4 w-[300px]">
                      <span
                        className="text-[11px] text-slate-500 font-medium truncate block"
                        title={log.errorMessage}
                      >
                        {log.errorMessage || "-"}
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-600 tabular-nums whitespace-nowrap w-[100px] text-center">
                      {log.latency}ms
                    </div>
                    <div className="flex justify-center w-[100px] text-center">
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
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)}>
        <Modal.Header
          title="Log Statistics"
          description="Detailed information for this specific check."
        />
        <Modal.Body className="flex flex-col gap-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Globe className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Target Domain
                </span>
              </div>
              <span className="text-sm font-black text-slate-700 break-all">
                {selectedLog?.url}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Timestamp
                </span>
              </div>
              <span className="text-sm font-black text-slate-700">
                {selectedLog &&
                  new Date(selectedLog.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status
              </span>
              <span
                className={clsx(
                  "text-base font-black",
                  selectedLog?.ok ? "text-green-600" : "text-rose-600",
                )}
              >
                {selectedLog?.status}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Latency
              </span>
              <span className="text-base font-black text-slate-700 tracking-tight">
                {selectedLog?.latency}ms
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Level
              </span>
              <Badge
                variant={{
                  color:
                    selectedLog?.level === "error"
                      ? "red"
                      : selectedLog?.level === "warning"
                        ? "amber"
                        : "green",
                }}
              >
                {selectedLog?.level?.toUpperCase() || ""}
              </Badge>
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Info className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                System Message
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed font-mono">
              {selectedLog?.errorMessage ||
                "No additional system messages for this event."}
            </p>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-300" />
              <span className="text-xs font-bold text-slate-400">
                {selectedLog?.group}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono">
                #
                {selectedLog
                  ? Math.abs(new Date(selectedLog.timestamp).getTime() % 10000)
                  : "0000"}
              </span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setSelectedLog(null)}
            className="rounded-xl px-6"
          >
            Close Panel
          </Button>
          <Button
            onClick={() =>
              selectedLog &&
              window.open(
                selectedLog.url.startsWith("http")
                  ? selectedLog.url
                  : `https://${selectedLog.url}`,
                "_blank",
              )
            }
            className="rounded-xl px-6 shadow-xl shadow-blue-500/20"
          >
            Open URL
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
