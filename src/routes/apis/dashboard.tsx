import { createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, Download, Loader2Icon, Search, Settings, Trash2, Wifi } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Domain } from "@/entities/domain/types/domain";
import type { DomainApiLoggingLink } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/apis/dashboard")({
  component: ApisDashboardPage,
});

function ApisDashboardPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [links, setLinks] = useState<DomainApiLoggingLink[]>([]);
  const [loading, setLoading] = useState(true);

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

  /** Schema URL 편집 중인 도메인 id → 입력값 */
  const [schemaUrlEdits, setSchemaUrlEdits] = useState<Record<number, string>>({});
  /** Schema 다운로드 진행 중인 도메인 id set */
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  /** Schema URL 저장 진행 중인 도메인 id set */
  const [savingUrlIds, setSavingUrlIds] = useState<Set<number>>(new Set());
  /** 다운로드 결과 메시지 (domainId → message) */
  const [downloadMessages, setDownloadMessages] = useState<Record<number, { ok: boolean; msg: string }>>({});

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
          schemaUrl: link.schemaUrl ?? null,
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
          schemaUrl: link.schemaUrl ?? null,
        },
      });
      if (res.success) {
        setLinks(res.data ?? []);
      }
    } catch (e) {
      console.error("set_domain_api_logging:", e);
    }
  };

  /** Schema URL 저장 */
  const handleSaveSchemaUrl = async (link: DomainApiLoggingLink) => {
    const newUrl = schemaUrlEdits[link.domainId];
    if (newUrl === undefined) {
      return;
    }
    setSavingUrlIds((s) => new Set(s).add(link.domainId));
    try {
      const res = await invokeApi("set_domain_api_logging", {
        payload: {
          domainId: link.domainId,
          loggingEnabled: link.loggingEnabled,
          bodyEnabled: link.bodyEnabled,
          schemaUrl: newUrl.trim() || null,
        },
      });
      if (res.success) {
        setLinks(res.data ?? []);
        // 편집 상태 초기화
        setSchemaUrlEdits((prev) => {
          const next = { ...prev };
          delete next[link.domainId];
          return next;
        });
      }
    } catch (e) {
      console.error("save schema url:", e);
    } finally {
      setSavingUrlIds((s) => {
        const next = new Set(s);
        next.delete(link.domainId);
        return next;
      });
    }
  };

  /** Schema 다운로드 실행 */
  const handleDownloadSchema = async (link: DomainApiLoggingLink) => {
    const url = link.schemaUrl?.trim();
    if (!url) {
      return;
    }
    setDownloadingIds((s) => new Set(s).add(link.domainId));
    setDownloadMessages((prev) => {
      const next = { ...prev };
      delete next[link.domainId];
      return next;
    });
    try {
      const res = await invokeApi("download_api_schema", {
        payload: { domainId: link.domainId, url },
      });
      if (res.success) {
        setDownloadMessages((prev) => ({
          ...prev,
          [link.domainId]: { ok: true, msg: `Downloaded ${res.data.sizeBytes.toLocaleString()} bytes` },
        }));
      } else {
        setDownloadMessages((prev) => ({
          ...prev,
          [link.domainId]: { ok: false, msg: res.message },
        }));
      }
    } catch (e) {
      setDownloadMessages((prev) => ({
        ...prev,
        [link.domainId]: { ok: false, msg: String(e) },
      }));
    } finally {
      setDownloadingIds((s) => {
        const next = new Set(s);
        next.delete(link.domainId);
        return next;
      });
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
        <P className="text-slate-500">Manage per-domain logging, body storage, and Schema URL settings.</P>
        <Link
          to="/apis/settings"
          className="inline-flex items-center gap-2 mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Settings className="w-4 h-4" />
          도메인 등록/해제는 Settings에서 관리
        </Link>
      </header>

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
            No domains registered for API logging yet. Go to{" "}
            <Link to="/apis/settings" className="text-indigo-600 hover:underline font-medium">
              Settings
            </Link>{" "}
            to add domains.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {links.map((link) => {
              const domain = domainMap.get(link.domainId);
              const isEditingUrl = link.domainId in schemaUrlEdits;
              const currentUrlValue = isEditingUrl ? schemaUrlEdits[link.domainId] : (link.schemaUrl ?? "");
              const hasUrlChanged = isEditingUrl && schemaUrlEdits[link.domainId] !== (link.schemaUrl ?? "");
              const dlMsg = downloadMessages[link.domainId];

              return (
                <div
                  key={link.domainId}
                  className="p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all bg-slate-50/30 flex flex-col gap-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Domain Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-2 h-8 bg-indigo-500 rounded-full shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="truncate">{domain?.url ?? `Domain #${link.domainId}`}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full shrink-0">
                            ID: {link.domainId}
                          </span>
                        </div>
                        {dlMsg && (
                          <p className={`text-xs mt-1 ${dlMsg.ok ? "text-green-600" : "text-red-600"}`}>{dlMsg.msg}</p>
                        )}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-4 sm:gap-6 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex-wrap sm:flex-nowrap justify-center sm:justify-start">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${link.loggingEnabled ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300"}`}
                        >
                          {link.loggingEnabled && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={link.loggingEnabled}
                          onChange={() => handleToggleLogging(link)}
                        />
                        <span
                          className={clsx(
                            "text-sm font-medium",
                            link.loggingEnabled ? "text-indigo-700" : "text-slate-500",
                          )}
                        >
                          Logging
                        </span>
                      </label>

                      <div className="w-px h-4 bg-slate-200" />

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${link.bodyEnabled ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300"}`}
                        >
                          {link.bodyEnabled && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={link.bodyEnabled}
                          onChange={() => handleToggleBody(link)}
                        />
                        <span
                          className={clsx(
                            "text-sm font-medium",
                            link.bodyEnabled ? "text-indigo-700" : "text-slate-500",
                          )}
                        >
                          Save Body
                        </span>
                      </label>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-9 w-9 p-0 flex items-center justify-center rounded-lg opacity-80 hover:opacity-100 ml-auto md:ml-0"
                      onClick={() => handleRemove(link.domainId)}
                      title="Remove from API monitoring"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </Button>
                  </div>

                  {/* Schema Section */}
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <div className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Schema</div>
                    <div className="h-4 w-px bg-slate-200" />
                    <Input
                      type="url"
                      placeholder="https://api.example.com/openapi.json"
                      className="border-0 shadow-none focus-visible:ring-0 px-2 text-sm h-8"
                      value={currentUrlValue}
                      onChange={(e) => setSchemaUrlEdits((prev) => ({ ...prev, [link.domainId]: e.target.value }))}
                    />

                    {hasUrlChanged && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 gap-1 text-xs flex items-center shrink-0 whitespace-nowrap"
                        disabled={savingUrlIds.has(link.domainId)}
                        onClick={() => handleSaveSchemaUrl(link)}
                      >
                        {savingUrlIds.has(link.domainId) ? (
                          <Loader2Icon className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Save
                      </Button>
                    )}

                    {link.schemaUrl && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-7 gap-1 text-xs flex items-center ml-1 shrink-0 whitespace-nowrap"
                        disabled={downloadingIds.has(link.domainId)}
                        onClick={() => handleDownloadSchema(link)}
                      >
                        {downloadingIds.has(link.domainId) ? (
                          <Loader2Icon className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        Fetch
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
