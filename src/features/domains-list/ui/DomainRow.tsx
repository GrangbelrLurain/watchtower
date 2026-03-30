import { ExternalLink, Globe, Pencil, Trash2 } from "lucide-react";
import type { Domain } from "@/entities/domain/types/domain";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import type { DomainFeatureState } from "./DomainFeatureBadges";
import { DomainFeatureBadges } from "./DomainFeatureBadges";

export interface DomainRowProps {
  domain: Domain;
  groupName: string;
  isUpdating: boolean;
  featureState: DomainFeatureState;
  proxyActive: boolean;
  featureT: {
    featureMonitor: string;
    featureProxy: string;
    featureApiLogging: string;
    featureOn: string;
    featureOff: string;
    featureTogglingOn: string;
    featureTogglingOff: string;
    featureProxyGlobalOff: string;
    featureProxyGlobalOffLink: string;
    proxyRouteModalTitle: string;
    proxyRouteModalDesc: (domain: string) => string;
    proxyRouteTargetHost: string;
    proxyRouteTargetPort: string;
    proxyRouteAdd: string;
    proxyRouteCancel: string;
    proxyRouteAdding: string;
  };
  onSelectGroup: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefreshFeatures: () => void;
}

export function DomainRow({
  domain,
  groupName,
  isUpdating,
  featureState,
  proxyActive,
  featureT,
  onSelectGroup,
  onEdit,
  onDelete,
  onRefreshFeatures,
}: DomainRowProps) {
  return (
    <div className="group flex flex-col p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200">
      {/* Top row: icon + URL + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <span className="truncate max-w-[260px]">{domain.url}</span>
              <a
                href={domain.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 hover:text-blue-500 transition-colors shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-[10px] text-slate-400 font-mono">ID: {domain.id}</p>
              <button
                type="button"
                onClick={onSelectGroup}
                disabled={isUpdating}
                className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded-full"
              >
                <Badge
                  variant={{ color: "slate" }}
                  className="text-[10px] font-medium py-0.5 px-2 cursor-pointer hover:bg-slate-200/80 transition-colors"
                >
                  {groupName}
                </Badge>
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="secondary" size="icon" title="Edit domain" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="danger" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Feature badges row */}
      <DomainFeatureBadges
        domainId={domain.id}
        domainUrl={domain.url}
        state={featureState}
        proxyActive={proxyActive}
        t={featureT}
        onRefresh={onRefreshFeatures}
      />
    </div>
  );
}
