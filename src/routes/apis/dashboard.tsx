import { createFileRoute } from "@tanstack/react-router";
import { Loader2Icon, Plus, Search, Trash2, Wifi } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainApiLoggingLink } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { SearchableInput } from "@/shared/ui/searchable-input";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/apis/dashboard")({
  component: ApisDashboardPage,
});

function ApisDashboardPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [links, setLinks] = useState<DomainApiLoggingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  const fetchDomains = useCallback(async () => {
    try {
      const res = await invokeApi("get_domains");
      if (res.success) {
        setDomains(res.data ?? []);
      }
    } catch (e) {
      console.error("get_domains:", e);
    }
  }, []);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await invokeApi("get_domain_api_logging_links");
      if (res.success) {
        setLinks(res.data ?? []);
      }
    } catch (e) {
      console.error("get_domain_api_logging_links:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  /** domainId → Domain 매핑 */
  const domainMap = useMemo(() => {
    const map = new Map<number, Domain>();
    for (const d of domains) {
      map.set(d.id, d);
    }
    return map;
  }, [domains]);

  /** 이미 등록된 domain id set */
  const registeredIds = useMemo(() => new Set(links.map((l) => l.domainId)), [links]);

  /** 등록되지 않은 도메인만 검색 후보로 */
  const searchSuggestions = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    return domains
      .filter((d) => !registeredIds.has(d.id))
      .filter((d) => !q || d.url.toLowerCase().includes(q))
      .slice(0, 12)
      .map((d) => d.url);
  }, [domains, registeredIds, searchValue]);

  const handleAddDomain = async (url: string) => {
    const domain = domains.find((d) => d.url === url);
    if (!domain) {
      return;
    }
    try {
      const res = await invokeApi("set_domain_api_logging", {
        payload: {
          domainId: domain.id,
          loggingEnabled: true,
          bodyEnabled: false,
        },
      });
      if (res.success) {
        setLinks(res.data ?? []);
      }
      setSearchValue("");
    } catch (e) {
      console.error("set_domain_api_logging:", e);
    }
  };

  const handleRemove = async (domainId: number) => {
    try {
      const res = await invokeApi("remove_domain_api_logging", {
        payload: { domainId },
      });
      if (res.success) {
        setLinks(res.data ?? []);
      }
    } catch (e) {
      console.error("remove_domain_api_logging:", e);
    }
  };

  const handleToggleLogging = async (link: DomainApiLoggingLink) => {
    try {
      const res = await invokeApi("set_domain_api_logging", {
        payload: {
          domainId: link.domainId,
          loggingEnabled: !link.loggingEnabled,
          bodyEnabled: link.bodyEnabled,
        },
      });
      if (res.success) {
        setLinks(res.data ?? []);
      }
    } catch (e) {
      console.error("set_domain_api_logging:", e);
    }
  };

  const handleToggleBody = async (link: DomainApiLoggingLink) => {
    try {
      const res = await invokeApi("set_domain_api_logging", {
        payload: {
          domainId: link.domainId,
          loggingEnabled: link.loggingEnabled,
          bodyEnabled: !link.bodyEnabled,
        },
      });
      if (res.success) {
        setLinks(res.data ?? []);
      }
    } catch (e) {
      console.error("set_domain_api_logging:", e);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Wifi className="w-5 h-5" />
          </div>
          <H1>APIs</H1>
        </div>
        <P className="text-slate-500">
          Register domains for API logging. Manage per-domain logging and body storage settings.
        </P>
      </header>

      {/* 검색하여 추가 */}
      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add domain for API logging
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-md">
            <label htmlFor="api-domain-search" className="text-xs font-medium text-slate-500">
              Search domain
            </label>
            <div className="relative">
              <SearchableInput
                value={searchValue}
                onChange={setSearchValue}
                suggestions={searchSuggestions}
                onSelect={handleAddDomain}
              >
                <SearchableInput.Input
                  id="api-domain-search"
                  placeholder="Search registered domains..."
                  className="focus:ring-indigo-500"
                />
                <SearchableInput.Dropdown />
              </SearchableInput>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="gap-2 flex items-center"
            disabled={!searchValue.trim() || !domains.some((d) => d.url === searchValue)}
            onClick={() => handleAddDomain(searchValue)}
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Domains must be registered in Domains first. Search and select to add.
        </p>
      </Card>

      {/* 등록된 도메인 리스트 */}
      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Registered API Domains ({links.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-slate-500 text-sm py-6">
            No domains registered for API logging yet. Use the search above to add one.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => {
              const domain = domainMap.get(link.domainId);
              return (
                <li
                  key={link.domainId}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors"
                >
                  <span className="font-mono text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">
                    {domain?.url ?? `Domain #${link.domainId}`}
                  </span>

                  <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={link.loggingEnabled}
                      onChange={() => handleToggleLogging(link)}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-slate-600">Logging</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={link.bodyEnabled}
                      onChange={() => handleToggleBody(link)}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-slate-600">Body</span>
                  </label>

                  <Button
                    variant="danger"
                    size="sm"
                    className="h-8 w-8 p-0 flex items-center justify-center"
                    onClick={() => handleRemove(link.domainId)}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
