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
}

export interface ProxySettings {
  dns_server: string | null;
  /** Port the proxy (forward) listens on (1–65535). */
  proxy_port: number;
  /** Optional reverse HTTP port (e.g. 8080). Open http://127.0.0.1:port — no hosts file. */
  reverse_http_port?: number | null;
  /** Optional reverse HTTPS port (e.g. 8443). */
  reverse_https_port?: number | null;
}
