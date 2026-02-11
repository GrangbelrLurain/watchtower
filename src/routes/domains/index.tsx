import { createFileRoute, Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { Download, Folder, Globe, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Domain, DomainGroupLink } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import {
  DomainListEmpty,
  EditDomainModal,
  GroupSelectModal,
  VirtualizedDomainList,
} from "@/features/domains-list/ui";
import { invokeApi } from "@/shared/api";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";

export const Route = createFileRoute("/domains/")({
  component: RouteComponent,
});

const NO_GROUP = 0 as const;

function RouteComponent() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [groups, setGroups] = useState<DomainGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroupId, setFilterGroupId] = useState<number | typeof NO_GROUP>(
    NO_GROUP,
  );
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [groupSelectDomain, setGroupSelectDomain] = useState<Domain | null>(
    null,
  );
  const [editDomain, setEditDomain] = useState<Domain | null>(null);
  const [links, setLinks] = useState<DomainGroupLink[]>([]);

  const domainGroupIds = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const l of links) {
      map.set(l.domain_id, [...(map.get(l.domain_id) ?? []), l.group_id]);
    }
    return map;
  }, [links]);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invokeApi("get_domains");
      setDomains(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch domains:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await invokeApi("get_groups");
      setGroups(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  }, []);

  const fetchLinks = useCallback(async () => {
    try {
      const response = await invokeApi("get_domain_group_links");
      setLinks(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch links:", err);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const getGroupName = useCallback(
    (domainId: number) => {
      const ids = domainGroupIds.get(domainId) ?? [];
      if (ids.length === 0) return "No group";
      const g = groups.find((x) => x.id === ids[0]);
      return g?.name ?? `Group #${ids[0]}`;
    },
    [groups, domainGroupIds],
  );

  const handleUpdateGroup = useCallback(
    async (domain: Domain, newGroupId: number | null) => {
      setUpdatingId(domain.id);
      console.log(domain.id);
      try {
        await invokeApi("set_domain_groups", {
          domainId: domain.id,
          groupIds: newGroupId != null ? [newGroupId] : [],
        });
        await fetchLinks();
      } catch (err) {
        console.error("Failed to update domain group:", err);
      } finally {
        setUpdatingId(null);
      }
    },
    [fetchLinks],
  );

  const handleDeleteDomain = useCallback(
    async (id: number) => {
      if (confirm("Are you sure you want to remove this domain?")) {
        await invokeApi("remove_domains", { id });
        fetchDomains();
      }
    },
    [fetchDomains],
  );

  const handleSaveEdit = useCallback(
    async (
      domain: Domain,
      updates: { url?: string; groupId?: number | null },
    ) => {
      setUpdatingId(domain.id);
      try {
        if (updates.url !== undefined) {
          await invokeApi("update_domain_by_id", {
            id: domain.id,
            payload: { url: updates.url },
          });
        }
        if (updates.groupId !== undefined) {
          await invokeApi("set_domain_groups", {
            domainId: domain.id,
            groupIds: updates.groupId != null ? [updates.groupId] : [],
          });
        }
        await fetchDomains();
        await fetchLinks();
      } catch (err) {
        console.error("Failed to save domain:", err);
      } finally {
        setUpdatingId(null);
        setEditDomain(null);
      }
    },
    [fetchDomains, fetchLinks],
  );

  const handleClearAll = async () => {
    if (confirm("🚨 DANGER: This will remove ALL tracked domains. Continue?")) {
      try {
        await invokeApi("clear_all_domains");
        fetchDomains();
      } catch (err) {
        console.error("Failed to clear domains:", err);
      }
    }
  };

  const downloadJson = async () => {
    if (domains.length === 0) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const path = await save({
        filters: [
          {
            name: "JSON",
            extensions: ["json"],
          },
        ],
        defaultPath: `watchtower-domains-${new Date().toISOString().slice(0, 10)}.json`,
      });

      if (path) {
        const data = JSON.stringify(domains, null, 2);
        await writeTextFile(path, data);
        alert("File saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save JSON:", err);
      const data = JSON.stringify(domains, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `watchtower-domains-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const filteredDomains = domains.filter((d) => {
    const matchesSearch = d.url
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const groupIds = domainGroupIds.get(d.id) ?? [];
    const matchesGroup =
      filterGroupId === NO_GROUP ||
      (filterGroupId === -1 && groupIds.length === 0) ||
      groupIds.includes(filterGroupId);
    return matchesSearch && matchesGroup;
  });

  const listParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredDomains.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 88 + 12, // row height + gap (gap-3)
    overscan: 10,
  });

  return (
    <div className="flex flex-col gap-8">
      <AnimatePresence>
        {loading && (
          <LoadingScreen
            key="domains-loader"
            onCancel={() => setLoading(false)}
          />
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tracked Domains
            </h1>
          </div>
          <p className="text-slate-500">
            Manage and monitor your digital infrastructure in one place.
          </p>
        </div>
        <Link to="/domains/regist">
          <Button
            variant="primary"
            className="gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 inline-block" /> Add Domain
          </Button>
        </Link>
      </header>

      <Card className="p-2 md:p-4 bg-white/50 backdrop-blur-sm border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search domains..."
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-400" />
              <select
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
                value={
                  filterGroupId === NO_GROUP
                    ? ""
                    : filterGroupId === -1
                      ? "none"
                      : filterGroupId
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setFilterGroupId(NO_GROUP);
                  else if (v === "none") setFilterGroupId(-1);
                  else setFilterGroupId(Number(v));
                }}
              >
                <option value="">All groups</option>
                <option value="none">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            {domains.length > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 h-auto py-2 flex items-center"
                  onClick={downloadJson}
                >
                  <Download className="w-4 h-4" /> Export JSON
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="gap-2 h-auto py-2 flex items-center"
                  onClick={handleClearAll}
                >
                  <Trash2 className="w-4 h-4" /> Clear All
                </Button>
              </>
            )}
            <Badge
              variant={{ color: "blue" }}
              className="flex items-center gap-2 py-2 px-4 h-auto"
            >
              Total: {domains.length}
            </Badge>
          </div>
        </div>

        {filteredDomains.length > 0 ? (
          <VirtualizedDomainList
            filteredDomains={filteredDomains}
            rowVirtualizer={rowVirtualizer}
            listParentRef={listParentRef}
            getGroupName={getGroupName}
            updatingId={updatingId}
            onSelectGroup={setGroupSelectDomain}
            onEdit={setEditDomain}
            onDelete={handleDeleteDomain}
          />
        ) : (
          <DomainListEmpty searchQuery={searchQuery} />
        )}
      </Card>

      <GroupSelectModal
        isOpen={groupSelectDomain !== null}
        onClose={() => setGroupSelectDomain(null)}
        domain={groupSelectDomain}
        groups={groups}
        selectedGroupIds={domainGroupIds.get(groupSelectDomain?.id ?? 0) ?? []}
        onSelectGroup={(domain: Domain, groupId: number | null) => {
          handleUpdateGroup(domain, groupId);
          setGroupSelectDomain(null);
        }}
      />

      <EditDomainModal
        isOpen={editDomain !== null}
        onClose={() => setEditDomain(null)}
        domain={editDomain}
        groups={groups}
        selectedGroupIds={domainGroupIds.get(editDomain?.id ?? 0) ?? []}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
