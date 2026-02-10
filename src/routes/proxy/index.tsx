import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  AlertCircle,
  Globe,
  Loader2Icon,
  Play,
  Plus,
  Server,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  LocalRoute,
  ProxyStatusPayload,
} from "@/entities/proxy/types/local_route";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/proxy/")({
  component: ProxyPage,
});

function ProxyPage() {
  const [routes, setRoutes] = useState<LocalRoute[]>([]);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatusPayload>({
    running: false,
    port: 0,
  });
  const [loading, setLoading] = useState(true);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newTargetHost, setNewTargetHost] = useState("127.0.0.1");
  const [newTargetPort, setNewTargetPort] = useState("3000");

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: LocalRoute[] }>(
        "get_local_routes",
      );
      if (res.success) setRoutes(res.data ?? []);
    } catch (e) {
      console.error("get_local_routes:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProxyStatusOnce = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: ProxyStatusPayload }>(
        "get_proxy_status",
      );
      if (res.success) setProxyStatus(res.data ?? { running: false, port: 0 });
    } catch (e) {
      console.error("get_proxy_status:", e);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    void fetchProxyStatusOnce();
    const unlisten = listen<ProxyStatusPayload>(
      "proxy-status-changed",
      (ev) => {
        setProxyStatus(ev.payload ?? { running: false, port: 0 });
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchProxyStatusOnce]);

  const handleStartProxy = async () => {
    setProxyLoading(true);
    try {
      await invoke("start_local_proxy", { port: null });
      // State updated via proxy-status-changed event
    } catch (e) {
      console.error("start_local_proxy:", e);
    } finally {
      setProxyLoading(false);
    }
  };

  const handleStopProxy = async () => {
    setProxyLoading(true);
    try {
      await invoke("stop_local_proxy");
      // State updated via proxy-status-changed event
    } catch (e) {
      console.error("stop_local_proxy:", e);
    } finally {
      setProxyLoading(false);
    }
  };

  const handleAddRoute = async () => {
    const domain = newDomain.trim();
    const port = Number(newTargetPort);
    if (!domain || Number.isNaN(port) || port < 1 || port > 65535) return;
    try {
      await invoke("add_local_route", {
        domain,
        targetHost: newTargetHost.trim() || "127.0.0.1",
        targetPort: port,
      });
      setNewDomain("");
      setNewTargetHost("127.0.0.1");
      setNewTargetPort("3000");
      await fetchRoutes();
    } catch (e) {
      console.error("add_local_route:", e);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await invoke("remove_local_route", { id });
      await fetchRoutes();
    } catch (e) {
      console.error("remove_local_route:", e);
    }
  };

  const handleToggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await invoke("set_local_route_enabled", { id, enabled });
      await fetchRoutes();
    } catch (e) {
      console.error("set_local_route_enabled:", e);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <H1>Proxy</H1>
          </div>
          <P className="text-slate-500">
            Route specific domains to your local server. Set your browser or
            system HTTP proxy to use the proxy below.
          </P>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={{ color: proxyStatus.running ? "green" : "gray" }}
            className="flex items-center gap-2 py-2 px-4 h-auto"
          >
            {proxyStatus.running ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {proxyStatus.port}
              </>
            ) : (
              "Stopped"
            )}
          </Badge>
          {proxyStatus.running ? (
            <Button
              variant="danger"
              size="sm"
              className="gap-2 flex items-center"
              onClick={handleStopProxy}
              disabled={proxyLoading}
            >
              {proxyLoading ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Stop proxy
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="gap-2 flex items-center"
              onClick={handleStartProxy}
              disabled={proxyLoading}
            >
              {proxyLoading ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start proxy
            </Button>
          )}
        </div>
      </header>

      <Card className="p-4 bg-amber-50/80 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 mb-1">
              How to use the proxy
            </h3>
            <p className="text-sm text-amber-700">
              Set your browser or system <strong>HTTP/HTTPS proxy</strong> to{" "}
              <code className="bg-amber-100 px-1 rounded">
                127.0.0.1:{proxyStatus.running ? proxyStatus.port : "8888"}
              </code>
              . Then requests to domains listed below will be sent to your local
              target. Other traffic passes through. (Windows: Settings → Network
              → Proxy; macOS: System Settings → Network → Proxies; browser
              extensions: e.g. SwitchyOmega.)
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add route
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="proxy-route-domain"
              className="text-xs font-medium text-slate-500"
            >
              Domain (host)
            </label>
            <Input
              id="proxy-route-domain"
              placeholder="api.example.com"
              className="w-48 md:w-56 focus:ring-violet-500"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="proxy-route-host"
              className="text-xs font-medium text-slate-500"
            >
              Target host
            </label>
            <Input
              id="proxy-route-host"
              placeholder="127.0.0.1"
              className="w-32 focus:ring-violet-500"
              value={newTargetHost}
              onChange={(e) => setNewTargetHost(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="proxy-route-port"
              className="text-xs font-medium text-slate-500"
            >
              Target port
            </label>
            <Input
              id="proxy-route-port"
              placeholder="3000"
              className="w-20 focus:ring-violet-500"
              value={newTargetPort}
              onChange={(e) => setNewTargetPort(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            className="gap-2 flex items-center"
            onClick={handleAddRoute}
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </Card>

      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Routes ({routes.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : routes.length === 0 ? (
          <p className="text-slate-500 text-sm py-6">
            No routes yet. Add a domain and target above.
          </p>
        ) : (
          <ul className="space-y-2">
            {routes.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-violet-100 transition-colors"
              >
                <span className="font-mono text-sm font-medium text-slate-800">
                  {r.domain}
                </span>
                <span className="text-slate-400">→</span>
                <span className="text-sm text-slate-600">
                  {r.target_host}:{r.target_port}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleEnabled(r.id, !r.enabled)}
                  className="ml-auto"
                >
                  <Badge
                    variant={{ color: r.enabled ? "green" : "gray" }}
                    className="cursor-pointer hover:opacity-80"
                  >
                    {r.enabled ? "On" : "Off"}
                  </Badge>
                </button>
                <Button
                  variant="danger"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleRemove(r.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
