import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Clock, Globe, Shield, Zap } from "lucide-react";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex flex-col gap-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <Badge
            variant={{ color: "blue" }}
            className="mb-6 bg-blue-500/20 text-blue-300 border-blue-500/30"
          >
            v0.1.0 Beta
          </Badge>
          <H1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            Monitor Your Digital <span className="text-blue-400">Empire</span>
          </H1>
          <P className="text-slate-400 text-lg mb-8 leading-relaxed">
            Watchtower provides real-time health monitoring and performance
            analytics for all your domains and services. Stay ahead of downtime.
          </P>
          <div className="flex flex-wrap gap-4">
            <Link to="/domains/status">
              <Button
                variant="primary"
                className="px-8 py-6 text-lg group shadow-xl shadow-blue-500/20"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform inline-block" />
              </Button>
            </Link>
            <Link to="/domains/regist">
              <Button
                variant="secondary"
                className="px-8 py-6 text-lg bg-white/10 hover:bg-white/20 border-white/10 text-white"
              >
                Add New Targets
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: <Zap className="w-6 h-6 text-amber-500" />,
            title: "Instant Proves",
            description:
              "High-frequency status checks with sub-millisecond precision.",
          },
          {
            icon: <Shield className="w-6 h-6 text-green-500" />,
            title: "Secure Logging",
            description:
              "Historical data stored locally in daily NDJSON archives.",
          },
          {
            icon: <Globe className="w-6 h-6 text-blue-500" />,
            title: "Global Reach",
            description: "Monitor any HTTP/HTTPS endpoint across the world.",
          },
        ].map((feature, i) => (
          <Card
            key={i}
            className="p-8 border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {feature.title}
            </h3>
            <p className="text-slate-500 leading-relaxed text-sm">
              {feature.description}
            </p>
          </Card>
        ))}
      </div>

      {/* Stats Summary Area (Placeholder for real data) */}
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
          {[
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
          ].map((stat, i) => (
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
    </div>
  );
}
