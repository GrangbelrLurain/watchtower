import { Activity, Clock, Globe, Shield } from "lucide-react";
import { Badge } from "@/shared/ui/badge/badge";
import { Card } from "@/shared/ui/card/card";

const stats = [
  {
    label: "Uptime",
    value: "99.98%",
    icon: <Activity className="w-4 h-4 text-blue-500" />,
  },
  {
    label: "Latency",
    value: "48ms",
    icon: <Clock className="w-4 h-4 text-amber-500" />,
  },
  {
    label: "Incidents",
    value: "0",
    icon: <Shield className="w-4 h-4 text-green-500" />,
  },
  {
    label: "Coverage",
    value: "100%",
    icon: <Globe className="w-4 h-4 text-indigo-500" />,
  },
];

export function SystemStatusCard() {
  return (
    <Card className="p-8 bg-white border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            System Status
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            Monitoring active across 12 nodes
          </p>
        </div>
        <Badge
          variant={{ color: "green" }}
          className="px-4 py-1.5 animate-pulse"
        >
          All Systems Operational
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-400">
              {stat.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {stat.label}
              </span>
            </div>
            <span className="text-2xl font-black text-slate-800">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
