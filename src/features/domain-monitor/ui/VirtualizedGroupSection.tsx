import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { ChevronRight, ExternalLink, Grid2X2 } from "lucide-react";
import { useRef } from "react";
import type { DomainStatusLog } from "@/entities/domain/types/domain_monitor";
import { Badge } from "@/shared/ui/badge/badge";
import { Card } from "@/shared/ui/card/card";

const CARD_ROW_ESTIMATE = 160;
const ROW_GAP = 24;
const COLS = 3;

export interface VirtualizedGroupSectionProps {
  group: string;
  apps: DomainStatusLog[];
}

export function VirtualizedGroupSection({ group, apps }: VirtualizedGroupSectionProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(apps.length / COLS);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_ROW_ESTIMATE + ROW_GAP,
    overscan: 3,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between group/title">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
          <h2 className="text-xl font-bold text-slate-800">{group}</h2>
          <Badge variant={{ color: "gray" }} className="bg-slate-100 text-slate-500 border-0 font-medium">
            {apps.length} Units
          </Badge>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-200 group-hover/title:text-slate-400 transition-colors" />
      </div>

      <div
        ref={parentRef}
        className="overflow-auto max-h-[420px] rounded-xl border border-slate-100 scrollbar-thin scrollbar-thumb-slate-200 relative"
      >
        <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const start = virtualRow.index * COLS;
            const rowApps = apps.slice(start, start + COLS);
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 w-full px-1 pb-6"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rowApps.map((app) => (
                    <Card
                      key={app.url}
                      className="group relative overflow-hidden p-5 flex flex-col gap-4 hover:border-blue-200 hover:ring-2 hover:ring-blue-500/5 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 max-w-[180px]">
                            <Grid2X2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span className="text-sm font-bold text-slate-700 truncate">{app.url}</span>
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-300 hover:text-blue-500 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{app.status}</span>
                          {app.errorMessage && (
                            <span
                              className="text-[10px] italic text-rose-500 font-medium truncate max-w-[150px]"
                              title={app.errorMessage}
                            >
                              {app.errorMessage}
                            </span>
                          )}
                        </div>
                        <div
                          className={clsx(
                            "w-2.5 h-2.5 rounded-full animate-pulse",
                            app.ok
                              ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                              : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
                          )}
                        />
                      </div>

                      <div className="flex items-end justify-between mt-auto">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">
                            Latency
                          </span>
                          <span className="text-2xl font-black text-slate-700 tracking-tighter">{app.latency}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={{
                              color: app.level === "error" ? "red" : app.level === "warning" ? "amber" : "green",
                            }}
                          >
                            {app.level.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="absolute -right-2 -top-2 w-12 h-12 bg-slate-50 rounded-full -z-10 opacity-50 group-hover:scale-150 transition-transform duration-500" />
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
