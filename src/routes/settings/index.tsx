import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  RefreshCw,
  Settings as SettingsIcon,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ProxySettings } from "@/entities/proxy/types/local_route";
import type { SettingsExport } from "@/entities/settings/types/settings_export";
import { UpdateBanner, useUpdateCheck } from "@/features/update";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const [proxySettings, setProxySettings] = useState<ProxySettings | null>(
    null,
  );
  const [dnsServerInput, setDnsServerInput] = useState("");
  const {
    update,
    isChecking,
    error: updateError,
    checkForUpdates,
  } = useUpdateCheck({ onMount: false });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await invokeApi("get_proxy_settings");
      if (res.success && res.data) {
        setProxySettings(res.data);
        setDnsServerInput(res.data.dns_server ?? "");
      }
    } catch (e) {
      console.error("get_proxy_settings:", e);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveDnsServer = async () => {
    const value = dnsServerInput.trim() || null;
    try {
      const res = await invokeApi("set_proxy_dns_server", {
        dnsServer: value === "" ? null : value,
      });
      if (res.success && res.data) {
        setProxySettings(res.data);
      }
    } catch (e) {
      console.error("set_proxy_dns_server:", e);
    }
  };

  const handleExport = async () => {
    try {
      const res = await invokeApi("export_all_settings");
      if (!res.success || !res.data) return;
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        filters: [{ name: "JSON", extensions: ["json"] }],
        defaultPath: `watchtower-settings-${new Date().toISOString().slice(0, 10)}.json`,
      });
      if (path) {
        await writeTextFile(path, JSON.stringify(res.data, null, 2));
        alert("Settings exported successfully.");
      }
    } catch (e) {
      console.error("export_all_settings:", e);
      alert("Export failed. See console for details.");
    }
  };

  const handleImport = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (path === null || Array.isArray(path)) return;
      const raw = await readTextFile(path);
      const data = JSON.parse(raw) as SettingsExport;
      if (typeof data.version !== "number" || !data.domains || !data.groups) {
        alert("Invalid settings file format.");
        return;
      }
      if (
        !confirm(
          "Import will replace all current domains, groups, proxy routes, and settings. Continue?",
        )
      ) {
        return;
      }
      await invokeApi("import_all_settings", { payload: data });
      alert(
        "Settings imported. You may need to refresh domains and proxy pages.",
      );
      fetchSettings();
    } catch (e) {
      console.error("import_all_settings:", e);
      alert("Import failed. See console for details.");
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <H1>Settings</H1>
        </div>
        <P className="text-slate-500">
          Global app settings. DNS server is used for proxy pass-through and
          domain status checks.
        </P>
      </header>

      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <h2 className="font-bold text-slate-800 mb-2">Software update</h2>
        <p className="text-sm text-slate-500 mb-4">
          Check for app updates. Updates are delivered via GitHub Releases.
        </p>
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => checkForUpdates()}
            disabled={isChecking}
          >
            <RefreshCw
              className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`}
            />
            {isChecking ? "Checking..." : "Check for updates"}
          </Button>
          {updateError && (
            <span className="text-sm text-red-600">{updateError}</span>
          )}
          {!update && !isChecking && !updateError && (
            <span className="text-sm text-slate-500">
              Click to check for updates
            </span>
          )}
        </div>
        {update && <UpdateBanner update={update} onDismiss={undefined} />}
      </Card>

      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <h2 className="font-bold text-slate-800 mb-2">DNS server</h2>
        <p className="text-sm text-slate-500 mb-4">
          Used when resolving hostnames: proxy pass-through (when no route
          matches) and domain status checks. Leave empty to use system DNS.
          Example: <code className="bg-slate-100 px-1 rounded">8.8.8.8</code> or{" "}
          <code className="bg-slate-100 px-1 rounded">1.1.1.1:53</code>.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="settings-dns-server"
              className="text-xs font-medium text-slate-500"
            >
              DNS server (IP or IP:port)
            </label>
            <Input
              id="settings-dns-server"
              placeholder="8.8.8.8 or 1.1.1.1:53"
              className="w-40 md:w-48 focus:ring-violet-500"
              value={dnsServerInput}
              onChange={(e) => setDnsServerInput(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleSaveDnsServer}>
            Save
          </Button>
        </div>
        {proxySettings?.dns_server && (
          <p className="text-xs text-slate-500 mt-2">
            Current:{" "}
            <code className="bg-slate-100 px-1 rounded">
              {proxySettings.dns_server}
            </code>
          </p>
        )}
      </Card>

      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <h2 className="font-bold text-slate-800 mb-2">Backup &amp; restore</h2>
        <p className="text-sm text-slate-500 mb-4">
          Export all app data (domains, groups, proxy routes, DNS setting) to a
          JSON file, or import from a previously exported file. Import replaces
          current data.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 flex items-center"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" /> Export settings
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 flex items-center"
            onClick={handleImport}
          >
            <Upload className="w-4 h-4" /> Import settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
