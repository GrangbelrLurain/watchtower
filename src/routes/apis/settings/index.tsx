import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
  Wifi,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { languageAtom } from "@/domain/i18n/store";
import type { Domain } from "@/entities/domain/types/domain";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";
import { en } from "./en";
import { ko } from "./ko";
import { apiSettingsSearchAtom } from "./store";

export const Route = createFileRoute("/apis/settings/")({
  component: ApisSettingsPage,
});

// ── ListItem (컴포넌트 바깥 → 리렌더 시 스크롤 유지) ──
function ListItem({ domain, selected, onToggle }: { domain: Domain; selected: boolean; onToggle: () => void }) {
  return (
    <label
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        selected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
      />
      <span className="text-sm font-medium text-slate-700 truncate flex-1">{domain.url}</span>
    </label>
  );
}

// ── GroupSection ──
function GroupSection({
  groupName,
  domains,
  selectedIds,
  onToggleItem,
}: {
  groupName: string;
  domains: Domain[];
  selectedIds: Set<number>;
  onToggleItem: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const allSelected = domains.length > 0 && domains.every((d) => selectedIds.has(d.id));
  const someSelected = domains.some((d) => selectedIds.has(d.id));

  const handleGroupToggle = () => {
    if (allSelected) {
      for (const d of domains) {
        if (selectedIds.has(d.id)) {
          onToggleItem(d.id);
        }
      }
    } else {
      for (const d of domains) {
        if (!selectedIds.has(d.id)) {
          onToggleItem(d.id);
        }
      }
    }
  };

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 py-1.5 px-1">
        <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) {
              el.indeterminate = someSelected && !allSelected;
            }
          }}
          onChange={handleGroupToggle}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
        />
        <span className="text-xs font-semibold text-slate-600 select-none">{groupName}</span>
        <span className="text-[10px] text-slate-400">({domains.length})</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-1 pl-5">
          {domains.map((d) => (
            <ListItem key={d.id} domain={d} selected={selectedIds.has(d.id)} onToggle={() => onToggleItem(d.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

import {
  globalApiLoggingLinksAtom,
  globalDomainsAtom,
  globalGroupsAtom,
  globalLinksAtom,
} from "@/domain/global-data/store";

// ── Main ──
function ApisSettingsPage() {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;
  const [domains, setDomains] = useAtom(globalDomainsAtom);
  const [links, setLinks] = useAtom(globalApiLoggingLinksAtom);
  const [groups, setGroups] = useAtom(globalGroupsAtom);
  const [groupLinks, setGroupLinks] = useAtom(globalLinksAtom);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useAtom(apiSettingsSearchAtom);
  const [selectedRegistered, setSelectedRegistered] = useState<Set<number>>(new Set());
  const [selectedUnregistered, setSelectedUnregistered] = useState<Set<number>>(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [domRes, linkRes, grpRes, glRes] = await Promise.all([
        invokeApi("get_domains"),
        invokeApi("get_domain_api_logging_links"),
        invokeApi("get_groups"),
        invokeApi("get_domain_group_links"),
      ]);
      if (domRes.success && domRes.data) {
        setDomains(domRes.data);
      }
      if (linkRes.success && linkRes.data) {
        setLinks(linkRes.data);
      }
      if (grpRes.success && grpRes.data) {
        setGroups(grpRes.data);
      }
      if (glRes.success && glRes.data) {
        setGroupLinks(glRes.data);
      }
    } catch (e) {
      console.error("fetchAll:", e);
    } finally {
      setLoading(false);
    }
  }, [setDomains, setGroupLinks, setGroups, setLinks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const registeredIds = useMemo(() => new Set(links.map((l) => l.domainId)), [links]);

  // domainId → groupName 매핑
  const domainGroupMap = useMemo(() => {
    const idToName = new Map<number, string>();
    for (const g of groups) {
      idToName.set(g.id, g.name);
    }
    const result = new Map<number, string>();
    for (const link of groupLinks) {
      const name = idToName.get(link.group_id);
      if (name) {
        const prev = result.get(link.domain_id);
        result.set(link.domain_id, prev ? `${prev}, ${name}` : name);
      }
    }
    return result;
  }, [groups, groupLinks]);

  // 검색 필터
  const filterDomains = useCallback(
    (items: Domain[]) => {
      if (!search.trim()) {
        return items;
      }
      const q = search.trim().toLowerCase();
      return items.filter((d) => {
        const gName = domainGroupMap.get(d.id) ?? t.defaultGroup;
        return d.url.toLowerCase().includes(q) || gName.toLowerCase().includes(q);
      });
    },
    [search, domainGroupMap, t.defaultGroup],
  );

  const registered = useMemo(
    () => filterDomains(domains.filter((d) => registeredIds.has(d.id))),
    [domains, registeredIds, filterDomains],
  );
  const unregistered = useMemo(
    () => filterDomains(domains.filter((d) => !registeredIds.has(d.id))),
    [domains, registeredIds, filterDomains],
  );

  // 그룹별 분류
  const groupDomains = useCallback(
    (items: Domain[]) => {
      const grouped: Record<string, Domain[]> = {};
      for (const d of items) {
        const gName = domainGroupMap.get(d.id) ?? t.defaultGroup;
        if (!grouped[gName]) {
          grouped[gName] = [];
        }
        grouped[gName].push(d);
      }
      const keys = Object.keys(grouped).sort((a, b) => {
        if (a === t.defaultGroup) {
          return 1;
        }
        if (b === t.defaultGroup) {
          return -1;
        }
        return a.localeCompare(b);
      });
      return keys.map((k) => ({ groupName: k, domains: grouped[k] }));
    },
    [domainGroupMap, t.defaultGroup],
  );

  const registeredGroups = useMemo(() => groupDomains(registered), [groupDomains, registered]);
  const unregisteredGroups = useMemo(() => groupDomains(unregistered), [groupDomains, unregistered]);

  const toggleRegistered = useCallback((id: number) => {
    setSelectedRegistered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleUnregistered = useCallback((id: number) => {
    setSelectedUnregistered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 등록 해제 (왼쪽 → 오른쪽)
  const handleUnregister = async () => {
    const ids = Array.from(selectedRegistered);
    if (ids.length === 0) {
      return;
    }
    try {
      for (const id of ids) {
        await invokeApi("remove_domain_api_logging", { payload: { domainId: id } });
      }
      setSelectedRegistered(new Set());
      await fetchAll();
    } catch (e) {
      console.error("unregister:", e);
    }
  };

  // 등록 (오른쪽 → 왼쪽)
  const handleRegister = async () => {
    const ids = Array.from(selectedUnregistered);
    if (ids.length === 0) {
      return;
    }
    try {
      for (const id of ids) {
        await invokeApi("set_domain_api_logging", {
          payload: { domainId: id, loggingEnabled: true, bodyEnabled: false, schemaUrl: null },
        });
      }
      setSelectedUnregistered(new Set());
      await fetchAll();
    } catch (e) {
      console.error("register:", e);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <H1>{t.title}</H1>
        </div>
        <P className="text-slate-500">{t.subtitle}</P>
      </header>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder={t.searchPlaceholder}
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 등록된 도메인 */}
        <Card className="p-5 bg-white border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-800">{t.registeredTitle(registered.length)}</h2>
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedRegistered(new Set(registered.map((d) => d.id)))}
                disabled={registered.length === 0}
              >
                {t.selectAll}
              </Button>
              {selectedRegistered.size > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setSelectedRegistered(new Set())}>
                  {t.deselectAll}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3">{t.registeredSubtitle}</p>
          <div className="flex flex-col gap-0.5 max-h-[400px] overflow-y-auto grow">
            {registered.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center grow flex items-center justify-center">
                {search ? t.noSearchResults : t.noRegisteredDomains}
              </p>
            ) : (
              registeredGroups.map((g) => (
                <GroupSection
                  key={g.groupName}
                  groupName={g.groupName}
                  domains={g.domains}
                  selectedIds={selectedRegistered}
                  onToggleItem={toggleRegistered}
                />
              ))
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full gap-2 flex items-center justify-center"
            onClick={handleUnregister}
            disabled={selectedRegistered.size === 0}
          >
            <ArrowRightCircle className="w-4 h-4 shrink-0" />
            {t.unregisterSelected(selectedRegistered.size)}
          </Button>
        </Card>

        {/* 미등록 도메인 */}
        <Card className="p-5 bg-white border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-slate-400" />
              <h2 className="font-bold text-slate-800">{t.unregisteredTitle(unregistered.length)}</h2>
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedUnregistered(new Set(unregistered.map((d) => d.id)))}
                disabled={unregistered.length === 0}
              >
                {t.selectAll}
              </Button>
              {selectedUnregistered.size > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setSelectedUnregistered(new Set())}>
                  {t.deselectAll}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3">{t.unregisteredSubtitle}</p>
          <div className="flex flex-col gap-0.5 max-h-[400px] overflow-y-auto grow">
            {unregistered.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center grow flex items-center justify-center">
                {search ? t.noSearchResults : t.allDomainsRegistered}
              </p>
            ) : (
              unregisteredGroups.map((g) => (
                <GroupSection
                  key={g.groupName}
                  groupName={g.groupName}
                  domains={g.domains}
                  selectedIds={selectedUnregistered}
                  onToggleItem={toggleUnregistered}
                />
              ))
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            className="mt-4 w-full gap-2 flex items-center justify-center"
            onClick={handleRegister}
            disabled={selectedUnregistered.size === 0}
          >
            <ArrowLeftCircle className="w-4 h-4 shrink-0" />
            {t.registerSelected(selectedUnregistered.size)}
          </Button>
        </Card>
      </div>

      {loading && <p className="text-sm text-slate-500 text-center">{t.loading}</p>}
    </div>
  );
}
