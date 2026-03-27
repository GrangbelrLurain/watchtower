import { Check, Folder } from "lucide-react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import { Modal } from "@/shared/ui/modal/Modal";

export interface GroupSelectModalTranslations {
  title: string;
  desc: (url: string) => string;
  noGroup: string;
  empty: string;
}

export interface GroupSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: Domain | null;
  groups: DomainGroup[];
  selectedGroupIds: number[];
  onSelectGroup: (domain: Domain, groupId: number | null) => void;
  translations: GroupSelectModalTranslations;
}

export function GroupSelectModal({
  isOpen,
  onClose,
  domain,
  groups,
  selectedGroupIds,
  onSelectGroup,
  translations,
}: GroupSelectModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header title={translations.title} description={domain ? translations.desc(domain.url) : undefined} />
      <Modal.Body className="max-h-[320px]">
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => {
                if (domain) {
                  onSelectGroup(domain, null);
                  onClose();
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors"
            >
              <span className={selectedGroupIds.length === 0 ? "text-indigo-600" : "text-slate-300"}>
                {selectedGroupIds.length === 0 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 inline-block" />
                )}
              </span>
              <span className="text-sm font-medium text-slate-700">{translations.noGroup}</span>
            </button>
          </li>
          {groups.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => {
                  if (domain) {
                    onSelectGroup(domain, g.id);
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors"
              >
                <span className={selectedGroupIds.includes(g.id) ? "text-indigo-600" : "text-slate-300"}>
                  {selectedGroupIds.includes(g.id) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 inline-block" />
                  )}
                </span>
                <Folder className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{g.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {groups.length === 0 && <p className="text-sm text-slate-400 py-4">{translations.empty}</p>}
      </Modal.Body>
    </Modal>
  );
}
