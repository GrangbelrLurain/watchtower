import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence } from "framer-motion";
import {
  Download,
  ExternalLink,
  Globe,
  MoreVertical,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Domain } from "@/entities/domain/types/domain";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { LoadingScreen } from "@/shared/ui/loader/LoadingScreen";

export const Route = createFileRoute("/domains/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invoke<{ success: boolean; data: Domain[] }>(
        "get_domains",
      );
      setDomains(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch domains:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleDeleteDomain = useCallback(
    async (id: number) => {
      if (confirm("Are you sure you want to remove this domain?")) {
        await invoke("remove_domains", { id });
        fetchDomains();
      }
    },
    [fetchDomains],
  );

  const handleClearAll = async () => {
    if (confirm("🚨 DANGER: This will remove ALL tracked domains. Continue?")) {
      try {
        await invoke("clear_all_domains");
        fetchDomains();
      } catch (err) {
        console.error("Failed to clear domains:", err);
      }
    }
  };

  const downloadJson = async () => {
    if (domains.length === 0) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const path = await save({
        filters: [
          {
            name: "JSON",
            extensions: ["json"],
          },
        ],
        defaultPath: `watchtower-domains-${new Date().toISOString().slice(0, 10)}.json`,
      });

      if (path) {
        const data = JSON.stringify(domains, null, 2);
        await writeTextFile(path, data);
        alert("File saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save JSON:", err);
      const data = JSON.stringify(domains, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `watchtower-domains-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const filteredDomains = domains.filter((d) =>
    d.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-8">
      <AnimatePresence>
        {loading && (
          <LoadingScreen
            key="domains-loader"
            onCancel={() => setLoading(false)}
          />
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tracked Domains
            </h1>
          </div>
          <p className="text-slate-500">
            Manage and monitor your digital infrastructure in one place.
          </p>
        </div>
        <Link to="/domains/regist">
          <Button
            variant="primary"
            className="gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 inline-block" /> Add Domain
          </Button>
        </Link>
      </header>

      <Card className="p-2 md:p-4 bg-white/50 backdrop-blur-sm border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search domains..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-start">
            {domains.length > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 h-auto py-2 flex items-center"
                  onClick={downloadJson}
                >
                  <Download className="w-4 h-4" /> Export JSON
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="gap-2 h-auto py-2 flex items-center"
                  onClick={handleClearAll}
                >
                  <Trash2 className="w-4 h-4" /> Clear All
                </Button>
              </>
            )}
            <Badge
              variant={{ color: "blue" }}
              className="flex items-center gap-2 py-2 px-4 h-auto"
            >
              Total: {domains.length}
            </Badge>
          </div>
        </div>

        {filteredDomains.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredDomains.map((domain) => (
              <div
                key={domain.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      {domain.url}
                      <a
                        href={domain.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {domain.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live Status
                  </div>

                  <div className="h-8 w-px bg-slate-100 hidden sm:block mx-1" />

                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-lg"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-lg"
                      onClick={() => handleDeleteDomain(domain.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="sm:hidden">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 w-9 p-0 rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6 justify-center items-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 transition-all">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Globe className="w-10 h-10 text-slate-200" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-lg">
                No domains found
              </h3>
              <p className="text-slate-400 text-sm max-w-[250px] mx-auto mt-1">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "You haven't added any domains to your watchtower yet."}
              </p>
            </div>
            {!searchQuery && (
              <Link to="/domains/regist">
                <Button
                  variant="primary"
                  className="shadow-lg shadow-blue-500/10"
                >
                  Add your first domain
                </Button>
              </Link>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
