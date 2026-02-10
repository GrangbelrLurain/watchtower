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
  proxySettings: { dns_server: string | null };
}
