import { Globe, Shield, Zap } from "lucide-react";
import { Card } from "@/shared/ui/card/card";

// features logic moved inside the component for localization support

export interface FeatureGridProps {
  translations?: {
    title: string;
    subtitle: string;
    feature_1_title: string;
    feature_1_desc: string;
    feature_2_title: string;
    feature_2_desc: string;
    feature_3_title: string;
    feature_3_desc: string;
  };
}

export function FeatureGrid({ translations }: FeatureGridProps) {
  const t = translations ?? {
    title: "Advanced Capabilities",
    subtitle: "Powerful features at your fingertips.",
    feature_1_title: "Instant Proves",
    feature_1_desc: "High-frequency monitor checks with sub-millisecond precision.",
    feature_2_title: "Secure Logging",
    feature_2_desc: "Historical data stored locally in daily NDJSON archives.",
    feature_3_title: "Global Reach",
    feature_3_desc: "Monitor any HTTP/HTTPS endpoint across the world.",
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      title: t.feature_1_title,
      description: t.feature_1_desc,
    },
    {
      icon: <Shield className="w-6 h-6 text-green-500" />,
      title: t.feature_2_title,
      description: t.feature_2_desc,
    },
    {
      icon: <Globe className="w-6 h-6 text-blue-500" />,
      title: t.feature_3_title,
      description: t.feature_3_desc,
    },
  ];

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
