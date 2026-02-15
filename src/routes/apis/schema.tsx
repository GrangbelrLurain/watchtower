import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ChevronDown, ChevronRight, GitCompare, History, Loader2, Play, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Domain } from "@/entities/domain/types/domain";
import type { ApiSchema, DomainApiLoggingLink } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { type OpenApiSpec, type ParsedEndpoint, parseOpenApiSpec, type TagGroup } from "@/shared/lib/openapi-parser";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/apis/schema")({
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

// ── Endpoint detail + Request form ──────────────────────────────────────────

function EndpointDetail({ endpoint, baseUrl }: { endpoint: ParsedEndpoint; spec: OpenApiSpec; baseUrl: string }) {
  const ms = methodStyle(endpoint.method);

  // Parameter values
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  // Request body
  const [bodyText, setBodyText] = useState("");
  // Custom headers
  const [headerText, setHeaderText] = useState("");
  // Response
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<{
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    elapsedMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset form when endpoint changes
  useEffect(() => {
    setParamValues({});
    setResponse(null);
    setError(null);
    setHeaderText("");
    // Generate example body
    if (endpoint.requestBody?.example) {
      setBodyText(JSON.stringify(endpoint.requestBody.example, null, 2));
    } else {
      setBodyText("");
    }
  }, [endpoint]);

  const buildUrl = useCallback(() => {
    let path = endpoint.path;
    // Replace path params
    for (const p of endpoint.parameters.filter((param) => param.in === "path")) {
      const val = paramValues[p.name] ?? "";
      path = path.replace(`{${p.name}}`, encodeURIComponent(val));
    }
    // Build query string
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
    setResponse(null);
    setError(null);
    try {
      const url = buildUrl();
      const headers: Record<string, string> = {};

      // Parse custom headers (key: value per line)
      if (headerText.trim()) {
        for (const line of headerText.split("\n")) {
          const idx = line.indexOf(":");
          if (idx > 0) {
            headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        }
      }

      // Header params
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
        // BE returned an error response (e.g. reqwest failure wrapped in ApiResponse)
        setError(res.message);
      }
      // Always show data if present (even on non-2xx HTTP responses)
      if (res.data) {
        setResponse(res.data);
      }
    } catch (e) {
      // Tauri invoke itself threw (e.g. command returned Err)
      setError(String(e));
    } finally {
      setSending(false);
    }
  };

  // Format response body (try JSON pretty-print)
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
    <div className="space-y-3">
      {/* ── Endpoint header + Send button ── */}
      <div className={`rounded-xl border p-3 ${ms.bg}`}>
        <div className="flex items-center gap-3">
          <Badge variant={{ color: ms.color, size: "md" }}>{endpoint.method.toUpperCase()}</Badge>
          <code className="font-mono text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate">
            {endpoint.path}
          </code>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 shrink-0 flex items-center"
            disabled={sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Send
          </Button>
        </div>
        {endpoint.summary && <p className="text-xs text-slate-600 mt-1.5">{endpoint.summary}</p>}
        <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{buildUrl()}</p>
      </div>

      {/* ── Parameters (compact table) ── */}
      {hasParams && (
        <Card className="p-3 bg-white border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 mb-2">Parameters</h3>
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
                  onChange={(e) => setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Request Body ── */}
      {endpoint.requestBody && (
        <Card className="p-3 bg-white border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 mb-1.5">
            Body
            <span className="text-[10px] font-normal text-slate-400 ml-1.5">{endpoint.requestBody.contentType}</span>
          </h3>
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y min-h-[100px]"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            spellCheck={false}
          />
        </Card>
      )}

      {/* ── Custom Headers (collapsed by default) ── */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <button
          type="button"
          className="flex items-center gap-1.5 w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          onClick={() => setHeadersOpen((o) => !o)}
        >
          {headersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Custom Headers
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
              onChange={(e) => setHeaderText(e.target.value)}
              spellCheck={false}
              rows={2}
            />
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <Card className="p-3 bg-red-50 border-red-200">
          <h3 className="text-xs font-bold text-red-700 mb-1">Error</h3>
          <p className="text-xs text-red-600 font-mono whitespace-pre-wrap break-all">{error}</p>
        </Card>
      )}

      {/* ── Response ── */}
      {response && (
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={{ color: statusColor(response.statusCode), size: "md" }}>{response.statusCode}</Badge>
            <span className="text-xs text-slate-400">{response.elapsedMs}ms</span>
            <ResponseHeaders headers={response.headers} />
          </div>
          <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-[500px] whitespace-pre-wrap break-all">
            {formattedBody || "(empty)"}
          </pre>
        </Card>
      )}
    </div>
  );
}

function ResponseHeaders({ headers }: { headers: Record<string, string> }) {
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
        Headers ({entries.length})
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
  // Data loading
  const [domains, setDomains] = useState<Domain[]>([]);
  const [links, setLinks] = useState<DomainApiLoggingLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Domain selection
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [schemas, setSchemas] = useState<ApiSchema[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);

  // Compare mode
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [baseSchemaId, setBaseSchemaId] = useState<string | null>(null);
  const [targetSchemaId, setTargetSchemaId] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<{
    added: ParsedEndpoint[];
    removed: ParsedEndpoint[];
    changed: ParsedEndpoint[];
  } | null>(null);

  // Schema
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [parsedSpec, setParsedSpec] = useState<OpenApiSpec | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [allEndpoints, setAllEndpoints] = useState<ParsedEndpoint[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // UI state
  const [search, setSearch] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<ParsedEndpoint | null>(null);

  // Fetch domains + links
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

  // Fetch schemas when domain selected
  useEffect(() => {
    if (selectedDomainId === null) {
      setSchemas([]);
      setSelectedSchemaId(null);
      return;
    }
    (async () => {
      try {
        const res = await invokeApi("get_api_schemas", {
          payload: { domainId: selectedDomainId },
        });
        if (res.success) {
          const list = res.data ?? [];
          setSchemas(list);
          if (list.length > 0) {
            setSelectedSchemaId(list[list.length - 1].id);
          } else {
            setSelectedSchemaId(null);
          }
        }
      } catch (e) {
        console.error("get_api_schemas:", e);
      }
    })();
  }, [selectedDomainId]);

  // Load schema content when selectedSchemaId changes
  useEffect(() => {
    if (!selectedSchemaId) {
      setParsedSpec(null);
      setTagGroups([]);
      setAllEndpoints([]);
      setSelectedEndpoint(null);

      // Fallback: if no versioning schemas, try get_api_schema_content (legacy/direct)
      if (selectedDomainId) {
        (async () => {
          setSchemaLoading(true);
          try {
            const res = await invokeApi("get_api_schema_content", {
              payload: { domainId: selectedDomainId },
            });
            if (res.success && res.data) {
              const { spec, endpoints, tagGroups: tg } = parseOpenApiSpec(res.data);
              setParsedSpec(spec);
              setTagGroups(tg);
              setAllEndpoints(endpoints);
              setParseError(null);
            } else {
              setParseError("스키마가 없습니다. Dashboard에서 다운로드하거나 버전을 선택하세요.");
            }
          } catch (e) {
             setParseError(`스키마 파싱 실패: ${e}`);
          } finally {
            setSchemaLoading(false);
          }
        })();
      }
      return;
    }

    (async () => {
      setSchemaLoading(true);
      setParseError(null);
      setSelectedEndpoint(null);
      setSearch("");
      try {
        const res = await invokeApi("get_api_schema_by_id", {
          payload: { id: selectedSchemaId },
        });
        if (res.success && res.data) {
          const { spec, endpoints, tagGroups: tg } = parseOpenApiSpec(res.data.spec);
          setParsedSpec(spec);
          setTagGroups(tg);
          setAllEndpoints(endpoints);
        } else {
          setParseError("스키마 내용을 불러올 수 없습니다.");
        }
      } catch (e) {
        setParseError(`스키마 파싱 실패: ${e}`);
      } finally {
        setSchemaLoading(false);
      }
    })();
  }, [selectedSchemaId, selectedDomainId]);

  // Diff effect
  useEffect(() => {
    if (!isCompareMode || !baseSchemaId || !targetSchemaId) {
      setDiffData(null);
      return;
    }

    (async () => {
      setSchemaLoading(true);
      try {
        const res = await invokeApi("diff_api_schemas", {
          payload: { oldId: baseSchemaId, newId: targetSchemaId },
        });
        if (res.success) {
          const oldParsed = parseOpenApiSpec(res.data.oldSpec);
          const newParsed = parseOpenApiSpec(res.data.newSpec);

          const oldMap = new Map(oldParsed.endpoints.map((e) => [`${e.method} ${e.path}`, e]));
          const newMap = new Map(newParsed.endpoints.map((e) => [`${e.method} ${e.path}`, e]));

          const added = newParsed.endpoints.filter((e) => !oldMap.has(`${e.method} ${e.path}`));
          const removed = oldParsed.endpoints.filter((e) => !newMap.has(`${e.method} ${e.path}`));
          const changed = newParsed.endpoints.filter((e) => {
            const old = oldMap.get(`${e.method} ${e.path}`);
            if (!old) return false;
            return (
              old.summary !== e.summary ||
              old.parameters.length !== e.parameters.length ||
              old.responses.length !== e.responses.length
            );
          });

          setDiffData({ added, removed, changed });
        }
      } catch (e) {
        console.error("diff_api_schemas:", e);
      } finally {
        setSchemaLoading(false);
      }
    })();
  }, [isCompareMode, baseSchemaId, targetSchemaId]);

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
          <H1>API Schema</H1>
        </div>
        <P className="text-slate-500">OpenAPI 스키마를 탐색하고 엔드포인트를 테스트합니다.</P>
      </header>

      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Domain selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider" htmlFor="domain-select">
            Domain
          </label>
          <select
            id="domain-select"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]"
            value={selectedDomainId ?? ""}
            onChange={(e) => setSelectedDomainId(e.target.value ? Number(e.target.value) : null)}
            disabled={loading}
          >
            <option value="">-- Select Domain --</option>
            {schemaLinks.map((link) => {
              const domain = domainMap.get(link.domainId);
              return (
                <option key={link.domainId} value={link.domainId}>
                  {domain?.url ?? `Domain #${link.domainId}`}
                </option>
              );
            })}
          </select>
        </div>

        {/* Version selector */}
        {selectedDomainId && schemas.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
            <History className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider" htmlFor="version-select">
              Version
            </label>
            <select
              id="version-select"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedSchemaId ?? ""}
              onChange={(e) => setSelectedSchemaId(e.target.value || null)}
            >
              <option value="">Current (Download)</option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.version} ({new Date(s.fetchedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {schemaLoading && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}

        {selectedDomainId && schemas.length >= 2 && !isCompareMode && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 ml-auto"
            onClick={() => {
              setIsCompareMode(true);
              setBaseSchemaId(schemas[0].id);
              setTargetSchemaId(schemas[schemas.length - 1].id);
            }}
          >
            <GitCompare className="w-4 h-4" />
            Compare Versions
          </Button>
        )}

        {isCompareMode && (
          <Button variant="danger" size="sm" className="gap-1.5 ml-auto" onClick={() => setIsCompareMode(false)}>
            <X className="w-4 h-4" />
            Exit Compare
          </Button>
        )}

        {!isCompareMode && parsedSpec && (
          <span className="text-xs text-slate-400 ml-auto">
            {parsedSpec.info.title} v{parsedSpec.info.version} — {allEndpoints.length} endpoints
          </span>
        )}
      </div>

      {/* Compare Mode Header */}
      {isCompareMode && (
        <Card className="p-4 bg-indigo-50 border-indigo-100 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Base</span>
            <select
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white outline-none"
              value={baseSchemaId ?? ""}
              onChange={(e) => setBaseSchemaId(e.target.value)}
            >
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.version}
                </option>
              ))}
            </select>
          </div>
          <GitCompare className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Target</span>
            <select
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white outline-none"
              value={targetSchemaId ?? ""}
              onChange={(e) => setTargetSchemaId(e.target.value)}
            >
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.version}
                </option>
              ))}
            </select>
          </div>

          {diffData && (
            <div className="flex gap-4 ml-auto">
              <Badge variant={{ color: "green", size: "sm" }}>+{diffData.added.length} Added</Badge>
              <Badge variant={{ color: "red", size: "sm" }}>-{diffData.removed.length} Removed</Badge>
              <Badge variant={{ color: "amber", size: "sm" }}>~{diffData.changed.length} Changed</Badge>
            </div>
          )}
        </Card>
      )}

      {/* Parse error */}
      {parseError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{parseError}</p>
        </Card>
      )}

      {/* Main content: 2 panel */}
      {!isCompareMode && parsedSpec && (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: endpoint list */}
          <Card className="w-80 shrink-0 bg-white border-slate-200 flex flex-col overflow-hidden min-h-0">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-8 h-8 text-xs w-full"
                  placeholder="엔드포인트 검색..."
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
            {selectedEndpoint ? (
              <EndpointDetail endpoint={selectedEndpoint} spec={parsedSpec} baseUrl={baseUrl} />
            ) : (
              <Card className="p-8 bg-white border-slate-200 flex flex-col items-center justify-center text-center min-h-[300px]">
                <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">왼쪽에서 엔드포인트를 선택하세요.</p>
                <p className="text-slate-400 text-xs mt-1">
                  {allEndpoints.length}개 엔드포인트, {tagGroups.length}개 태그 그룹
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Compare View */}
      {isCompareMode && diffData && (
        <div className="flex-1 overflow-y-auto space-y-6 pb-20">
          {/* Added */}
          {diffData.added.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-green-600 mb-3 flex items-center gap-2">
                <Badge variant={{ color: "green", size: "sm" }}>New</Badge> Added Endpoints
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {diffData.added.map((ep) => (
                  <Card key={`${ep.method}-${ep.path}`} className="p-3 border-green-100 flex items-center gap-3">
                    <Badge variant={{ color: methodStyle(ep.method).color, size: "sm" }}>{ep.method.toUpperCase()}</Badge>
                    <code className="text-xs font-mono flex-1 truncate">{ep.path}</code>
                    <span className="text-[10px] text-slate-400 truncate">{ep.summary}</span>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Removed */}
          {diffData.removed.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                <Badge variant={{ color: "red", size: "sm" }}>Old</Badge> Removed Endpoints
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {diffData.removed.map((ep) => (
                  <Card key={`${ep.method}-${ep.path}`} className="p-3 border-red-100 bg-red-50/30 flex items-center gap-3 opacity-70">
                    <Badge variant={{ color: "slate", size: "sm" }}>{ep.method.toUpperCase()}</Badge>
                    <code className="text-xs font-mono flex-1 truncate line-through">{ep.path}</code>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Changed */}
          {diffData.changed.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-amber-600 mb-3 flex items-center gap-2">
                <Badge variant={{ color: "amber", size: "sm" }}>Mod</Badge> Modified Endpoints
              </h3>
              <div className="space-y-2">
                {diffData.changed.map((ep) => (
                  <Card key={`${ep.method}-${ep.path}`} className="p-3 border-amber-100 flex items-center gap-3">
                    <Badge variant={{ color: methodStyle(ep.method).color, size: "sm" }}>{ep.method.toUpperCase()}</Badge>
                    <code className="text-xs font-mono">{ep.path}</code>
                    <span className="text-xs text-slate-500 italic">— Documentation or parameters updated</span>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {diffData.added.length === 0 && diffData.removed.length === 0 && diffData.changed.length === 0 && (
            <div className="py-20 text-center">
              <P className="text-slate-400 italic">No changes detected between these versions.</P>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no domain selected */}
      {!parsedSpec && !schemaLoading && !parseError && !isCompareMode && (
        <Card className="p-12 bg-white border-slate-200 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-slate-500">위에서 도메인을 선택하면 OpenAPI 스키마를 탐색할 수 있습니다.</p>
          {schemaLinks.length === 0 && (
            <p className="text-slate-400 text-xs mt-2">
              Schema URL이 등록된 도메인이 없습니다. Dashboard에서 먼저 등록하세요.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
