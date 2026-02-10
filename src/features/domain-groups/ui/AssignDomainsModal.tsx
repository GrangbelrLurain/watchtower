import { Link } from "@tanstack/react-router";
import { Check, Globe, Loader2Icon } from "lucide-react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import { Button } from "@/shared/ui/button/Button";
import { Modal } from "@/shared/ui/modal/Modal";

export interface AssignDomainsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: DomainGroup | null;
  domains: Domain[];
  visibleDomains: Domain[];
  selectedIds: Set<number>;
  isSaving: boolean;
  onToggle: (domainId: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSave: () => void;
}

export function AssignDomainsModal({
  isOpen,
  onClose,
  group,
  domains,
  visibleDomains,
  selectedIds,
  isSaving,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onSave,
}: AssignDomainsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header
        title={group ? `Domains in ${group.name}` : ""}
        description="Select domains to include in this group. Changes are saved when you click Save."
      />
      <Modal.Body className="max-h-[400px]">
        {domains.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">
            No domains yet.{" "}
            <Link
              to="/domains/regist"
              className="text-indigo-600 hover:underline"
            >
              Add domains
            </Link>{" "}
            first.
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-2">
              this group's domains or domains not in this group are displayed
            </p>
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onSelectAll}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onDeselectAll}
              >
                Deselect all
              </Button>
              <span className="text-xs text-slate-400 self-center">
                {visibleDomains.length} domains, {selectedIds.size} selected
              </span>
            </div>
            <ul className="space-y-1">
              {visibleDomains.map((d) => {
                const checked = selectedIds.has(d.id);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => onToggle(d.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-left"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded border border-slate-300 bg-white shrink-0">
                        {checked ? (
                          <Check className="w-3 h-3 text-indigo-600" />
                        ) : null}
                      </span>
                      <Globe className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="text-sm font-mono text-slate-700 truncate flex-1">
                        {d.url}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={isSaving || visibleDomains.length === 0}
        >
          {isSaving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
