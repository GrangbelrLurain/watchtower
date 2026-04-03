import { Activity, Clock, Globe, Shield } from "lucide-react";
import { Badge } from "@/shared/ui/badge/badge";
import { Card } from "@/shared/ui/card/card";

export interface SystemStatusCardProps {
  translations?: {
    title: string;
    healthy: string;
    issue: string;
    checking: string;
    lastCheck: string;
  };
}

export function SystemStatusCard({ translations }: SystemStatusCardProps) {
  const t = translations ?? {
    title: "System Status",
    healthy: "All Systems Operational",
    issue: "System Issues Detected",
    checking: "Checking System Health...",
    lastCheck: "Last checked at",
  };

  const stats = [
    {
      label: "Uptime",
      value: "99.98%",
      icon: <Activity className="w-4 h-4 text-primary" />,
    },
    {
      label: "Latency",
      value: "48ms",
      icon: <Clock className="w-4 h-4 text-warning" />,
    },
    {
      label: "Incidents",
      value: "0",
      icon: <Shield className="w-4 h-4 text-success" />,
    },
    {
      label: "Coverage",
      value: "100%",
      icon: <Globe className="w-4 h-4 text-secondary" />,
    },
  ];

  return (
    <Card className="p-8 bg-base-100 border-base-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-base-content tracking-tight">{t.title}</h2>
          <p className="text-sm text-base-content/40 font-bold tracking-wide uppercase">
            Monitoring active across 12 nodes
          </p>
        </div>
        <Badge
          variant={{ color: "green" }}
          className="px-4 py-1.5 animate-pulse bg-success/10 text-success border-success/20"
        >
          {t.healthy}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 p-4 rounded-2xl bg-base-200/50 border border-base-200 shadow-inner"
          >
            <div className="flex items-center gap-2 text-base-content/40">
              {stat.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
            </div>
            <span className="text-2xl font-black text-base-content tracking-tighter">{stat.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
