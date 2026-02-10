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
}

export interface ProxySettings {
  dns_server: string | null;
}
