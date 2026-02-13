import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
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
import type { ComponentProps } from "react";
import { Sidebar } from "@/features/sidebar/ui/Sidebar";

const sidebarItems: ComponentProps<typeof Sidebar>["items"] = [
  {
    label: "Home",
    icon: <HomeIcon className="w-4 h-4" />,
    href: "/",
  },
  {
    label: "Domains",
    icon: <GlobeIcon className="w-4 h-4" />,
    href: "/domains/dashboard",
    children: [
      {
        label: "Dashboard",
        icon: <LayoutGrid className="w-4 h-4" />,
        href: "/domains/dashboard",
      },
      {
        label: "Regist",
        icon: <PlusIcon className="w-4 h-4" />,
        href: "/domains/regist",
      },
      {
        label: "Groups",
        icon: <LayoutGrid className="w-4 h-4" />,
        href: "/domains/groups",
      },
    ],
  },
  {
    label: "Monitor",
    icon: <ActivityIcon className="w-4 h-4" />,
    href: "/monitor",
    children: [
      {
        label: "Dashboard",
        icon: <ActivityIcon className="w-4 h-4" />,
        href: "/monitor",
      },
      {
        label: "Logs",
        icon: <History className="w-4 h-4" />,
        href: "/monitor/logs",
      },
      {
        label: "Settings",
        icon: <SettingsIcon className="w-4 h-4" />,
        href: "/monitor/settings",
      },
    ],
  },
  {
    label: "Proxy",
    icon: <ServerIcon className="w-4 h-4" />,
    href: "/proxy/dashboard",
    children: [
      {
        label: "Dashboard",
        icon: <ServerIcon className="w-4 h-4" />,
        href: "/proxy/dashboard",
      },
      {
        label: "Setup",
        icon: <SettingsIcon className="w-4 h-4" />,
        href: "/proxy/setup",
      },
    ],
  },
  {
    label: "APIs",
    icon: <WifiIcon className="w-4 h-4" />,
    href: "/apis/dashboard",
    children: [
      {
        label: "Dashboard",
        icon: <WifiIcon className="w-4 h-4" />,
        href: "/apis/dashboard",
      },
      {
        label: "Schema",
        icon: <FileTextIcon className="w-4 h-4" />,
        href: "/apis/schema",
      },
      {
        label: "Logs",
        icon: <History className="w-4 h-4" />,
        href: "/apis/logs",
      },
    ],
  },
];

import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { UpdateBanner, useUpdateCheck } from "@/features/update";
import { Titlebar } from "@/shared/ui/layout/Titlebar";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";

const RootLayout = () => {
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
