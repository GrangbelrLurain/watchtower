import { createFileRoute, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import {
  Activity,
  ChevronRight,
  Clock,
  Search,
  Trash2,
  Globe,
  Terminal,
  ExternalLink,
  Code,
  RotateCcw
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiLogEntry } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/apis/logs")({
  component: ApiLogsPage,
});

function ApiLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await invokeApi("get_api_logs");
      if (res.success) {
        // 최신 로그가 위로 오도록 정렬
        const sorted = [...(res.data ?? [])].sort((a, b) => b.timestamp - a.timestamp);
        setLogs(sorted);
      }
    } catch (e) {
      console.error("get_api_logs:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    // 5초마다 자동 갱신
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all logs?")) return;
    try {
      const res = await invokeApi("clear_api_logs");
      if (res.success) {
        setLogs([]);
        setSelectedLogId(null);
      }
    } catch (e) {
      console.error("clear_api_logs:", e);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!search) return logs;
    const s = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.url.toLowerCase().includes(s) ||
        l.host.toLowerCase().includes(s) ||
        l.path.toLowerCase().includes(s) ||
        l.method.toLowerCase().includes(s) ||
        l.statusCode.toString().includes(s)
    );
  }, [logs, search]);

  const selectedLog = useMemo(() =>
    logs.find(l => l.id === selectedLogId),
  [logs, selectedLogId]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
      <header className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <H1>API Logs</H1>
          </div>
          <P className="text-slate-500 text-sm">
            Captured traffic from proxy and manual tests.
          </P>
        </div>
        <Button variant="danger" size="sm" onClick={handleClearLogs} className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear Logs
        </Button>
      </header>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Log List */}
        <Card className="flex-[2] flex flex-col min-w-0 bg-white border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by URL, Method, Status..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && logs.length === 0 ? (
              <div className="flex justify-center py-20 text-slate-400">Loading logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Search className="w-8 h-8 opacity-20" />
                <p className="text-sm">No logs found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-2 font-bold">Time</th>
                    <th className="px-4 py-2 font-bold">Method</th>
                    <th className="px-4 py-2 font-bold">Status</th>
                    <th className="px-4 py-2 font-bold">URL</th>
                    <th className="px-4 py-2 font-bold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      className={clsx(
                        "cursor-pointer hover:bg-slate-50 transition-colors group",
                        selectedLogId === log.id ? "bg-blue-50/50" : ""
                      )}
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          log.method === 'GET' ? "bg-green-100 text-green-700" :
                          log.method === 'POST' ? "bg-blue-100 text-blue-700" :
                          log.method === 'PUT' ? "bg-amber-100 text-amber-700" :
                          log.method === 'DELETE' ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "font-mono text-xs font-bold",
                          log.statusCode >= 200 && log.statusCode < 300 ? "text-green-600" :
                          log.statusCode >= 400 ? "text-red-600" :
                          "text-slate-600"
                        )}>
                          {log.statusCode || '---'}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-0 max-w-0">
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-medium text-slate-800 truncate">{log.path}</span>
                          <span className="text-[10px] text-slate-400 truncate">{log.host}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-mono text-slate-400">{log.elapsedMs}ms</span>
                          <ChevronRight className={clsx("w-4 h-4 text-slate-300 transition-transform", selectedLogId === log.id ? "translate-x-1 text-blue-400" : "")} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Right: Log Detail */}
        <Card className="flex-[3] flex flex-col min-w-0 bg-white border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
          {selectedLog ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
                      selectedLog.method === 'GET' ? "bg-green-100 text-green-700" :
                      selectedLog.method === 'POST' ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {selectedLog.method}
                    </span>
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold",
                      selectedLog.statusCode >= 200 && selectedLog.statusCode < 300 ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {selectedLog.statusCode}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 gap-1 text-[10px]"
                        onClick={() => navigate({ to: "/apis/schema", search: { replayLogId: selectedLog.id } })}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Replay
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 gap-1 text-[10px]"
                        onClick={async () => {
                          const res = await invokeApi("add_api_mock", {
                            payload: {
                              id: "",
                              host: selectedLog.host,
                              path: selectedLog.path,
                              method: selectedLog.method,
                              statusCode: selectedLog.statusCode,
                              responseBody: selectedLog.responseBody ?? "",
                              contentType: selectedLog.responseHeaders["content-type"] || "application/json",
                              enabled: true,
                            },
                          });
                          if (res.success) {
                            alert("Mock rule created and enabled.");
                          }
                        }}
                      >
                        <Wifi className="w-3 h-3 text-pink-500" />
                        Pin Mock
                      </Button>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        selectedLog.source === 'test' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {selectedLog.source}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-mono font-bold text-slate-800 break-all bg-white p-2 rounded border border-slate-100 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {selectedLog.url}
                  </h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
                {/* Request Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold border-l-4 border-blue-500 pl-3 py-1">
                    <Terminal className="w-4 h-4" />
                    Request
                  </div>

                  <div className="space-y-4 ml-7">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Headers</p>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {Object.entries(selectedLog.requestHeaders).map(([k, v]) => (
                          <div key={k} className="flex text-xs font-mono gap-4 py-0.5">
                            <span className="text-slate-400 w-32 shrink-0">{k}:</span>
                            <span className="text-slate-700 break-all">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedLog.requestBody && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Body</p>
                        <pre className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-60 shadow-inner">
                          {selectedLog.requestBody}
                        </pre>
                      </div>
                    )}
                  </div>
                </section>

                {/* Response Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold border-l-4 border-green-500 pl-3 py-1">
                    <ExternalLink className="w-4 h-4" />
                    Response
                  </div>

                  <div className="space-y-4 ml-7">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Headers</p>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {Object.entries(selectedLog.responseHeaders).map(([k, v]) => (
                          <div key={k} className="flex text-xs font-mono gap-4 py-0.5">
                            <span className="text-slate-400 w-32 shrink-0">{k}:</span>
                            <span className="text-slate-700 break-all">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedLog.responseBody && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Body</p>
                          <span className="text-[10px] font-mono text-slate-400">Size: {selectedLog.responseBody.length.toLocaleString()} chars</span>
                        </div>
                        <pre className="bg-slate-900 text-indigo-300 rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[500px] shadow-inner border border-slate-800">
                          {selectedLog.responseBody}
                        </pre>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
              <div className="p-6 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
                <Code className="w-12 h-12 opacity-10" />
              </div>
              <p className="text-sm font-medium">Select a log to see details</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
