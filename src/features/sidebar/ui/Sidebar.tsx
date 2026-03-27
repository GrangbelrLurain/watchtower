import { Link, useRouterState } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { ChevronRight, Settings } from "lucide-react";
import { getInitials, userProfileAtom } from "@/domain/user/store";

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = useAtomValue(userProfileAtom);
  const initials = getInitials(profile.name || "User");

  return (
    <aside className="flex flex-col gap-1 p-4 w-72 bg-slate-950 text-slate-300 border-r border-slate-800 shadow-2xl z-10 h-full shrink-0">
      <div className="h-4" />

      <nav className="flex flex-col gap-1 space-y-1">
        {items.map((item) => {
          const isParentActive = pathname === item.href || item.children?.some((child) => pathname === child.href);

          return (
            <div key={item.href} className="flex flex-col">
              <Link
                to={item.href}
                className={clsx(
                  "group flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 outline-none",
                  isParentActive ? "bg-blue-600/10 text-blue-400 font-semibold" : "hover:bg-slate-900 hover:text-white",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "transition-transform duration-200 group-hover:scale-110",
                      isParentActive ? "text-blue-400" : "text-slate-500",
                    )}
                  >
                    {item.icon}
                  </div>
                  <span className="text-sm tracking-wide">{item.label}</span>
                </div>
                {item.children && (
                  <ChevronRight
                    className={clsx(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      isParentActive ? "rotate-90 text-blue-400" : "text-slate-600",
                    )}
                  />
                )}
              </Link>

              {item.children && isParentActive && (
                <div className="flex flex-col mt-1 ml-4 pl-4 border-l border-slate-800 space-y-1 animate-in slide-in-from-left-2 duration-300">
                  {item.children.map((child) => {
                    const isActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        to={child.href}
                        className={clsx(
                          "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200",
                          isActive
                            ? "text-white font-medium bg-slate-900"
                            : "text-slate-500 hover:text-slate-200 hover:translate-x-1",
                        )}
                      >
                        <div className={clsx("w-1 h-1 rounded-full", isActive ? "bg-blue-500" : "bg-slate-700")} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto p-4 bg-slate-900/50 rounded-xl border border-slate-800/50 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/profile" className="flex items-center gap-3 min-w-0 group/profile flex-1 outline-none">
            <div
              className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md group-hover/profile:scale-105 transition-transform",
                profile.avatarColor,
              )}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0 gap-1">
              <span className="text-sm font-bold text-white leading-none truncate group-hover/profile:text-indigo-400 transition-colors">
                {profile.name || "Watchtower"}
              </span>
              <span className="text-[10px] font-medium text-slate-400 truncate">{profile.role || "User"}</span>
            </div>
          </Link>

          <Link
            to="/settings"
            className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all outline-none",
              pathname === "/settings"
                ? "bg-blue-600/20 text-blue-400"
                : "text-slate-500 hover:bg-slate-800 hover:text-white",
            )}
            title="Settings"
          >
            <Settings className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
