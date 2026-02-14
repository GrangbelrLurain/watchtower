export interface LocalRoute {
  id: number;
  domain: string;
  target_host: string;
  target_port: number;
  enabled: boolean;
}

export interface ProxyStatusPayload {
  running: boolean;
  port: number;
  /** Reverse HTTP listener port when running (no system proxy; use 127.0.0.1:port). */
  reverse_http_port?: number | null;
  /** Reverse HTTPS listener port when running. */
  reverse_https_port?: number | null;
  /** When true, local routes are applied; when false, all traffic passes through. */
  local_routing_enabled: boolean;
}

export interface ProxySettings {
  dns_server: string | null;
  /** Port the proxy (forward) listens on (1–65535). */
  proxy_port: number;
  /** Optional reverse HTTP port (e.g. 8080). Open http://127.0.0.1:port — no hosts file. */
  reverse_http_port?: number | null;
  /** Optional reverse HTTPS port (e.g. 8443). */
  reverse_https_port?: number | null;
  /** When true, local routes are applied; when false, all traffic passes through. */
  local_routing_enabled: boolean;
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
