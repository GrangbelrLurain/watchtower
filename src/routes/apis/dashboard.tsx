import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Download, ExternalLink, FileJson, Loader2Icon, Search, Settings, Trash2, Wifi } from "lucide-react";
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

  // const handleToggleLogging = async (link: DomainApiLoggingLink) => {
  //   try {
  //     const res = await invokeApi("set_domain_api_logging", {
  //       payload: {
  //         domainId: link.domainId,
  //         loggingEnabled: !link.loggingEnabled,
  //         bodyEnabled: link.bodyEnabled,
  //         schemaUrl: link.schemaUrl ?? null,
  //       },
  //     });
  //     if (res.success) {
  //       setLinks(res.data ?? []);
  //     }
  //   } catch (e) {
  //     console.error("set_domain_api_logging:", e);
  //   }
  // };

  // const handleToggleBody = async (link: DomainApiLoggingLink) => {
  //   try {
  //     const res = await invokeApi("set_domain_api_logging", {
  //       payload: {
  //         domainId: link.domainId,
  //         loggingEnabled: link.loggingEnabled,
  //         bodyEnabled: !link.bodyEnabled,
  //         schemaUrl: link.schemaUrl ?? null,
  //       },
  //     });
  //     if (res.success) {
  //       setLinks(res.data ?? []);
  //     }
  //   } catch (e) {
  //     console.error("set_domain_api_logging:", e);
  //   }
  // };

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

  /** Schema 파일 임포트 */
  const handleImportSchema = async (link: DomainApiLoggingLink) => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        filters: [{ name: "OpenAPI Spec", extensions: ["json", "yaml", "yml"] }],
        multiple: false,
      });
      if (!path || Array.isArray(path)) {
        return;
      }
      const spec = await readTextFile(path);
      const res = await invokeApi("import_api_schema", {
        payload: {
          domainId: link.domainId,
          version: `Imported ${new Date().toLocaleString()}`,
          spec,
          source: "import",
        },
      });
      if (res.success) {
        setDownloadMessages((prev) => ({
          ...prev,
          [link.domainId]: { ok: true, msg: "Schema imported successfully" },
        }));
      } else {
        setDownloadMessages((prev) => ({
          ...prev,
          [link.domainId]: { ok: false, msg: res.message },
        }));
      }
    } catch (e) {
      console.error("import_api_schema:", e);
      setDownloadMessages((prev) => ({
        ...prev,
        [link.domainId]: { ok: false, msg: String(e) },
      }));
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
          <ul className="space-y-3">
            {links.map((link) => {
              const domain = domainMap.get(link.domainId);
              const isEditingUrl = link.domainId in schemaUrlEdits;
              const currentUrlValue = isEditingUrl ? schemaUrlEdits[link.domainId] : (link.schemaUrl ?? "");
              const hasUrlChanged = isEditingUrl && schemaUrlEdits[link.domainId] !== (link.schemaUrl ?? "");
              const dlMsg = downloadMessages[link.domainId];

              return (
                <li
                  key={link.domainId}
                  className="p-3 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors space-y-2"
                >
                  {/* Row 1: Domain name + toggles + delete */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">
                      {domain?.url ?? `Domain #${link.domainId}`}
                    </span>

                    {/* <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
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
                    </label> */}

                    <Button
                      variant="danger"
                      size="sm"
                      className="h-8 w-8 p-0 flex items-center justify-center"
                      onClick={() => handleRemove(link.domainId)}
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </Button>
                  </div>

                  {/* Row 2: Schema URL input + save + download */}
                  <div className="flex flex-wrap items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <Input
                      type="url"
                      placeholder="Schema URL (e.g. https://api.example.com/swagger.json)"
                      className="flex-1 min-w-[200px] text-xs h-8"
                      value={currentUrlValue}
                      onChange={(e) => setSchemaUrlEdits((prev) => ({ ...prev, [link.domainId]: e.target.value }))}
                    />
                    {hasUrlChanged && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1 text-xs flex items-center"
                        disabled={savingUrlIds.has(link.domainId)}
                        onClick={() => handleSaveSchemaUrl(link)}
                      >
                        {savingUrlIds.has(link.domainId) ? (
                          <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Save
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-8 gap-1 text-xs flex items-center"
                      disabled={!link.schemaUrl?.trim() || downloadingIds.has(link.domainId)}
                      onClick={() => handleDownloadSchema(link)}
                    >
                      {downloadingIds.has(link.domainId) ? (
                        <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 text-xs flex items-center"
                      onClick={() => handleImportSchema(link)}
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      Import
                    </Button>
                  </div>

                  {/* Row 3: Download result message */}
                  {dlMsg && <p className={`text-xs ${dlMsg.ok ? "text-green-600" : "text-red-600"}`}>{dlMsg.msg}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
