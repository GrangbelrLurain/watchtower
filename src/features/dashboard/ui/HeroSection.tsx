import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { H1, P } from "@/shared/ui/typography/typography";

export interface HeroSectionProps {
  version?: string;
}

export function HeroSection({ version }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-white shadow-2xl">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-2xl">
        <Badge variant={{ color: "blue" }} className="mb-6 bg-blue-500/20 text-blue-300 border-blue-500/30">
          {version ? `v${version}` : "Beta"}
        </Badge>
        <H1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
          Monitor Your Digital <span className="text-blue-400">Empire</span>
        </H1>
        <P className="text-slate-400 text-lg mb-8 leading-relaxed">
          Watchtower provides real-time health monitoring and performance analytics for all your domains and services.
          Stay ahead of downtime.
        </P>
        <div className="flex flex-wrap gap-4">
          <Link to="/status">
            <Button variant="primary" className="px-8 py-6 text-lg group shadow-xl shadow-blue-500/20">
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
  );
}
