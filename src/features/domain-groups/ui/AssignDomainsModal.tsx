import { Link } from "@tanstack/react-router";
import { Check, Globe, Loader2Icon } from "lucide-react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import { Button } from "@/shared/ui/button/Button";
import { Modal } from "@/shared/ui/modal/Modal";

export interface AssignDomainsModalTranslations {
  title: (groupName: string) => string;
  desc: string;
  noDomainsText: string;
  addLink: string;
  first: string;
  info: string;
  stats: (total: number, selected: number) => string;
  selectAll: string;
  deselectAll: string;
  cancel: string;
  save: string;
}

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
  translations: AssignDomainsModalTranslations;
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
  translations,
}: AssignDomainsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header title={group ? translations.title(group.name) : ""} description={translations.desc} />
      <Modal.Body className="max-h-[400px] no-scrollbar">
        {domains.length === 0 ? (
          <p className="text-sm text-base-content/40 py-8 text-center font-medium italic">
            {translations.noDomainsText}{" "}
            <Link to="/domains/regist" className="text-primary hover:underline font-bold">
              {translations.addLink}
            </Link>{" "}
            {translations.first}
          </p>
        ) : (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-4">
              {translations.info}
            </p>
            <div className="flex gap-2 mb-4 bg-base-200/50 p-2 rounded-2xl border border-base-300/50">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onSelectAll}
                className="text-[10px] font-black uppercase tracking-tighter h-8"
              >
                {translations.selectAll}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onDeselectAll}
                className="text-[10px] font-black uppercase tracking-tighter h-8"
              >
                {translations.deselectAll}
              </Button>
              <div className="flex-1" />
              <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40 self-center mr-2">
                {translations.stats(visibleDomains.length, selectedIds.size)}
              </span>
            </div>
            <ul className="space-y-2 mb-4">
              {visibleDomains.map((d) => {
                const checked = selectedIds.has(d.id);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => onToggle(d.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all text-left group ${
                        checked ? "bg-primary/5 border-primary/30" : "bg-base-100 border-base-300 hover:bg-base-200"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-lg border transition-all shrink-0 ${
                          checked
                            ? "bg-primary border-primary text-primary-content"
                            : "bg-base-200 border-base-300 group-hover:border-primary/30"
                        }`}
                      >
                        {checked ? <Check className="w-4 h-4" /> : null}
                      </span>
                      <Globe
                        className={`w-4 h-4 shrink-0 transition-colors ${checked ? "text-primary" : "text-base-content/20"}`}
                      />
                      <span
                        className={`text-sm font-mono truncate flex-1 tracking-tight ${checked ? "text-base-content font-bold" : "text-base-content/60"}`}
                      >
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
        <Button variant="secondary" onClick={onClose} className="font-bold tracking-tight">
          {translations.cancel}
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={isSaving || visibleDomains.length === 0}
          className="font-black uppercase tracking-widest text-xs px-8 shadow-lg shadow-primary/20"
        >
          {isSaving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : translations.save}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
