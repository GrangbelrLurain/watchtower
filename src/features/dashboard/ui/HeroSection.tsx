import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";

export interface HeroSectionProps {
  version?: string;
  translations?: {
    title: string;
    accent: string;
    description: string;
    btnDashboard: string;
    btnAdd: string;
  };
}

export function HeroSection({ version, translations }: HeroSectionProps) {
  const t = translations ?? {
    title: "Monitor Your Digital ",
    accent: "Empire",
    description:
      "Watchtower provides real-time health monitoring and performance analytics for all your domains and services. Stay ahead of downtime.",
    btnDashboard: "Go to Dashboard",
    btnAdd: "Add New Targets",
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-neutral/90 px-8 py-16 text-neutral-content shadow-2xl border border-neutral-content/5">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-2xl">
        <Badge variant={{ color: "blue" }} className="mb-6 bg-primary/20 text-primary-focus border-primary/30">
          {version ? `v${version}` : "Beta"}
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-neutral-content">
          {t.title}
          <span className="text-primary">{t.accent}</span>
        </h1>
        <p className="text-neutral-content/70 text-lg mb-8 leading-relaxed font-medium">{t.description}</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/monitor">
            <Button variant="primary" className="px-8 py-6 text-lg group shadow-xl shadow-primary/20">
              {t.btnDashboard}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform inline-block" />
            </Button>
          </Link>
          <Link to="/domains/regist">
            <Button
              variant="secondary"
              className="px-8 py-6 text-lg bg-neutral-content/10 hover:bg-neutral-content/20 border-neutral-content/10 text-neutral-content"
            >
              {t.btnAdd}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
