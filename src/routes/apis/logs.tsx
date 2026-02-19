import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, FileText, GlobeIcon, History, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ApiLogEntry } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";
import { Modal } from "@/shared/ui/modal/Modal";

export const Route = createFileRoute("/apis/logs")({
  component: ApiLogs,
});

function ApiLogs() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [, setAvailableDates] = useState<string[]>([]);
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [hostFilter, setHostFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<ApiLogEntry | null>(null);
  const [clearing, setClearing] = useState(false);

  // 날짜 목록 조회
  const fetchDates = useCallback(async () => {
    try {
      const res = await invokeApi("list_api_log_dates");
      if (res.success && res.data) {
        setAvailableDates(res.data);
      }
    } catch (e) {
      console.error("list_api_log_dates:", e);
    }
  }, []);

  // 로그 목록 조회
  const fetchLogs = useCallback(
    async (targetDate: string) => {
      setLoading(true);
      try {
        const res = await invokeApi("get_api_logs", {
          payload: {
            date: targetDate,
            domainFilter: search.trim() || undefined,
            methodFilter: methodFilter || undefined,
            hostFilter: hostFilter.trim() || undefined,
          },
        });
        if (res.success && res.data) {
          setLogs(res.data);
        } else {
          setLogs([]);
        }
      } catch (e) {
        console.error("get_api_logs:", e);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [search, methodFilter, hostFilter],
  );

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  useEffect(() => {
    fetchLogs(date);
    // 폴링 대신 수동 새로고침 버튼을 두거나, 필요시 5초 주기 폴링 추가 가능
    const interval = setInterval(() => fetchLogs(date), 5000);
    return () => clearInterval(interval);
  }, [date, fetchLogs]);

  const changeDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate.toISOString().split("T")[0]);
  };

  const handleClearLogs = async (clearAll: boolean) => {
    if (!confirm(clearAll ? "모든 날짜의 로그를 삭제하시겠습니까?" : `${date} 로그를 삭제하시겠습니까?`)) {
      return;
    }
    setClearing(true);
    try {
      await invokeApi("clear_api_logs", {
        payload: clearAll ? { date: undefined } : { date },
      });
      setLogs([]);
      await fetchDates();
    } catch (e) {
      console.error("clear_api_logs:", e);
    } finally {
      setClearing(false);
    }
  };

  const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

  return (
    <div className="flex flex-col gap-6 pb-20 h-[calc(100vh-6rem)] overflow-hidden">
      <AnimatePresence>
        {loading && logs.length === 0 && <LoadingScreen key="logs-loader" onCancel={() => setLoading(false)} />}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">API Logs</h1>
          </div>
          <p className="text-slate-500 text-sm">Proxy를 통과한 API 요청/응답 이력입니다. (5초 자동 갱신)</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchLogs(date)}
            disabled={loading}
            className="gap-2 h-10 px-4"
          >
            <History className={clsx("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>

          {/* Date Navigator */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-10">
            <Button variant="secondary" size="icon" onClick={() => changeDate(-1)} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-bold text-slate-700 outline-none bg-transparent w-[110px]"
              />
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => changeDate(1)}
              disabled={date === new Date().toISOString().split("T")[0]}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="flex flex-1 gap-3">
          <Card className="p-2 bg-white border-slate-200 flex-1 flex items-center gap-3 px-4">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Filter by Path..."
              className="bg-transparent border-none outline-none text-sm w-full font-medium min-w-0 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </Card>

          <Card className="p-2 bg-white border-slate-200 flex-1 flex items-center gap-3 px-4">
            <GlobeIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Filter by Host..."
              className="bg-transparent border-none outline-none text-sm w-full font-medium min-w-0 placeholder:text-slate-400"
              value={hostFilter}
              onChange={(e) => setHostFilter(e.target.value)}
            />
            {hostFilter && (
              <button type="button" onClick={() => setHostFilter("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </Card>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
          <Button
            variant={methodFilter === "" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setMethodFilter("")}
            className="font-mono text-xs h-8"
          >
            ALL
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          {METHODS.map((m) => (
            <Button
              key={m}
              variant={methodFilter === m ? "primary" : "ghost"}
              size="sm"
              onClick={() => setMethodFilter(methodFilter === m ? "" : m)}
              className="font-mono text-xs h-8 px-2"
            >
              {m}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 h-auto"
            onClick={() => handleClearLogs(false)}
            disabled={clearing || logs.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Clear {date}
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="gap-2 h-auto"
            onClick={() => handleClearLogs(true)}
            disabled={clearing}
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="grid grid-cols-[80px_60px_1fr_120px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
          <div>Status</div>
          <div>Method</div>
          <div>URL Path</div>
          <div className="text-right">Time</div>
        </div>

        <div className="overflow-y-auto flex-1 p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-60">
              <FileText className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">{loading ? "Loading logs..." : "No logs found."}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <button
                  type="button"
                  key={log.id}
                  className="w-full grid grid-cols-[80px_60px_1fr_120px] gap-4 items-center px-6 py-3 hover:bg-slate-50 transition-colors text-left group border-l-4 border-l-transparent hover:border-l-indigo-500"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex">
                    <Badge
                      variant={{
                        color:
                          (log.status_code ?? 0) >= 500
                            ? "red"
                            : (log.status_code ?? 0) >= 400
                              ? "amber"
                              : (log.status_code ?? 0) >= 300
                                ? "blue"
                                : "green",
                        size: "sm",
                      }}
                      className="font-mono w-[50px] justify-center"
                    >
                      {log.status_code ?? "-"}
                    </Badge>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold ${
                      log.method === "GET"
                        ? "text-green-600"
                        : log.method === "POST"
                          ? "text-blue-600"
                          : log.method === "PUT"
                            ? "text-amber-600"
                            : log.method === "DELETE"
                              ? "text-red-600"
                              : "text-slate-600"
                    }`}
                  >
                    {log.method}
                  </span>

                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-slate-700 truncate font-mono" title={log.url}>
                      {log.path}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">{log.host}</span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono text-right group-hover:text-slate-600">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)}>
        <Modal.Header title="Log Details" description={selectedLog?.id} />
        <Modal.Body className="flex flex-col gap-6 py-4 max-h-[70vh] overflow-y-auto px-6">
          {selectedLog && (
            <>
              {/* Summary */}
              <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Badge variant={{ color: "slate", size: "sm" }} className="font-mono">
                    {selectedLog.method}
                  </Badge>
                  <span className="font-mono text-sm font-bold text-slate-800 break-all">{selectedLog.url}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span>
                    Status:{" "}
                    <b className={(selectedLog.status_code ?? 0) >= 400 ? "text-red-500" : "text-green-600"}>
                      {selectedLog.status_code ?? "-"}
                    </b>
                  </span>
                  <span>Time: {new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Request Headers */}
              {selectedLog.request_headers && Object.keys(selectedLog.request_headers).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Request Headers</h3>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <tbody>
                        {Object.entries(selectedLog.request_headers).map(([k, v]) => (
                          <tr key={k}>
                            <td className="text-slate-500 pr-3 py-0.5 select-all whitespace-nowrap align-top">{k}:</td>
                            <td className="text-slate-800 py-0.5 select-all break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request Body */}
              {selectedLog.request_body && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Request Body</h3>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-x-auto max-h-48 relative group">
                    <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-all">
                      {selectedLog.request_body}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response Headers */}
              {selectedLog.response_headers && Object.keys(selectedLog.response_headers).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-t border-slate-100 pt-4 mt-2">
                    Response Headers
                  </h3>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <tbody>
                        {Object.entries(selectedLog.response_headers).map(([k, v]) => (
                          <tr key={k}>
                            <td className="text-slate-500 pr-3 py-0.5 select-all whitespace-nowrap align-top">{k}:</td>
                            <td className="text-slate-800 py-0.5 select-all break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Response Body */}
              {selectedLog.response_body && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Response Body</h3>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-x-auto max-h-60">
                    <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-all">
                      {selectedLog.response_body}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedLog(null)} className="w-full sm:w-auto">
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
