import { createFileRoute } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { BookOpen, ChevronDown, ChevronRight, Clock, Globe, Loader2, Play, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { languageAtom } from "@/domain/i18n/store";
import type { Domain } from "@/entities/domain/types/domain";
import type { ApiLogEntry, DomainApiLoggingLink } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { type OpenApiSpec, type ParsedEndpoint, parseOpenApiSpec, type TagGroup } from "@/shared/lib/openapi-parser";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";
import { en } from "./en";
import { ko } from "./ko";
import {
  apiSchemaFormsAtom,
  apiSchemaSearchAtom,
  apiSchemaSelectedDomainIdAtom,
  apiSchemaSelectedEndpointAtom,
  type EndpointFormState,
} from "./store";

export const Route = createFileRoute("/apis/schema/")({
  component: ApiSchemaPage,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, { color: "green" | "blue" | "amber" | "red" | "slate"; bg: string }> = {
  get: { color: "green", bg: "bg-green-50 border-green-200" },
  post: { color: "blue", bg: "bg-blue-50 border-blue-200" },
  put: { color: "amber", bg: "bg-amber-50 border-amber-200" },
  delete: { color: "red", bg: "bg-red-50 border-red-200" },
  patch: { color: "amber", bg: "bg-amber-50 border-amber-200" },
};

function methodStyle(m: string) {
  return METHOD_COLORS[m.toLowerCase()] ?? { color: "slate" as const, bg: "bg-slate-50 border-slate-200" };
}

function statusColor(code: number): "green" | "red" | "amber" | "blue" | "slate" {
  if (code < 300) {
    return "green";
  }
  if (code < 400) {
    return "blue";
  }
  if (code < 500) {
    return "amber";
  }
  return "red";
}

// ── Tag group (collapsible) ─────────────────────────────────────────────────

function TagSection({
  group,
  selected,
  onSelect,
  search,
}: {
  group: TagGroup;
  selected: ParsedEndpoint | null;
  onSelect: (ep: ParsedEndpoint) => void;
  search: string;
}) {
  const [open, setOpen] = useState(true);
  const lowerSearch = search.toLowerCase();

  const filtered = useMemo(() => {
    if (!lowerSearch) {
      return group.endpoints;
    }
    return group.endpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(lowerSearch) ||
        ep.summary?.toLowerCase().includes(lowerSearch) ||
        ep.operationId?.toLowerCase().includes(lowerSearch) ||
        ep.method.toLowerCase().includes(lowerSearch),
    );
  }, [group.endpoints, lowerSearch]);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        className="flex items-center gap-1.5 w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 uppercase tracking-wide"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {group.tag} ({filtered.length})
      </button>
      {open && (
        <ul>
          {filtered.map((ep) => {
            const key = `${ep.method}-${ep.path}`;
            const isSelected = selected && selected.method === ep.method && selected.path === ep.path;
            const ms = methodStyle(ep.method);
            return (
              <li key={key}>
                <button
                  type="button"
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-xs transition-colors ${
                    isSelected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50"
                  }`}
                  onClick={() => onSelect(ep)}
                >
                  <Badge variant={{ color: ms.color, size: "sm" }} className="w-14 text-center shrink-0">
                    {ep.method.toUpperCase()}
                  </Badge>
                  <span className="font-mono truncate text-slate-700">{ep.path}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── History Modal ───────────────────────────────────────────────────────────

function LogHistoryModal({
  method,
  path,
  host,
  onSelect,
  onClose,
}: {
  method: string;
  path: string;
  host: string;
  onSelect: (log: ApiLogEntry) => void;
  onClose: () => void;
}) {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await invokeApi("get_api_logs", {
          payload: {
            date: today,
            methodFilter: method.toUpperCase(),
            hostFilter: host,
            domainFilter: path,
            exactMatch: true,
          },
        });
        if (res.success) {
          setLogs(res.data ?? []);
        }
      } catch (e) {
        console.error("fetch history logs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [method, path, host]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[80vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            {t.requestHistoryToday}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">{t.noLogsFound}</div>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id}>
                  <button
                    type="button"
                    className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all group"
                    onClick={() => onSelect(log)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={{ color: statusColor(log.status_code ?? 0), size: "sm" }}>
                          {log.status_code ?? "ERR"}
                        </Badge>
                        <span className="text-xs text-slate-500 font-mono">
                          {log.timestamp.replace("T", " ").split(".")[0]}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.load}
                      </span>
                    </div>
                    {(log.request_body || log.request_headers) && (
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {log.request_body ? t.hasBody : t.noBody} ·{" "}
                        {log.request_headers ? t.headersCount(Object.keys(log.request_headers).length) : t.noHeaders}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function EndpointDetail({
  endpoint,
  baseUrl,
  host,
  domainId,
}: {
  endpoint: ParsedEndpoint;
  baseUrl: string;
  host: string;
  domainId: number;
}) {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;
  const ms = methodStyle(endpoint.method);

  const [allForms, setAllForms] = useAtom(apiSchemaFormsAtom);
  const endpointKey = `${domainId}:${endpoint.method}:${endpoint.path}`;

  // Current state helper
  const formState = useMemo<EndpointFormState>(() => {
    const saved = allForms[endpointKey];
    if (saved) {
      return saved;
    }
    return {
      paramValues: {},
      bodyText: endpoint.requestBody?.example ? JSON.stringify(endpoint.requestBody.example, null, 2) : "",
      headerText: "",
      response: null,
      error: null,
    };
  }, [allForms, endpointKey, endpoint.requestBody]);

  const updateForm = useCallback(
    (updates: Partial<EndpointFormState>) => {
      setAllForms((prev) => ({
        ...prev,
        [endpointKey]: {
          ...formState,
          ...updates,
        },
      }));
    },
    [endpointKey, formState, setAllForms],
  );

  const { paramValues, bodyText, headerText, response, error } = formState;

  // Loading state (not persisted)
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const buildUrl = useCallback(() => {
    let path = endpoint.path;
    for (const p of endpoint.parameters.filter((param) => param.in === "path")) {
      const val = paramValues[p.name] ?? "";
      path = path.replace(`{${p.name}}`, encodeURIComponent(val));
    }
    const queryParams = endpoint.parameters.filter((p) => p.in === "query");
    const qs = queryParams
      .map((p) => {
        const val = paramValues[p.name];
        if (val === undefined || val === "") {
          return null;
        }
        return `${encodeURIComponent(p.name)}=${encodeURIComponent(val)}`;
      })
      .filter(Boolean)
      .join("&");

    const base = baseUrl.replace(/\/+$/, "");
    return qs ? `${base}${path}?${qs}` : `${base}${path}`;
  }, [endpoint, paramValues, baseUrl]);

  const handleSend = async () => {
    setSending(true);
    updateForm({ response: null, error: null });
    try {
      const url = buildUrl();
      const headers: Record<string, string> = {};

      if (headerText.trim()) {
        for (const line of headerText.split("\n")) {
          const idx = line.indexOf(":");
          if (idx > 0) {
            headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        }
      }

      for (const p of endpoint.parameters.filter((param) => param.in === "header")) {
        const val = paramValues[p.name];
        if (val) {
          headers[p.name] = val;
        }
      }

      const res = await invokeApi("send_api_request", {
        payload: {
          method: endpoint.method.toUpperCase(),
          url,
          headers,
          body: bodyText.trim() || null,
        },
      });

      if (!res.success) {
        updateForm({ error: res.message, response: res.data ?? null });
      } else if (res.data) {
        updateForm({ response: res.data, error: null });
      }
    } catch (e) {
      updateForm({ error: String(e), response: null });
    } finally {
      setSending(false);
    }
  };

  const handleLoadLog = (log: ApiLogEntry) => {
    setHistoryOpen(false);

    let newBodyText = "";
    if (log.request_body) {
      newBodyText = log.request_body;
    }

    let newHeaderText = "";
    if (log.request_headers) {
      const lines = [];
      for (const [k, v] of Object.entries(log.request_headers)) {
        if (["host", "content-length", "connection"].includes(k.toLowerCase())) {
          continue;
        }
        lines.push(`${k}: ${v}`);
      }
      newHeaderText = lines.join("\n");
    }

    updateForm({ bodyText: newBodyText, headerText: newHeaderText });
  };

  const formattedBody = useMemo(() => {
    if (!response?.body) {
      return "";
    }
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body;
    }
  }, [response?.body]);

  const pathParams = endpoint.parameters.filter((p) => p.in === "path");
  const queryParams = endpoint.parameters.filter((p) => p.in === "query");
  const headerParams = endpoint.parameters.filter((p) => p.in === "header");

  const [headersOpen, setHeadersOpen] = useState(false);
  const hasParams = pathParams.length > 0 || queryParams.length > 0 || headerParams.length > 0;

  return (
    <div className="space-y-3 relative">
      {historyOpen && (
        <LogHistoryModal
          host={host}
          method={endpoint.method}
          path={endpoint.path}
          onClose={() => setHistoryOpen(false)}
          onSelect={handleLoadLog}
        />
      )}

      <div className={`rounded-xl border p-3 ${ms.bg}`}>
        <div className="flex items-center gap-3">
          <Badge variant={{ color: ms.color, size: "md" }}>{endpoint.method.toUpperCase()}</Badge>
          <code className="font-mono text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate">
            {endpoint.path}
          </code>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 shrink-0 flex items-center bg-white"
              onClick={() => setHistoryOpen(true)}
              title={t.history}
              type="button"
            >
              <Clock className="w-3.5 h-3.5" />
              {t.history}
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 shrink-0 flex items-center"
              disabled={sending}
              onClick={handleSend}
              type="button"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {t.send}
            </Button>
          </div>
        </div>
        {endpoint.summary && <p className="text-xs text-slate-600 mt-1.5">{endpoint.summary}</p>}
        <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{buildUrl()}</p>
      </div>

      {hasParams && (
        <Card className="p-3 bg-white border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 mb-2">{t.parameters}</h3>
          <div className="space-y-1.5">
            {[...pathParams, ...queryParams, ...headerParams].map((p) => (
              <div key={`${p.in}-${p.name}`} className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-bold uppercase w-10 text-center shrink-0 ${
                    p.in === "path" ? "text-amber-600" : p.in === "header" ? "text-blue-600" : "text-slate-500"
                  }`}
                >
                  {p.in}
                </span>
                <span
                  className="text-xs font-mono text-slate-700 w-40 shrink-0 truncate"
                  title={p.description ? `${p.name} — ${p.description}` : p.name}
                >
                  {p.name}
                  {p.required && <span className="text-red-500">*</span>}
                </span>
                <Input
                  className="flex-1 h-6 text-xs"
                  placeholder={p.type}
                  aria-label={p.name}
                  value={paramValues[p.name] ?? ""}
                  onChange={(e) =>
                    updateForm({
                      paramValues: { ...paramValues, [p.name]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {endpoint.requestBody && (
        <Card className="p-3 bg-white border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 mb-1.5">
            {t.body}
            <span className="text-[10px] font-normal text-slate-400 ml-1.5">{endpoint.requestBody.contentType}</span>
          </h3>
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y min-h-[100px]"
            value={bodyText}
            onChange={(e) => updateForm({ bodyText: e.target.value })}
            spellCheck={false}
          />
        </Card>
      )}

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <button
          type="button"
          className="flex items-center gap-1.5 w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          onClick={() => setHeadersOpen((o) => !o)}
        >
          {headersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {t.customHeaders}
          {headerText.trim() && (
            <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
              {headerText.trim().split("\n").length}
            </span>
          )}
        </button>
        {headersOpen && (
          <div className="px-3 pb-3">
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y min-h-[48px]"
              placeholder={"Authorization: Bearer token\nAccept: application/json"}
              value={headerText}
              onChange={(e) => updateForm({ headerText: e.target.value })}
              spellCheck={false}
              rows={2}
            />
          </div>
        )}
      </div>

      {error && (
        <Card className="p-3 bg-red-50 border-red-200">
          <h3 className="text-xs font-bold text-red-700 mb-1">{t.error}</h3>
          <p className="text-xs text-red-600 font-mono whitespace-pre-wrap break-all">{error}</p>
        </Card>
      )}

      {response && (
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={{ color: statusColor(response.statusCode), size: "md" }}>{response.statusCode}</Badge>
            <span className="text-xs text-slate-400">{response.elapsedMs}ms</span>
            <ResponseHeaders headers={response.headers} />
          </div>
          <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-[500px] whitespace-pre-wrap break-all">
            {formattedBody || t.empty}
          </pre>
        </Card>
      )}
    </div>
  );
}

function ResponseHeaders({ headers }: { headers: Record<string, string> }) {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;
  const [open, setOpen] = useState(false);
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {t.headers(entries.length)}
      </button>
      {open && (
        <div className="mt-1 text-xs font-mono text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100 max-h-[200px] overflow-auto">
          {entries.map(([k, v]) => (
            <div key={k}>
              <span className="text-slate-400">{k}:</span> {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

function ApiSchemaPage() {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;
  const [domains, setDomains] = useState<Domain[]>([]);
  const [links, setLinks] = useState<DomainApiLoggingLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDomainId, setSelectedDomainId] = useAtom(apiSchemaSelectedDomainIdAtom);

  const [schemaLoading, setSchemaLoading] = useState(false);
  const [parsedSpec, setParsedSpec] = useState<OpenApiSpec | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [allEndpoints, setAllEndpoints] = useState<ParsedEndpoint[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [search, setSearch] = useAtom(apiSchemaSearchAtom);
  const [selectedEndpoint, setSelectedEndpoint] = useAtom(apiSchemaSelectedEndpointAtom);

  useEffect(() => {
    (async () => {
      try {
        const [dRes, lRes] = await Promise.all([invokeApi("get_domains"), invokeApi("get_domain_api_logging_links")]);
        if (dRes.success) {
          setDomains(dRes.data ?? []);
        }
        if (lRes.success) {
          setLinks(lRes.data ?? []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Domain map
  const domainMap = useMemo(() => {
    const m = new Map<number, Domain>();
    for (const d of domains) {
      m.set(d.id, d);
    }
    return m;
  }, [domains]);

  // Domains with schema URLs
  const schemaLinks = useMemo(() => links.filter((l) => l.schemaUrl), [links]);

  // Track domain change to prevent reset on remount
  const lastSelectedDomainRef = useRef<number | null>(selectedDomainId);

  // Load schema when domain selected
  useEffect(() => {
    if (selectedDomainId === null) {
      setParsedSpec(null);
      setTagGroups([]);
      setAllEndpoints([]);
      setParseError(null);
      setSelectedEndpoint(null);
      lastSelectedDomainRef.current = null;
      return;
    }

    // Reset ONLY if we're actually switching from one domain to ANOTHER
    const actuallyChanged =
      lastSelectedDomainRef.current !== null && lastSelectedDomainRef.current !== selectedDomainId;
    lastSelectedDomainRef.current = selectedDomainId;

    if (actuallyChanged) {
      setSelectedEndpoint(null);
      setSearch("");
    }

    (async () => {
      setSchemaLoading(true);
      setParseError(null);
      try {
        const res = await invokeApi("get_api_schema_content", {
          payload: { domainId: selectedDomainId },
        });
        if (res.success && res.data) {
          const { spec, endpoints, tagGroups: tg } = parseOpenApiSpec(res.data);
          setParsedSpec(spec);
          setTagGroups(tg);
          setAllEndpoints(endpoints);
        } else {
          setParsedSpec(null);
          setTagGroups([]);
          setAllEndpoints([]);
          setParseError(t.noSchemaError);
        }
      } catch (e) {
        setParseError(t.parseFailedError(String(e)));
      } finally {
        setSchemaLoading(false);
      }
    })();
  }, [selectedDomainId, setSearch, setSelectedEndpoint, t]);

  // Derive base URL from domain
  const baseUrl = useMemo(() => {
    if (!selectedDomainId) {
      return "";
    }
    const domain = domainMap.get(selectedDomainId);
    if (!domain) {
      return "";
    }

    // domain.url may already include scheme (https://...) or be bare (api.example.com)
    const domainOrigin = domain.url.startsWith("http") ? domain.url : `https://${domain.url}`;

    // If spec has servers, use the first one
    if (parsedSpec?.servers?.[0]?.url) {
      const serverUrl = parsedSpec.servers[0].url;
      // Absolute URL → use as-is
      if (serverUrl.startsWith("http")) {
        return serverUrl;
      }
      // Relative path → prepend domain origin
      return `${domainOrigin.replace(/\/+$/, "")}${serverUrl}`;
    }
    return domainOrigin;
  }, [selectedDomainId, domainMap, parsedSpec]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-10rem)] overflow-hidden">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <H1>{t.title}</H1>
        </div>
        <P className="text-slate-500">{t.subtitle}</P>
      </header>

      {/* Domain selector */}
      <Card className="p-1 items-center gap-2 flex flex-wrap bg-white border-slate-200 shadow-sm rounded-xl mb-4 relative z-10">
        <div className="pl-3 pr-2 py-2 flex items-center gap-2 border-r border-slate-100 shrink-0">
          <Globe className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600 whitespace-nowrap hidden sm:inline-block">
            {t.targetApi}
          </span>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <select
            id="domain-select"
            className="appearance-none w-full bg-transparent border-none py-2 pl-2 pr-8 text-sm font-medium text-slate-800 focus:ring-0 cursor-pointer outline-none"
            value={selectedDomainId ?? ""}
            onChange={(e) => setSelectedDomainId(e.target.value ? Number(e.target.value) : null)}
            disabled={loading}
          >
            <option value="">{t.selectDomain}</option>
            {schemaLinks.map((link) => {
              const domain = domainMap.get(link.domainId);
              return (
                <option key={link.domainId} value={link.domainId}>
                  {domain?.url ?? `Domain #${link.domainId}`}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {schemaLoading ? (
          <div className="flex items-center gap-2 mr-4 text-xs text-indigo-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.parsingSchema}
          </div>
        ) : (
          parsedSpec && (
            <div className="hidden md:flex items-center gap-3 mr-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100 animate-in fade-in slide-in-from-right-4 shrink-0">
              <span className="font-bold">{parsedSpec.info.title}</span>
              <span className="w-px h-3 bg-indigo-200" />
              <span className="font-mono">v{parsedSpec.info.version}</span>
              <span className="w-px h-3 bg-indigo-200" />
              <span>{t.endpointsCount(allEndpoints.length)}</span>
            </div>
          )
        )}
      </Card>

      {/* Parse error */}
      {parseError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{parseError}</p>
        </Card>
      )}

      {/* Main content: 2 panel */}
      {parsedSpec && (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: endpoint list */}
          <Card className="w-80 shrink-0 bg-white border-slate-200 flex flex-col overflow-hidden min-h-0">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-8 h-8 text-xs w-full"
                  placeholder={t.searchEndpoints}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {tagGroups.map((g) => (
                <TagSection
                  key={g.tag}
                  group={g}
                  selected={selectedEndpoint}
                  onSelect={setSelectedEndpoint}
                  search={search}
                />
              ))}
            </div>
          </Card>

          {/* Right: detail + request form (independently scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {selectedEndpoint && selectedDomainId ? (
              <EndpointDetail
                endpoint={selectedEndpoint}
                baseUrl={baseUrl}
                host={baseUrl.replace(/^https?:\/\//, "").split("/")[0]}
                domainId={selectedDomainId}
              />
            ) : (
              <Card className="p-8 bg-white border-slate-200 flex flex-col items-center justify-center text-center min-h-[300px]">
                <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">{t.selectEndpoint}</p>
                <p className="text-slate-400 text-xs mt-1">{t.endpointsInfo(allEndpoints.length, tagGroups.length)}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no domain selected */}
      {!parsedSpec && !schemaLoading && !parseError && (
        <Card className="p-12 bg-white border-slate-200 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-slate-500">{t.chooseDomainToStart}</p>
          {schemaLinks.length === 0 && (
            <p className="text-slate-400 text-xs mt-2">
              No domains with Schema URL found. Register them in the Dashboard first.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
