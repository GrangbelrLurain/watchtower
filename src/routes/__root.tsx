import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import {
  ActivityIcon,
  FileTextIcon,
  GlobeIcon,
  History,
  HomeIcon,
  LayoutGrid,
  PlusIcon,
  ServerIcon,
  SettingsIcon,
  WifiIcon,
} from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import {
  apiLoggingCountAtom,
  domainCountAtom,
  loadAppStatus,
  proxyLocalRoutingEnabledAtom,
  proxyRunningAtom,
} from "@/domain/app-status/store";
import { languageAtom } from "@/domain/i18n/store";
import { Sidebar } from "@/features/sidebar/ui/Sidebar";
import { UpdateBanner, useUpdateCheck } from "@/features/update";
import { UserProfileSetup } from "@/features/user-profile/ui/UserProfileSetup";
import { Titlebar } from "@/shared/ui/layout/Titlebar";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";
import { en } from "./root.en";
import { ko } from "./root.ko";

const RootLayout = () => {
  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;

  // ── Global App Status ──────────────────────────────────────────────────────
  const [, setDomainCount] = useAtom(domainCountAtom);
  const [, setApiLoggingCount] = useAtom(apiLoggingCountAtom);
  const [, setProxyRunning] = useAtom(proxyRunningAtom);
  const [, setProxyLocalRouting] = useAtom(proxyLocalRoutingEnabledAtom);

  useEffect(() => {
    loadAppStatus(setDomainCount, setApiLoggingCount, setProxyRunning, setProxyLocalRouting);

    // Listen for real-time proxy status changes
    const unlistenProxy = listen<{ running: boolean; local_routing_enabled: boolean }>(
      "proxy-status-changed",
      (event) => {
        if (event.payload) {
          setProxyRunning(event.payload.running);
          setProxyLocalRouting(event.payload.local_routing_enabled);
        }
      },
    );

    const interval = setInterval(() => {
      loadAppStatus(setDomainCount, setApiLoggingCount, setProxyRunning, setProxyLocalRouting);
    }, 60_000);

    return () => {
      clearInterval(interval);
      unlistenProxy.then((fn) => fn());
    };
  }, [setDomainCount, setApiLoggingCount, setProxyRunning, setProxyLocalRouting]);

  const sidebarItems: ComponentProps<typeof Sidebar>["items"] = useMemo(
    () => [
      {
        label: t.home,
        icon: <HomeIcon className="w-4 h-4" />,
        href: "/",
      },
      {
        label: t.domains,
        icon: <GlobeIcon className="w-4 h-4" />,
        href: "/domains/dashboard",
        children: [
          {
            label: t.dashboard,
            icon: <LayoutGrid className="w-4 h-4" />,
            href: "/domains/dashboard",
          },
          {
            label: t.regist,
            icon: <PlusIcon className="w-4 h-4" />,
            href: "/domains/regist",
          },
          {
            label: t.groups,
            icon: <LayoutGrid className="w-4 h-4" />,
            href: "/domains/groups",
          },
        ],
      },
      {
        label: t.monitor,
        icon: <ActivityIcon className="w-4 h-4" />,
        href: "/monitor",
        children: [
          {
            label: t.dashboard,
            icon: <ActivityIcon className="w-4 h-4" />,
            href: "/monitor",
          },
          {
            label: t.logs,
            icon: <History className="w-4 h-4" />,
            href: "/monitor/logs",
          },
          {
            label: t.settings,
            icon: <SettingsIcon className="w-4 h-4" />,
            href: "/monitor/settings",
          },
        ],
      },
      {
        label: t.proxy,
        icon: <ServerIcon className="w-4 h-4" />,
        href: "/proxy/dashboard",
        children: [
          {
            label: t.dashboard,
            icon: <ServerIcon className="w-4 h-4" />,
            href: "/proxy/dashboard",
          },
          {
            label: t.setup,
            icon: <SettingsIcon className="w-4 h-4" />,
            href: "/proxy/setup",
          },
        ],
      },
      {
        label: t.apis,
        icon: <WifiIcon className="w-4 h-4" />,
        href: "/apis/dashboard",
        children: [
          {
            label: t.dashboard,
            icon: <WifiIcon className="w-4 h-4" />,
            href: "/apis/dashboard",
          },
          {
            label: t.settings,
            icon: <SettingsIcon className="w-4 h-4" />,
            href: "/apis/settings",
          },
          {
            label: t.schema,
            icon: <FileTextIcon className="w-4 h-4" />,
            href: "/apis/schema",
          },
          {
            label: t.logs,
            icon: <History className="w-4 h-4" />,
            href: "/apis/logs",
          },
        ],
      },
      {
        label: t.server_logs,
        icon: <History className="w-4 h-4" />,
        href: "/server-logs",
      },
    ],
    [t],
  );
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const { update } = useUpdateCheck({ onMount: true, delayMs: 3000 });
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const showUpdateBanner = update && !dismissedUpdate;

  return (
    <div className="flex flex-col bg-[#F8FAFC] h-screen w-full font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        {/* Global Loading Overlay */}
        <AnimatePresence>{isLoading && <LoadingScreen key="global-loader" />}</AnimatePresence>

        <Sidebar items={sidebarItems} />
        <UserProfileSetup />

        <main className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <div className="max-w-(--breakpoint-2xl) mx-auto p-6 md:p-8 lg:p-12">
            {showUpdateBanner && (
              <div className="mb-4">
                <UpdateBanner update={update} onDismiss={() => setDismissedUpdate(true)} />
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
};

export const Route = createRootRoute({ component: RootLayout });
