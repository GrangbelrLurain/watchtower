import { useEffect, useState } from "react";
import { DEFAULT_DARK_THEME } from "@/entities/app/theme/presets";
import type { CustomTheme } from "@/entities/app/theme/types";

function isLightBackground(hex?: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  const c = hex.replace("#", "");
  const num = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  if (Number.isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 140;
}

function injectThemeStyles(theme: CustomTheme) {
  const colors = theme.colors || {};
  const isLight = theme.base === "light" || isLightBackground(colors.base100);

  const vars = `
    --color-base-100: ${colors.base100 || (isLight ? "#ffffff" : "#0f172a")};
    --color-base-200: ${colors.base200 || (isLight ? "#f8fafc" : "#020617")};
    --color-base-300: ${colors.base300 || (isLight ? "#f1f5f9" : "#1e293b")};
    --color-base-content: ${colors.content || (isLight ? "#0f172a" : "#f8fafc")};
    --color-primary: ${colors.primary || (isLight ? "#3b82f6" : "#60a5fa")};
    --color-primary-content: ${colors.primaryContent || (isLight ? "#ffffff" : "#020617")};
    --color-secondary: ${colors.secondary || (isLight ? "#4f46e5" : "#818cf8")};
    --color-accent: ${colors.accent || (isLight ? "#0ea5e9" : "#38bdf8")};
    --color-success: ${isLight ? "#10b981" : "#34d399"};
    --color-warning: ${isLight ? "#f59e0b" : "#fbbf24"};
    --color-error: ${isLight ? "#ef4444" : "#f87171"};
    --color-info: ${isLight ? "#0ea5e9" : "#38bdf8"};

    --wt-bg-panel: var(--color-base-100);
    --wt-bg-panel-translucent: color-mix(in srgb, var(--color-base-100) 96%, transparent);
    --wt-bg-card: var(--color-base-200);
    --wt-bg-card-hover: var(--color-base-300);
    --wt-bg-subtle: color-mix(in srgb, var(--color-base-content) 6%, transparent);
    --wt-bg-active: color-mix(in srgb, var(--color-primary) 16%, transparent);

    --wt-text-main: var(--color-base-content);
    --wt-text-muted: color-mix(in srgb, var(--color-base-content) 65%, transparent);
    --wt-text-faint: color-mix(in srgb, var(--color-base-content) 45%, transparent);

    --wt-border: var(--color-base-300);
    --wt-border-translucent: color-mix(in srgb, var(--color-base-content) 16%, transparent);
    --wt-border-primary: var(--color-primary);

    --wt-shadow: ${isLight ? "0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.05)" : "0 25px 50px -12px rgba(0, 0, 0, 0.7)"};

    color-scheme: ${isLight ? "light" : "dark"};
  `;

  const cssText = `
    :host, #wt-root, #horizon-gateway-injection-container {
      ${vars}
      color: var(--wt-text-main);
      font-family: system-ui, -apple-system, sans-serif;
    }
  `;

  const host = document.getElementById("horizon-gateway-injection-container");
  const shadow = host?.shadowRoot;
  if (shadow) {
    let styleTag = shadow.querySelector("#wt-theme-vars") as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "wt-theme-vars";
      shadow.prepend(styleTag);
    }
    styleTag.textContent = cssText;
  }
}

export function useInjectionTheme() {
  const [theme, setTheme] = useState<CustomTheme>(() => {
    try {
      const raw = localStorage.getItem("horizon-gateway-theme-cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.colors) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_DARK_THEME;
  });

  useEffect(() => {
    injectThemeStyles(theme);
  }, [theme]);

  useEffect(() => {
    let lastJson = "";

    const applyNewTheme = (newTheme: CustomTheme) => {
      if (!newTheme?.colors) {
        return;
      }
      const serialized = JSON.stringify(newTheme);
      if (serialized === lastJson) {
        return;
      }
      lastJson = serialized;
      console.log("🎨 [Horizon Gateway] Applying Injection Theme:", newTheme.name || newTheme.id);
      setTheme(newTheme);
      injectThemeStyles(newTheme);
      try {
        localStorage.setItem("horizon-gateway-theme-cache", serialized);
      } catch {}
    };

    console.log("🎨 [Horizon Gateway] useInjectionTheme initializing...");

    // 1. Ask parent iframe immediately
    try {
      window.parent.postMessage({ type: "WT_GET_THEME" }, "*");
      window.parent.postMessage({ type: "WT_READY" }, "*");
    } catch {}

    const fetchTheme = () => {
      fetch("/.horizon-gateway/api/theme")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.colors) {
            applyNewTheme(data);
          }
        })
        .catch(() => {});
    };

    // 2. Initial fetch active theme from Horizon Gateway local proxy backend
    fetchTheme();

    // 3. Periodic polling to sync theme changes from Gateway app in real time
    const pollInterval = setInterval(fetchTheme, 3000);

    // 4. Listen for postMessage from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "WT_SET_THEME" && event.data?.payload) {
        applyNewTheme(event.data.payload);
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return { theme, setTheme };
}
