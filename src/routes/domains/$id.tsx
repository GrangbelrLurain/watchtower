import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeft, Globe, ShieldCheck, Clock, AlertCircle, BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainStatusLog } from "@/entities/domain/types/domain_monitor";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { H1, P } from "@/shared/ui/typography/typography";
import { Badge } from "@/shared/ui/badge/badge";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/domains/$id")({
  component: DomainDetailPage,
});

function DomainDetailPage() {
  const { id } = Route.useParams();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [logs, setLogs] = useState<DomainStatusLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDomain = useCallback(async () => {
    try {
      const res = await invokeApi("get_domain_by_id", { payload: { id: Number(id) } });
      if (res.success) {
        setDomain(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  const fetchLogs = useCallback(async () => {
    if (!domain) return;
    try {
      // Fetch logs for today
      const today = new Date().toISOString().slice(0, 10);
      const res = await invokeApi("get_domain_status_logs", { payload: { date: today } });
      if (res.success) {
        // Filter logs for this domain URL
        const filtered = (res.data ?? []).filter(l => l.url === domain.url);
        setLogs(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  useEffect(() => {
    if (domain) fetchLogs();
  }, [domain, fetchLogs]);

  if (!domain && !loading) {
    return <div className="p-8 text-center text-slate-500">Domain not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header>
        <Link to="/domains/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <H1>{domain?.url}</H1>
              <P className="text-slate-500">Domain ID: #{id}</P>
            </div>
          </div>
          <div className="flex gap-2">
             <Button variant="secondary" size="sm" onClick={() => fetchLogs()} className="gap-2">
               <Activity className="w-4 h-4" />
               Refresh Stats
             </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-slate-200">
           <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
             <ShieldCheck className="w-3.5 h-3.5" />
             Current Status
           </div>
           <div className="flex items-end gap-2">
             <span className={`text-3xl font-bold ${logs[0]?.ok ? "text-green-600" : "text-red-600"}`}>
               {logs[0]?.status ?? "N/A"}
             </span>
             <span className="text-sm text-slate-400 mb-1">HTTP code</span>
           </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
           <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
             <Clock className="w-3.5 h-3.5" />
             Avg. Latency
           </div>
           <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-slate-800">
               {logs.length > 0 ? Math.round(logs.reduce((a, b) => a + b.latency, 0) / logs.length) : 0}
             </span>
             <span className="text-sm text-slate-400 mb-1">ms (today)</span>
           </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
           <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
             <Activity className="w-3.5 h-3.5" />
             Checks Today
           </div>
           <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-indigo-600">{logs.length}</span>
             <span className="text-sm text-slate-400 mb-1">total requests</span>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border-slate-200 h-64 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Latency Trend
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">last {logs.length} checks</span>
          </div>
          <div className="flex-1 flex items-end gap-1 px-2 pb-2">
            {logs.slice(0, 50).reverse().map((l, i) => {
              const height = Math.min(100, (l.latency / 2000) * 100); // normalized to 2s
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[2px] rounded-t-sm transition-all hover:opacity-70 cursor-pointer ${l.ok ? "bg-indigo-400" : "bg-red-400"}`}
                  style={{ height: `${height}%` }}
                  title={`${l.latency}ms at ${new Date(l.timestamp).toLocaleTimeString()}`}
                />
              );
            })}
            {logs.length === 0 && <div className="w-full text-center text-slate-300 text-sm italic py-10">No data</div>}
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
             <AlertCircle className="w-4 h-4 text-amber-500" />
             Performance Insights
          </h3>
          <ul className="space-y-3">
             <li className="flex justify-between text-xs border-b border-slate-50 pb-2">
               <span className="text-slate-500">Max Latency</span>
               <span className="font-mono font-bold text-slate-700">{logs.length > 0 ? Math.max(...logs.map(l => l.latency)) : 0}ms</span>
             </li>
             <li className="flex justify-between text-xs border-b border-slate-50 pb-2">
               <span className="text-slate-500">Min Latency</span>
               <span className="font-mono font-bold text-slate-700">{logs.length > 0 ? Math.min(...logs.map(l => l.latency)) : 0}ms</span>
             </li>
             <li className="flex justify-between text-xs border-b border-slate-50 pb-2">
               <span className="text-slate-500">Uptime (Today)</span>
               <span className="font-mono font-bold text-green-600">
                 {logs.length > 0 ? ((logs.filter(l => l.ok).length / logs.length) * 100).toFixed(1) : 0}%
               </span>
             </li>
             <li className="flex justify-between text-xs border-b border-slate-50 pb-2">
               <span className="text-slate-500">Recursive Check</span>
               <Badge variant={{ color: "gray", size: "sm" }}>Planned</Badge>
             </li>
             <li className="flex justify-between text-xs">
               <span className="text-slate-500">Web Vitals (LCP)</span>
               <Badge variant={{ color: "gray", size: "sm" }}>Planned</Badge>
             </li>
          </ul>
        </Card>
      </div>

      <Card className="bg-white border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          Status History (Today)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
               <tr>
                 <th className="px-6 py-3">Timestamp</th>
                 <th className="px-6 py-3">Status</th>
                 <th className="px-6 py-3">Latency</th>
                 <th className="px-6 py-3">Details</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {logs.map((log, i) => (
                 <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-xs font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={{ color: log.ok ? "green" : "red", size: "sm" }}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-xs font-mono text-slate-600">
                      {log.latency}ms
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400 italic">
                      {log.errorMessage ?? "-"}
                    </td>
                 </tr>
               ))}
               {logs.length === 0 && !loading && (
                 <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                     No status logs captured yet today.
                   </td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
