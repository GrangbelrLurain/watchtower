import { createFileRoute, Link } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowLeft, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LocalRoute, ProxyStatusPayload } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { H1, H2, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/proxy/setup")({
  component: ProxySetupPage,
});

/** Extract host from route domain: "https://dev.modetour.local/" -> "dev.modetour.local" */
function domainToHost(domain: string): string {
  const d = domain.trim();
  const after = d.startsWith("https://") ? d.slice(8) : d.startsWith("http://") ? d.slice(7) : d;
  const hostPart = after.split("/")[0].trim();
  return hostPart.split(":")[0].trim() || domain;
}

function ProxySetupPage() {
  const [proxyStatus, setProxyStatus] = useState<ProxyStatusPayload>({
    running: false,
    port: 0,
    reverse_http_port: null,
    reverse_https_port: null,
    local_routing_enabled: true,
  });
  const [routes, setRoutes] = useState<LocalRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, routesRes] = await Promise.all([invokeApi("get_proxy_status"), invokeApi("get_local_routes")]);
      if (statusRes?.success && statusRes.data) {
        setProxyStatus(statusRes.data);
      }
      if (routesRes?.success && routesRes.data) {
        setRoutes(routesRes.data);
      }
    } catch (e) {
      console.error("proxy setup fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const port = proxyStatus.running ? proxyStatus.port : 0;
  const pacUrl = port > 0 ? `http://127.0.0.1:${port}/.watchtower/proxy.pac` : "";

  const enabledRoutes = routes.filter((r) => r.enabled);
  const hosts = [...new Set(enabledRoutes.map((r) => domainToHost(r.domain)))];

  const handleOpenCert = (host: string) => {
    // Use forward proxy HTTP port so cert download works even before the cert is trusted
    const url =
      port > 0
        ? `http://127.0.0.1:${port}/.watchtower/cert/${encodeURIComponent(host)}`
        : `https://${host}/.watchtower/cert/${encodeURIComponent(host)}`;
    openUrl(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="animate-pulse">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/proxy" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <H1>Proxy Setup</H1>
      </div>

      {!proxyStatus.running ? (
        <Card className="p-6">
          <P className="text-slate-600">Proxy is not running. Start the proxy from the Proxy page first.</P>
          <Link to="/proxy">
            <Button variant="primary" className="mt-4">
              Go to Proxy
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {/* PAC */}
          <Card className="p-6">
            <H2 className="mb-2">Browser proxy auto config (PAC)</H2>
            <P className="text-slate-600 mb-3">
              Enter the URL below in your system or browser's automatic proxy configuration.
            </P>
            <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm break-all">{pacUrl || "—"}</div>
            <P className="text-slate-500 text-sm mt-3">
              Windows: Settings → Network & Internet → Proxy → Use setup script
              <br />
              macOS: System Settings → Network → Advanced → Proxies → Automatic proxy configuration URL
            </P>
          </Card>

          {/* 수동 프록시 */}
          <Card className="p-6">
            <H2 className="mb-2">Manual proxy setup</H2>
            <P className="text-slate-600 mb-2">To use manual proxy instead of PAC:</P>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>
                Address: <code className="bg-slate-100 px-1 rounded">127.0.0.1</code>
              </li>
              <li>
                Port: <code className="bg-slate-100 px-1 rounded">{port}</code>
              </li>
            </ul>
          </Card>

          {/* HTTPS 인증서 */}
          <Card className="p-6">
            <H2 className="mb-2">HTTPS certificate installation</H2>
            <P className="text-slate-600 mb-3">
              To trust the certificate for local HTTPS, download the certificate for each host and install it on your
              system. Downloads via proxy HTTP port ({port > 0 ? `127.0.0.1:${port}` : "—"}).
            </P>
            {hosts.length === 0 ? (
              <P className="text-slate-500 text-sm">
                No enabled local routes. Add and enable domains on the Proxy page.
              </P>
            ) : (
              <ul className="space-y-2">
                {hosts.map((host) => (
                  <li key={host} className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 flex items-center"
                      onClick={() => handleOpenCert(host)}
                    >
                      <Download className="w-4 h-4" />
                      {host}.crt
                    </Button>
                    <span className="text-slate-400 text-xs font-mono">
                      http://127.0.0.1:{port}/.watchtower/cert/{host}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <P className="text-slate-500 text-sm mt-4">
              Windows: Double-click .crt → Install certificate → Local computer → Trusted root certification
              authorities. (If Open with dialog appears: run certmgr.msc → Import)
              <br />
              macOS: Double-click .crt → Add to Keychain → Always trust
            </P>
          </Card>
        </div>
      )}
    </div>
  );
}
