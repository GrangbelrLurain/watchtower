import { Globe, Shield, Zap } from "lucide-react";
import { Card } from "@/shared/ui/card/card";

const features = [
  {
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    title: "Instant Proves",
    description: "High-frequency monitor checks with sub-millisecond precision.",
  },
  {
    icon: <Shield className="w-6 h-6 text-green-500" />,
    title: "Secure Logging",
    description: "Historical data stored locally in daily NDJSON archives.",
  },
  {
    icon: <Globe className="w-6 h-6 text-blue-500" />,
    title: "Global Reach",
    description: "Monitor any HTTP/HTTPS endpoint across the world.",
  },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {features.map((feature, i) => (
        <Card
          key={i}
          className="p-8 border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl transition-all duration-300 group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            {feature.icon}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h3>
          <p className="text-slate-500 leading-relaxed text-sm">{feature.description}</p>
        </Card>
      ))}
    </div>
  );
}
