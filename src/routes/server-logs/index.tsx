import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { listen } from "@tauri-apps/api/event";
import clsx from "clsx";
import { atom, useAtom } from "jotai";
import { Copy, Pause, Play, SearchIcon, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/shared/ui/modal/Modal";

interface ServerLog {
  timestamp: string;
  level: string;
  target: string;
  message: string;
}

const MAX_LOGS = 10000;
const serverLogsAtom = atom<ServerLog[]>([]);

export const Route = createFileRoute("/server-logs/")({
  component: ServerLogsPage,
});

function ServerLogsPage() {
  const [logs, setLogs] = useAtom(serverLogsAtom);
  const [isPaused, setIsPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<ServerLog | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Keep track of pause state for listener
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const unlisten = listen<ServerLog>("server-log", (event) => {
      if (!isPausedRef.current) {
        setLogs((prev) => {
          const newLogs = [...prev, event.payload];
          if (newLogs.length > MAX_LOGS) {
            return newLogs.slice(newLogs.length - MAX_LOGS);
          }
          return newLogs;
        });
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [setLogs]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterLevel !== "ALL") {
      result = result.filter((log) => log.level === filterLevel);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (log) => log.message.toLowerCase().includes(lowerSearch) || log.target.toLowerCase().includes(lowerSearch),
      );
    }

    return result;
  }, [logs, search, filterLevel]);

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24, // height of line
    overscan: 20,
  });

  const clearLogs = () => setLogs([]);

  // Auto-scroll to bottom if not paused
  useEffect(() => {
    if (!isPaused && filteredLogs.length > 0) {
      virtualizer.scrollToIndex(filteredLogs.length - 1);
    }
  }, [filteredLogs.length, isPaused, virtualizer]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Server Logs</h1>
        <div className="flex items-center space-x-2 shrink-0">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none cursor-pointer"
          >
            <option value="ALL">All Levels</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-shadow"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={clearLogs}
            className="flex items-center px-3 py-2 bg-white border border-red-200 rounded-md hover:bg-red-50 text-sm font-medium text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0F172A] rounded-xl p-4 shadow-inner overflow-hidden flex flex-col mt-4">
        <div
          ref={parentRef}
          className="flex-1 overflow-auto rounded text-sm text-slate-300 font-mono styling-scrollbar"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const log = filteredLogs[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  onClick={() => setSelectedLog(log)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedLog(log);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex items-center space-x-3 px-2 hover:bg-slate-800 whitespace-nowrap overflow-hidden text-ellipsis transition-colors cursor-pointer"
                >
                  <span className="text-slate-500 shrink-0 w-64 text-xs font-semibold">{log.timestamp}</span>
                  <span
                    className={clsx(
                      "shrink-0 font-bold w-16 text-xs",
                      log.level === "ERROR"
                        ? "text-red-400"
                        : log.level === "WARN"
                          ? "text-amber-400"
                          : log.level === "INFO"
                            ? "text-blue-400"
                            : "text-slate-400",
                    )}
                  >
                    {log.level.padEnd(5)}
                  </span>
                  <span className="text-purple-400 shrink-0 opacity-80 min-w-32 truncate max-w-64 border-r border-slate-700 pr-3 text-xs">
                    {log.target}
                  </span>
                  <span className="text-slate-200 leading-none truncate">{log.message}</span>
                </div>
              );
            })}
            {filteredLogs.length === 0 && (
              <div className="flex items-center justify-center h-full text-slate-500 w-full mt-12 text-sm">
                No logs generated yet. Wait for events or check terminal.
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)}>
        <Modal.Header title="Log Details" description={selectedLog?.target} />
        <Modal.Body>
          <div className="flex flex-col space-y-5">
            <div className="flex gap-6">
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Level
                </span>
                <span
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-xs font-bold border",
                    selectedLog?.level === "ERROR"
                      ? "text-red-700 bg-red-50 border-red-200"
                      : selectedLog?.level === "WARN"
                        ? "text-amber-700 bg-amber-50 border-amber-200"
                        : selectedLog?.level === "INFO"
                          ? "text-blue-700 bg-blue-50 border-blue-200"
                          : "text-slate-700 bg-slate-50 border-slate-200",
                  )}
                >
                  {selectedLog?.level}
                </span>
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Timestamp
                </span>
                <span className="text-sm font-mono text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                  {selectedLog?.timestamp}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</span>
                {selectedLog && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(selectedLog.message)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </button>
                )}
              </div>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl shadow-inner max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                <LogMessageViewer message={selectedLog?.message || ""} />
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setSelectedLog(null)}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow"
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function LogMessageViewer({ message }: { message: string }) {
  // Check if it's a DNS dump (e.g., from hickory-resolver)
  if (message.includes("; header ") || message.match(/; query/)) {
    const lines = message.split("\n");
    return (
      <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          if (trimmed.startsWith(";") || trimmed.startsWith("response: ;")) {
            return (
              <div
                key={`${i}-${trimmed}`}
                className="text-slate-500 mt-3 mb-1 font-semibold border-b border-slate-700/50 pb-1"
              >
                {line}
              </div>
            );
          }

          const parts = trimmed.split(/\s+/);
          const inIndex = parts.indexOf("IN");

          if (inIndex >= 1 && parts.length > inIndex + 1) {
            const name = parts.slice(0, inIndex - 1).join(" ");
            const ttl = parts[inIndex - 1];
            const type = parts[inIndex + 1];
            const data = parts.slice(inIndex + 2).join(" ");

            return (
              <div
                key={`${i}-${trimmed}`}
                className="flex flex-wrap items-center gap-4 py-1 ml-2 text-slate-300 border-l-2 border-slate-700 pl-4 hover:bg-slate-800/50 transition-colors rounded-r-md"
              >
                <span className="text-blue-300 break-all min-w-[280px] flex-[2]" title={name}>
                  {name}
                </span>
                <span className="text-slate-500 text-xs w-12 text-right px-1 shrink-0" title="TTL">
                  {ttl}
                </span>
                <span className="text-fuchsia-400 font-bold w-24 shrink-0 px-2 bg-fuchsia-400/10 rounded">
                  IN {type}
                </span>
                <span className="text-emerald-300 break-all flex-[3] min-w-[200px]">{data}</span>
              </div>
            );
          }

          if (!trimmed) {
            return null;
          }

          return (
            <div key={`${i}-${trimmed}`} className="text-slate-300 ml-2">
              {line}
            </div>
          );
        })}
      </div>
    );
  }

  // General text highlighting for typical logs
  const highlightRegex =
    /(ERROR|WARN|INFO|DEBUG|CONNECT|GET|POST|PUT|DELETE|HTTP\/\d\.\d|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/g;
  const tokens = message.split(highlightRegex);

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all text-slate-200">
      {tokens.map((token, i) => {
        if (token === "ERROR") {
          return (
            <span key={`${i}-t`} className="text-red-400 font-bold">
              {token}
            </span>
          );
        }
        if (token === "WARN") {
          return (
            <span key={`${i}-t`} className="text-amber-400 font-bold">
              {token}
            </span>
          );
        }
        if (token === "INFO") {
          return (
            <span key={`${i}-t`} className="text-blue-400 font-bold">
              {token}
            </span>
          );
        }
        if (token === "DEBUG") {
          return (
            <span key={`${i}-t`} className="text-slate-400 font-bold">
              {token}
            </span>
          );
        }
        if (["CONNECT", "GET", "POST", "PUT", "DELETE"].includes(token)) {
          return (
            <span key={`${i}-t`} className="text-emerald-400 font-bold">
              {token}
            </span>
          );
        }
        if (token.startsWith("HTTP/")) {
          return (
            <span key={`${i}-t`} className="text-purple-400 font-bold">
              {token}
            </span>
          );
        }
        if (token.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
          return (
            <span key={`${i}-t`} className="text-cyan-400 font-bold">
              {token}
            </span>
          );
        }
        return <span key={`${i}-t`}>{token}</span>;
      })}
    </div>
  );
}
