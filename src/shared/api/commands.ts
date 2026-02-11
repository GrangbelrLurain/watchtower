import type { Domain, DomainGroupLink } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import type { DomainStatus } from "@/entities/domain/types/domain_status";
import type {
  LocalRoute,
  ProxySettings,
  ProxyStatusPayload,
} from "@/entities/proxy/types/local_route";
import type { SettingsExport } from "@/entities/settings/types/settings_export";

/**
 * Command별 Request/Response 타입 정의.
 * BE ApiResponse<T> 구조에 맞춤.
 */
export interface ApiCommandMap {
  get_domains: { request?: void; response: Domain[] };
  get_domain_by_id: { request: { id: number }; response: Domain | null };
  update_domain_by_id: {
    request: { id: number; payload?: { url?: string } };
    response: Domain | null;
  };
  remove_domains: { request: { id: number }; response: Domain | null };
  regist_domains: {
    request: { urls: string[]; groupId?: number };
    response: Domain[];
  };
  import_domains: { request: { domains: Domain[] }; response: Domain[] };
  clear_all_domains: { request?: void; response: Domain[] };

  get_latest_status: { request?: void; response: DomainStatus[] };
  check_domain_status: { request?: void; response: DomainStatus[] };
  get_domain_status_logs: {
    request: { date: string };
    response: DomainStatus[];
  };

  get_domain_group_links: { request?: void; response: DomainGroupLink[] };
  set_domain_groups: {
    request: { domainId: number; groupIds: number[] };
    response: void;
  };
  set_group_domains: {
    request: { groupId: number; domainIds: number[] };
    response: void;
  };
  get_domains_by_group: { request: { groupId: number }; response: Domain[] };
  get_groups_for_domain: {
    request: { domainId: number };
    response: DomainGroup[];
  };
  create_group: { request: { name: string }; response: DomainGroup[] };
  get_groups: { request?: void; response: DomainGroup[] };
  delete_group: { request: { id: number }; response: DomainGroup[] };
  update_group: {
    request: { id: number; name: string };
    response: DomainGroup[];
  };

  get_local_routes: { request?: void; response: LocalRoute[] };
  add_local_route: {
    request: {
      domain: string;
      targetHost: string;
      targetPort: number;
    };
    response: LocalRoute;
  };
  update_local_route: {
    request: {
      id: number;
      domain?: string;
      targetHost?: string;
      targetPort?: number;
      enabled?: boolean;
    };
    response: LocalRoute | null;
  };
  remove_local_route: { request: { id: number }; response: LocalRoute | null };
  set_local_route_enabled: {
    request: { id: number; enabled: boolean };
    response: LocalRoute | null;
  };

  get_proxy_status: { request?: void; response: ProxyStatusPayload };
  start_local_proxy: {
    request?: { port?: number | null };
    response: ProxyStatusPayload;
  };
  stop_local_proxy: { request?: void; response: ProxyStatusPayload };
  get_proxy_settings: { request?: void; response: ProxySettings };
  set_proxy_dns_server: {
    request: { dnsServer?: string | null };
    response: ProxySettings;
  };
  set_proxy_port: { request: { port: number }; response: ProxySettings };
  set_proxy_reverse_ports: {
    request: {
      reverseHttpPort?: number | null;
      reverseHttpsPort?: number | null;
    };
    response: ProxySettings;
  };
  get_proxy_setup_url: { request?: void; response: string };

  export_all_settings: { request?: void; response: SettingsExport };
  import_all_settings: { request: { payload: SettingsExport }; response: void };
}
