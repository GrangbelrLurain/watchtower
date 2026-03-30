import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { Activity, Loader2, Server, Wifi } from "lucide-react";
import { useState } from "react";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/input/Input";
import { Modal } from "@/shared/ui/modal/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DomainFeatureState {
  monitorEnabled: boolean | undefined; // undefined = link not found yet
  proxyEnabled: boolean | undefined; // undefined = no local route exists
  proxyRouteId: number | undefined; // local route id (for enable/disable)
  apiLoggingEnabled: boolean | undefined; // undefined = link not found
}

interface FeatureBadgeT {
  featureMonitor: string;
  featureProxy: string;
  featureApiLogging: string;
  featureOn: string;
  featureOff: string;
  featureTogglingOn: string;
  featureTogglingOff: string;
  featureProxyGlobalOff: string;
  featureProxyGlobalOffLink: string;
  proxyRouteModalTitle: string;
  proxyRouteModalDesc: (domain: string) => string;
  proxyRouteTargetHost: string;
  proxyRouteTargetPort: string;
  proxyRouteAdd: string;
  proxyRouteCancel: string;
  proxyRouteAdding: string;
}

interface DomainFeatureBadgesProps {
  domainId: number;
  domainUrl: string;
  state: DomainFeatureState;
  proxyActive: boolean; // global proxy running AND local_routing_enabled
  t: FeatureBadgeT;
  onRefresh: () => void; // called after any mutation to re-fetch parent data
}

// ── Tiny badge chip ────────────────────────────────────────────────────────────

interface ChipProps {
  icon: React.ReactNode;
  label: string;
  statusLabel: string;
  active: boolean | undefined;
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function FeatureChip({ icon, label, statusLabel, active, loading, onClick, disabled }: ChipProps) {
  const isUnset = active === undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150 select-none border",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-400",
        loading && "opacity-60 cursor-wait",
        !loading && !disabled && "cursor-pointer hover:border-blue-300 hover:bg-white transition-all",
        disabled && !loading && "cursor-not-allowed opacity-50",
        active === true && "bg-green-50 border-green-200 text-green-700",
        active === false && "bg-slate-50 border-slate-200 text-slate-500",
        isUnset && "bg-slate-50 border-slate-200 text-slate-400",
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        ) : (
          <div
            className={clsx(
              "w-1.5 h-1.5 rounded-full shrink-0",
              active === true && "bg-green-500 animate-pulse",
              active === false && "bg-slate-400",
              isUnset && "bg-slate-300",
            )}
          />
        )}
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <span className={clsx("opacity-60 text-[10px] shrink-0", active === true && "text-green-600/80")}>
        {loading ? "..." : statusLabel}
      </span>
    </button>
  );
}

// ── Proxy Route mini-modal ──────────────────────────────────────────────────────

interface ProxyRouteModalProps {
  domainUrl: string;
  t: FeatureBadgeT;
  onClose: () => void;
  onAdded: () => void;
}

function ProxyRouteModal({ domainUrl, t, onClose, onAdded }: ProxyRouteModalProps) {
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("3000");
  const [adding, setAdding] = useState(false);

  let domainHost = domainUrl;
  try {
    const u = new URL(domainUrl.startsWith("http") ? domainUrl : `https://${domainUrl}`);
    domainHost = u.hostname;
  } catch (e) {
    console.error("Invalid URL:", e);
  }

  const handleAdd = async () => {
    const portNum = Number(port);
    if (!host.trim() || Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return;
    }
    setAdding(true);
    try {
      await invokeApi("add_local_route", {
        payload: {
          domain: domainHost,
          targetHost: host.trim(),
          targetPort: portNum,
        },
      });
      onAdded();
      onClose();
    } catch (e) {
      console.error("add_local_route:", e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <Modal.Header title={t.proxyRouteModalTitle} description={t.proxyRouteModalDesc(domainHost)} />
      <Modal.Body className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="proxy-route-host" className="block text-xs font-bold text-slate-500 ml-1">
            {t.proxyRouteTargetHost}
          </label>
          <Input
            id="proxy-route-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="localhost"
            className="w-full rounded-2xl h-11 px-4 shadow-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="proxy-route-port" className="block text-xs font-bold text-slate-500 ml-1">
            {t.proxyRouteTargetPort}
          </label>
          <Input
            id="proxy-route-port"
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="3000"
            className="w-full rounded-2xl h-11 px-4 shadow-sm"
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={adding} className="px-6 rounded-xl">
          {t.proxyRouteCancel}
        </Button>
        <Button onClick={handleAdd} disabled={adding} className="px-8 rounded-xl shadow-lg shadow-indigo-200">
          {adding ? t.proxyRouteAdding : t.proxyRouteAdd}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ── Proxy Global Off toast banner ───────────────────────────────────────────────

interface ProxyOffToastProps {
  t: FeatureBadgeT;
  onClose: () => void;
}

function ProxyOffToast({ t, onClose }: ProxyOffToastProps) {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-100 flex items-center gap-3 bg-slate-900 border border-slate-700 text-white rounded-2xl px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-sm animate-in slide-in-from-bottom-10 duration-500">
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span className="font-medium">{t.featureProxyGlobalOff}</span>
      <Link
        to="/proxy/dashboard"
        onClick={onClose}
        className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors ml-2 px-3 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20"
      >
        {t.featureProxyGlobalOffLink}
      </Link>
      <button
        type="button"
        onClick={onClose}
        className="ml-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DomainFeatureBadges({
  domainId,
  domainUrl,
  state,
  proxyActive,
  t,
  onRefresh,
}: DomainFeatureBadgesProps) {
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [showProxyOffToast, setShowProxyOffToast] = useState(false);

  // ── Monitor toggle ──────────────────────────────────────────────────────────
  const handleMonitorToggle = async () => {
    setMonitorLoading(true);
    try {
      // If no monitor link yet (undefined), enabling creates one
      const newEnabled = state.monitorEnabled !== true;
      await invokeApi("set_domain_monitor_check_enabled", {
        payload: { domainIds: [domainId], enabled: newEnabled },
      });
      onRefresh();
    } catch (e) {
      console.error("set_domain_monitor_check_enabled:", e);
    } finally {
      setMonitorLoading(false);
    }
  };

  // ── Proxy toggle ────────────────────────────────────────────────────────────
  const handleProxyClick = async () => {
    if (!proxyActive) {
      // Global proxy is off — show toast
      setShowProxyOffToast(true);
      setTimeout(() => setShowProxyOffToast(false), 4000);
      return;
    }

    if (state.proxyRouteId === undefined) {
      // No route yet — open mini-modal to add
      setShowProxyModal(true);
      return;
    }

    // Route exists — toggle enabled
    setProxyLoading(true);
    try {
      await invokeApi("update_local_route", {
        payload: {
          id: state.proxyRouteId,
          enabled: state.proxyEnabled !== true,
        },
      });
      onRefresh();
    } catch (e) {
      console.error("update_local_route:", e);
    } finally {
      setProxyLoading(false);
    }
  };

  // ── API Logging toggle ──────────────────────────────────────────────────────
  const handleApiLoggingToggle = async () => {
    setApiLoading(true);
    try {
      if (state.apiLoggingEnabled === true) {
        await invokeApi("remove_domain_api_logging", {
          payload: { domainId },
        });
      } else {
        await invokeApi("set_domain_api_logging", {
          payload: {
            domainId,
            loggingEnabled: true,
            bodyEnabled: false,
            schemaUrl: null,
          },
        });
      }
      onRefresh();
    } catch (e) {
      console.error("toggle_api_logging:", e);
    } finally {
      setApiLoading(false);
    }
  };

  // ── Proxy badge display logic ────────────────────────────────────────────────
  // active === undefined means "no route"; false means "route disabled"
  const proxyBadgeActive = !proxyActive ? false : state.proxyEnabled;

  const proxyStatusLabel = !proxyActive
    ? t.featureOff
    : state.proxyRouteId === undefined
      ? t.featureOff
      : state.proxyEnabled
        ? t.featureOn
        : t.featureOff;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {/* Monitor */}
        <FeatureChip
          icon={<Activity className="w-3 h-3" />}
          label={t.featureMonitor}
          statusLabel={state.monitorEnabled === true ? t.featureOn : t.featureOff}
          active={state.monitorEnabled}
          loading={monitorLoading}
          onClick={handleMonitorToggle}
        />

        {/* Proxy */}
        <FeatureChip
          icon={<Server className="w-3 h-3" />}
          label={t.featureProxy}
          statusLabel={proxyStatusLabel}
          active={proxyBadgeActive}
          loading={proxyLoading}
          onClick={handleProxyClick}
        />

        {/* API Logging */}
        <FeatureChip
          icon={<Wifi className="w-3 h-3" />}
          label={t.featureApiLogging}
          statusLabel={state.apiLoggingEnabled === true ? t.featureOn : t.featureOff}
          active={state.apiLoggingEnabled}
          loading={apiLoading}
          onClick={handleApiLoggingToggle}
        />
      </div>

      {/* Proxy route add modal */}
      {showProxyModal && (
        <ProxyRouteModal domainUrl={domainUrl} t={t} onClose={() => setShowProxyModal(false)} onAdded={onRefresh} />
      )}

      {/* Proxy global off toast */}
      {showProxyOffToast && <ProxyOffToast t={t} onClose={() => setShowProxyOffToast(false)} />}
    </>
  );
}
