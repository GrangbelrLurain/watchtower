import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { Grid, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { globalDomainsAtom, globalGroupsAtom, globalLinksAtom } from "@/domain/global-data/store";
import { languageAtom } from "@/domain/i18n/store";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import { AssignDomainsModal, CreateGroupCard, EditGroupModal, GroupCard } from "@/features/domain-groups/ui";
import { invokeApi } from "@/shared/api";
import { ConfirmModal } from "@/shared/ui/modal/ConfirmModal";
import { H1, P } from "@/shared/ui/typography/typography";
import { en } from "./en";
import { ko } from "./ko";

const MAX_DOMAINS_PREVIEW = 4;

function DomainGroups() {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;
  const [groups, setGroups] = useAtom(globalGroupsAtom);
  const [domains, setDomains] = useAtom(globalDomainsAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [assignModalGroup, setAssignModalGroup] = useState<DomainGroup | null>(null);
  const [selectedDomainIds, setSelectedDomainIds] = useState<Set<number>>(() => new Set());
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [links, setLinks] = useAtom(globalLinksAtom);
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);
  const [editGroup, setEditGroup] = useState<DomainGroup | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const domainIdsByGroupId = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const l of links) {
      const arr = map.get(l.group_id) ?? [];
      arr.push(l.domain_id);
      map.set(l.group_id, arr);
    }
    return map;
  }, [links]);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invokeApi("get_groups");
      if (response.success) {
        setGroups(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setGroups]);

  const fetchDomains = useCallback(async () => {
    try {
      const response = await invokeApi("get_domains");
      setDomains(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch domains:", err);
    }
  }, [setDomains]);

  const fetchLinks = useCallback(async () => {
    try {
      const response = await invokeApi("get_domain_group_links");
      setLinks(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch links:", err);
    }
  }, [setLinks]);

  const getDomainsInGroup = useCallback(
    (groupId: number): Domain[] => {
      const ids = domainIdsByGroupId.get(groupId) ?? [];
      return ids.map((id) => domains.find((d) => d.id === id)).filter((d): d is Domain => d != null);
    },
    [domains, domainIdsByGroupId],
  );

  /** 모달에서 표시할 도메인: 이 그룹 소속 또는 무소속만 */
  const visibleDomainsInAssignModal = useMemo(() => {
    if (!assignModalGroup) {
      return [];
    }
    return domains.filter((d) => {
      const inThisGroup = domainIdsByGroupId.get(assignModalGroup.id)?.includes(d.id);
      const inNoGroup = !links.some((l) => l.domain_id === d.id);
      return inThisGroup || inNoGroup;
    });
  }, [domains, links, domainIdsByGroupId, assignModalGroup]);

  const handleSelectAllInModal = () => {
    setSelectedDomainIds(new Set(visibleDomainsInAssignModal.map((d) => d.id)));
  };

  const handleDeselectAllInModal = () => {
    setSelectedDomainIds(new Set());
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      return;
    }
    setIsCreating(true);
    try {
      const response = await invokeApi("create_group", {
        payload: { name: newGroupName.trim() },
      });
      if (response.success) {
        setGroups(response.data);
        setNewGroupName("");
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteGroup = async (id: number) => {
    try {
      const response = await invokeApi("delete_group", { payload: { id } });
      if (response.success) {
        setGroups(response.data);
        await fetchLinks();
      }
      if (assignModalGroup?.id === id) {
        setAssignModalGroup(null);
      }
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const updateGroupName = async (id: number, name: string) => {
    setIsUpdating(true);
    try {
      const response = await invokeApi("update_group", { payload: { id, name } });
      if (response.success) {
        setGroups(response.data);
        setEditGroup(null);
      }
    } catch (err) {
      console.error("Failed to update group name:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const openAssignModal = (group: DomainGroup) => {
    setAssignModalGroup(group);
    const domainIds = domainIdsByGroupId.get(group.id) ?? [];
    setSelectedDomainIds(new Set(domainIds));
  };

  const closeAssignModal = () => {
    setAssignModalGroup(null);
    setSelectedDomainIds(new Set());
  };

  const toggleDomainInSelection = (domainId: number) => {
    setSelectedDomainIds((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const saveAssignDomains = async () => {
    if (!assignModalGroup) {
      return;
    }
    setIsSavingAssign(true);
    try {
      await invokeApi("set_group_domains", {
        payload: {
          groupId: assignModalGroup.id,
          domainIds: Array.from(selectedDomainIds),
        },
      });
      await fetchLinks();
      closeAssignModal();
    } catch (err) {
      console.error("Failed to save domain assignments:", err);
    } finally {
      setIsSavingAssign(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return (
    <div className="flex flex-col gap-8 max-w-5xl pb-20">
      <header className="flex items-end justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
              <Grid className="w-5 h-5" />
            </div>
            <H1 className="text-3xl font-black tracking-tight text-base-content">{t.title}</H1>
          </div>
          <P className="text-base-content/60 text-sm font-medium">{t.subtitle}</P>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CreateGroupCard
            value={newGroupName}
            onChange={setNewGroupName}
            onCreate={createGroup}
            isCreating={isCreating}
            translations={{
              title: t.cardCreateTitle,
              placeholder: t.cardCreatePlaceholder,
              btn: t.cardCreateBtn,
            }}
          />
        </motion.div>

        {isLoading ? (
          <div className="md:col-span-2 flex items-center justify-center p-12">
            <Loader2Icon className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {groups.map((group, index) => {
              const groupDomains = getDomainsInGroup(group.id);
              const preview = groupDomains.slice(0, MAX_DOMAINS_PREVIEW);
              const restCount = groupDomains.length - preview.length;
              return (
                <motion.div
                  key={group.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GroupCard
                    group={group}
                    domainPreview={preview}
                    restCount={restCount}
                    onOpenAssign={() => openAssignModal(group)}
                    onEdit={() => setEditGroup(group)}
                    onDelete={() => setDeleteGroupId(group.id)}
                    translations={{
                      noDomains: t.cardNoDomains,
                      domainCount: t.cardDomainCount,
                      moreCount: t.cardMoreCount,
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {!isLoading && groups.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-base-100 border border-base-300 rounded-3xl p-20 flex flex-col items-center justify-center text-center shadow-xl"
        >
          <div className="w-20 h-20 bg-base-200 text-base-content/20 rounded-full flex items-center justify-center mb-6">
            <Grid className="w-10 h-10" />
          </div>
          <H1 className="text-base-content/40 mb-2 font-black uppercase tracking-tight">{t.noGroupsYet}</H1>
          <P className="text-base-content/30 max-w-xs mx-auto font-medium">{t.noGroupsDesc}</P>
        </motion.div>
      )}

      <AssignDomainsModal
        isOpen={assignModalGroup !== null}
        onClose={closeAssignModal}
        group={assignModalGroup}
        domains={domains}
        visibleDomains={visibleDomainsInAssignModal}
        selectedIds={selectedDomainIds}
        isSaving={isSavingAssign}
        onToggle={toggleDomainInSelection}
        onSelectAll={handleSelectAllInModal}
        onDeselectAll={handleDeselectAllInModal}
        onSave={saveAssignDomains}
        translations={{
          title: t.assignModalTitle,
          desc: t.assignModalDesc,
          noDomainsText: t.assignModalNoDomainsText,
          addLink: t.assignModalAddLink,
          first: t.assignModalFirst,
          info: t.assignModalInfo,
          stats: t.assignModalStats,
          selectAll: t.assignModalSelectAll,
          deselectAll: t.assignModalDeselectAll,
          cancel: t.assignModalCancel,
          save: t.assignModalSave,
        }}
      />
      <ConfirmModal
        isOpen={deleteGroupId !== null}
        onClose={() => setDeleteGroupId(null)}
        onConfirm={() => deleteGroupId && deleteGroup(deleteGroupId)}
        title={t.confirmDeleteTitle}
        message={t.confirmDelete}
        confirmText={t.confirmDeleteAction}
        cancelText={t.assignModalCancel}
        type="danger"
      />

      <EditGroupModal
        isOpen={editGroup !== null}
        onClose={() => setEditGroup(null)}
        group={editGroup}
        onSave={updateGroupName}
        isSaving={isUpdating}
        translations={{
          title: t.editModalTitle,
          placeholder: t.cardCreatePlaceholder,
          cancel: t.assignModalCancel,
          save: t.assignModalSave,
        }}
      />
    </div>
  );
}

export const Route = createFileRoute("/domains/groups/")({
  component: DomainGroups,
});
