import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  ActivityIcon,
  GlobeIcon,
  History,
  HomeIcon,
  PlusIcon,
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
    href: "/domains",
    children: [
      {
        label: "Regist",
        icon: <PlusIcon className="w-4 h-4" />,
        href: "/domains/regist",
      },
      {
        label: "Status",
        icon: <ActivityIcon className="w-4 h-4" />,
        href: "/domains/status",
      },
      {
        label: "Logs",
        icon: <History className="w-4 h-4" />,
        href: "/domains/status/logs",
      },
    ],
  },
];

import { useRouterState } from "@tanstack/react-router";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";

const RootLayout = () => {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen w-full font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {isLoading && <LoadingScreen />}
      <Sidebar items={sidebarItems} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-(--breakpoint-2xl) mx-auto p-6 md:p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
};

export const Route = createRootRoute({ component: RootLayout });
