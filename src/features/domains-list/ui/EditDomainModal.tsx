import { Check, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import { Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/input/Input";
import { Modal } from "@/shared/ui/modal/Modal";

export interface EditDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: Domain | null;
  groups: DomainGroup[];
  selectedGroupIds: number[];
  onSave: (domain: Domain, updates: { url?: string; groupId?: number | null }) => void;
}

export function EditDomainModal({ isOpen, onClose, domain, groups, selectedGroupIds, onSave }: EditDomainModalProps) {
  const [urlInput, setUrlInput] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && domain) {
      setUrlInput(domain.url);
      setSelectedGroupId(selectedGroupIds[0] ?? null);
    }
  }, [isOpen, domain, selectedGroupIds]);

  const handleSave = () => {
    if (!domain) {
      return;
    }
    const urlTrimmed = urlInput.trim();
    const urlChanged = urlTrimmed !== domain.url;
    const groupChanged = selectedGroupId !== (selectedGroupIds[0] ?? null);
    if (urlChanged || groupChanged) {
      onSave(domain, {
        ...(urlChanged ? { url: urlTrimmed } : {}),
        ...(groupChanged ? { groupId: selectedGroupId } : {}),
      });
    }
    onClose();
  };

  const urlChanged = domain && urlInput.trim() !== domain.url;
  const groupChanged = domain && selectedGroupId !== (selectedGroupIds[0] ?? null);
  const canSave = Boolean(domain && (urlChanged || groupChanged));

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header
        title="Domain settings"
        description={domain ? `Edit address and group for this domain` : undefined}
      />
      <Modal.Body className="space-y-6">
        {domain && (
          <>
            <div>
              <label htmlFor="edit-domain-url" className="block text-xs font-medium text-slate-500 mb-1.5">
                Address (URL)
              </label>
              <Input
                id="edit-domain-url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-2">Group</span>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupId(null)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className={selectedGroupId === null ? "text-indigo-600" : "text-slate-300"}>
                      {selectedGroupId === null ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="w-4 h-4 inline-block" />
                      )}
                    </span>
                    <span className="text-sm font-medium text-slate-700">No group</span>
                  </button>
                </li>
                {groups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(g.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className={selectedGroupId === g.id ? "text-indigo-600" : "text-slate-300"}>
                        {selectedGroupId === g.id ? (
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
              {groups.length === 0 && (
                <p className="text-sm text-slate-400 py-2">No groups yet. Create one on the Groups page.</p>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
