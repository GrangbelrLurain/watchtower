import { ExternalLink, FolderPlus, Globe, Pencil, Trash2 } from "lucide-react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import { Badge } from "@/shared/ui/badge/badge";
import { Card } from "@/shared/ui/card/card";

export interface GroupCardProps {
  group: DomainGroup;
  domainPreview: Domain[];
  restCount: number;
  onOpenAssign: () => void;
  onDelete: () => void;
}

export function GroupCard({ group, domainPreview, restCount, onOpenAssign, onDelete }: GroupCardProps) {
  const totalCount = domainPreview.length + restCount;

  return (
    <Card className="p-6 flex flex-col min-h-[200px] border-indigo-100 hover:border-indigo-300 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-50/50 transition-colors" />

      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-md">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-black text-slate-800 tracking-tight">{group.name}</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium ml-8">ID: {group.id}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenAssign}
            className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded-lg"
          >
            <Badge variant={{ color: "blue" }} className="cursor-pointer hover:bg-indigo-200/80 transition-colors">
              {totalCount} domain{totalCount !== 1 ? "s" : ""}
            </Badge>
          </button>
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            WM-{group.id.toString().padStart(3, "0")}
          </div>
        </div>
        {totalCount > 0 ? (
          <ul className="space-y-1.5 mt-1">
            {domainPreview.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-slate-300 shrink-0" />
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-slate-600 hover:text-indigo-600 truncate"
                >
                  {d.url}
                </a>
                <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />
              </li>
            ))}
            {restCount > 0 && <li className="text-[11px] text-slate-400 font-medium pl-5">+{restCount} more</li>}
          </ul>
        ) : (
          <button
            type="button"
            onClick={onOpenAssign}
            className="text-left text-xs text-slate-400 mt-1 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded"
          >
            No domains assigned. Click to select domains for this group.
          </button>
        )}
      </div>
    </Card>
  );
}
