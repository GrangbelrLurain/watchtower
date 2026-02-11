/** Status check settings per domain (check_enabled, interval). Status logs are excluded. */
export interface DomainStatusExport {
  url: string;
  checkEnabled: boolean;
  intervalSecs: number;
}

/** Full app settings export payload (matches Rust SettingsExport). */
export interface SettingsExport {
  version: number;
  exportedAt: string;
  domains: { id: number; url: string }[];
  groups: { id: number; name: string }[];
  domainGroupLinks: { domainId: number; groupId: number }[];
  localRoutes: {
    id: number;
    domain: string;
    targetHost: string;
    targetPort: number;
    enabled: boolean;
  }[];
  proxySettings: {
    dns_server: string | null;
    proxy_port: number;
    reverse_http_port?: number | null;
    reverse_https_port?: number | null;
  };
  /** Status check settings per domain. Status logs are excluded from export. */
  domainStatus?: DomainStatusExport[];
}
