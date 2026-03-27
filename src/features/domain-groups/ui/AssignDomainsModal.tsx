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
      <Modal.Body className="max-h-[400px]">
        {domains.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">
            {translations.noDomainsText}{" "}
            <Link to="/domains/regist" className="text-indigo-600 hover:underline">
              {translations.addLink}
            </Link>{" "}
            {translations.first}
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-2">{translations.info}</p>
            <div className="flex gap-2 mb-3">
              <Button type="button" variant="secondary" size="sm" onClick={onSelectAll}>
                {translations.selectAll}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={onDeselectAll}>
                {translations.deselectAll}
              </Button>
              <span className="text-xs text-slate-400 self-center">
                {translations.stats(visibleDomains.length, selectedIds.size)}
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
                        {checked ? <Check className="w-3 h-3 text-indigo-600" /> : null}
                      </span>
                      <Globe className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="text-sm font-mono text-slate-700 truncate flex-1">{d.url}</span>
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
          {translations.cancel}
        </Button>
        <Button variant="primary" onClick={onSave} disabled={isSaving || visibleDomains.length === 0}>
          {isSaving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : translations.save}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
