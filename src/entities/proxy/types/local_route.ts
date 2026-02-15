export interface LocalRoute {
  id: number;
  domain: string;
  targetHost: string;
  targetPort: number;
  enabled: boolean;
}

export interface ProxyStatusPayload {
  running: boolean;
  port: number;
  /** Reverse HTTP listener port when running (no system proxy; use 127.0.0.1:port). */
  reverseHttpPort?: number | null;
  /** Reverse HTTPS listener port when running. */
  reverseHttpsPort?: number | null;
  /** When true, local routes are applied; when false, all traffic passes through. */
  localRoutingEnabled: boolean;
}

export interface ProxySettings {
  dnsServer: string | null;
  /** Port the proxy (forward) listens on (1–65535). */
  proxyPort: number;
  /** Optional reverse HTTP port (e.g. 8080). Open http://127.0.0.1:port — no hosts file. */
  reverseHttpPort?: number | null;
  /** Optional reverse HTTPS port (e.g. 8443). */
  reverseHttpsPort?: number | null;
  /** When true, local routes are applied; when false, all traffic passes through. */
  localRoutingEnabled: boolean;
  /** When true, proxy binds to 0.0.0.0 instead of 127.0.0.1. */
  bindAll: boolean;
  /** Background check interval in seconds. */
  checkIntervalSecs: number;
}

/** 도메인별 API 로깅 설정 링크. */
export interface DomainApiLoggingLink {
  domainId: number;
  loggingEnabled: boolean;
  bodyEnabled: boolean;
  /** OpenAPI/Swagger 스키마 다운로드 URL. */
  schemaUrl?: string | null;
}

/** Schema 다운로드 결과. */
export interface SchemaDownloadResult {
  domainId: number;
  path: string;
  sizeBytes: number;
  preview: string;
}

/** API 요청(Try-it-out) 결과. */
export interface ApiRequestResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  elapsedMs: number;
}

/** API 로그 엔트리. */
export interface ApiLogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  host: string;
  path: string;
  statusCode: number;
  requestHeaders: Record<string, string>;
  requestBody?: string | null;
  responseHeaders: Record<string, string>;
  responseBody?: string | null;
  source: string; // "test" | "proxy"
  elapsedMs: number;
}

/** API 스키마. */
export interface ApiSchema {
  id: string;
  domainId: number;
  version: string;
  spec: string;
  source: string; // "import" | "url"
  fetchedAt: number;
}

/** 도메인별 API 스키마 링크. */
export interface DomainApiSchemaLink {
  domainId: number;
  schemaId: string;
}

export interface EndpointDiff {
  method: string;
  path: string;
  summary?: string | null;
}

export interface ApiSchemaDiff {
  id1: string;
  id2: string;
  added: EndpointDiff[];
  removed: EndpointDiff[];
  modified: EndpointDiff[];
}

export interface ApiMock {
  id: string;
  host: string;
  path: string;
  method: string;
  statusCode: number;
  responseBody: string;
  contentType: string;
  enabled: boolean;
}

export interface ApiTestCase {
  id: string;
  domainId: number;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | null;
  expectedStatus?: number;
}
