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
}
