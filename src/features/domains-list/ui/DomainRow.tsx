import {
  ExternalLink,
  Globe,
  MoreVertical,
  Settings2,
  Trash2,
} from "lucide-react";
import type { Domain } from "@/entities/domain/types/domain";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";

export interface DomainRowProps {
  domain: Domain;
  groupName: string;
  isUpdating: boolean;
  onSelectGroup: () => void;
  onDelete: () => void;
}

export function DomainRow({
  domain,
  groupName,
  isUpdating,
  onSelectGroup,
  onDelete,
}: DomainRowProps) {
  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4 mb-4 sm:mb-0">
        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {domain.url}
            <a
              href={domain.url}
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 hover:text-blue-500 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-400 font-mono">ID: {domain.id}</p>
            <button
              type="button"
              onClick={onSelectGroup}
              disabled={isUpdating}
              className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded-full w-max h-[15px] flex items-center justify-center"
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

      <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live Status
        </div>

        <div className="h-8 w-px bg-slate-100 hidden sm:block mx-1" />

        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0 rounded-lg"
            title="Change group"
            onClick={onSelectGroup}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="h-9 w-9 p-0 rounded-lg"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="sm:hidden">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
