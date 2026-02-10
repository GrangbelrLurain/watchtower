import type { VirtualItem } from "@tanstack/react-virtual";
import type { Domain } from "@/entities/domain/types/domain";
import { DomainRow } from "./DomainRow";

export interface VirtualizedDomainListProps {
  filteredDomains: Domain[];
  rowVirtualizer: {
    getVirtualItems: () => VirtualItem[];
    getTotalSize: () => number;
    measureElement: (el: HTMLElement | null) => void;
  };
  listParentRef: React.RefObject<HTMLDivElement | null>;
  getGroupName: (domainId: number) => string;
  updatingId: number | null;
  onSelectGroup: (domain: Domain) => void;
  onEdit: (domain: Domain) => void;
  onDelete: (domainId: number) => void;
}

export function VirtualizedDomainList({
  filteredDomains,
  rowVirtualizer,
  listParentRef,
  getGroupName,
  updatingId,
  onSelectGroup,
  onEdit,
  onDelete,
}: VirtualizedDomainListProps) {
  return (
    <div
      ref={listParentRef}
      className="overflow-auto max-h-[calc(100vh-320px)] rounded-xl border border-slate-200 scrollbar-thin scrollbar-thumb-slate-200 relative"
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const domain = filteredDomains[virtualRow.index];
          return (
            <div
              key={domain.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute top-0 left-0 w-full px-2 pt-1.5 pb-4"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <DomainRow
                domain={domain}
                groupName={getGroupName(domain.id)}
                isUpdating={updatingId === domain.id}
                onSelectGroup={() => onSelectGroup(domain)}
                onEdit={() => onEdit(domain)}
                onDelete={() => onDelete(domain.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
