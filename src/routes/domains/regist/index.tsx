import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Globe,
  Loader2Icon,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/shared/ui/badge/badge";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Textarea } from "@/shared/ui/textarea/Textarea";
import { H1, P } from "@/shared/ui/typography/typography";

function RegistDomains() {
  const urlInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [addedUrls, setAddedUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const registDomains = async (urls: string[]) => {
    if (urls.length === 0) return;

    setStatus("loading");
    try {
      const response = await invoke<{ success: boolean; message: string }>(
        "regist_domains",
        {
          urls,
        },
      );

      if (response.success) {
        setStatus("success");
        setMessage(response.message);
        setAddedUrls([]);
        setTimeout(() => navigate({ to: "/domains" }), 1500);
      } else {
        setStatus("error");
        setMessage(response.message);
      }
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  const downloadJson = async () => {
    if (addedUrls.length === 0) return;
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
        defaultPath: `watchtower-queue-${new Date().toISOString().slice(0, 10)}.json`,
      });

      if (path) {
        const data = JSON.stringify(addedUrls, null, 2);
        await writeTextFile(path, data);
        setStatus("success");
        setMessage("File saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save JSON:", err);
      // Fallback
      const data = JSON.stringify(addedUrls, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `watchtower-queue-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let urls: string[] = [];
        if (Array.isArray(parsed)) {
          urls = parsed
            .map((item) =>
              typeof item === "string" ? item : (item.url as string),
            )
            .filter(Boolean);
        } else if (parsed.urls && Array.isArray(parsed.urls)) {
          urls = parsed.urls as string[];
        }

        if (urls.length > 0) {
          setAddedUrls((prev) => [...new Set([...prev, ...urls])]);
          setStatus("success");
          setMessage(`${urls.length} URLs imported from file.`);
        }
      } catch (_err) {
        setStatus("error");
        setMessage("Invalid JSON file format.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  const updateAddedUrls = () => {
    if (urlInputRef.current) {
      const value = urlInputRef.current.value;
      const urls = value
        .split("\n")
        .flatMap((line) => line.split(",").map((url) => url.trim()))
        .filter((url) => {
          try {
            new URL(url.startsWith("http") ? url : `https://${url}`);
            return true;
          } catch {
            return false;
          }
        })
        .map((url) => (url.startsWith("http") ? url : `https://${url}`))
        .filter((url) => !addedUrls.includes(url));

      if (urls.length > 0) {
        setAddedUrls((prev) => [...prev, ...urls]);
      }
      urlInputRef.current.value = "";
      urlInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      updateAddedUrls();
      return;
    }
    if (e.key === "," || (e.key === "Enter" && !e.shiftKey)) {
      if (urlInputRef.current?.value.trim()) {
        e.preventDefault();
        updateAddedUrls();
      }
    }
  };

  const removeUrl = (urlToRemove: string) => {
    setAddedUrls(addedUrls.filter((u) => u !== urlToRemove));
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Plus className="w-5 h-5" />
          </div>
          <H1>Add New Targets</H1>
        </div>
        <P className="text-slate-500">
          Enter one or more domains to start monitoring their health and uptime.
        </P>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3 flex flex-col gap-6">
          <Card className="p-6">
            <label
              htmlFor="url-import"
              className="block text-sm font-semibold mb-3 text-slate-700"
            >
              Import URLs
            </label>
            <Textarea
              id="url-import"
              placeholder="example.com&#10;api.service.io, dev.test.com"
              className="min-h-[200px] mb-4 font-mono text-sm leading-relaxed w-full"
              ref={urlInputRef}
              onKeyDown={handleKeyDown}
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <Upload className="w-3.5 h-3.5 inline-block" /> Upload JSON
                </Button>
                {addedUrls.length > 0 && (
                  <Button
                    type="button"
                    onClick={downloadJson}
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="w-3.5 h-3.5 inline-block" /> Export
                  </Button>
                )}
              </div>
              <Button
                type="button"
                onClick={updateAddedUrls}
                variant="primary"
                size="sm"
              >
                Parse & Add
              </Button>
            </div>
          </Card>

          {status === "success" && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">{message}</span>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{message}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => registDomains(addedUrls)}
              disabled={status === "loading" || addedUrls.length === 0}
              variant="primary"
              className="flex-1 py-6 text-lg shadow-lg shadow-blue-500/20"
            >
              {status === "loading" ? (
                <Loader2Icon className="animate-spin mr-2 inline-block" />
              ) : (
                <Plus className="w-5 h-5 mr-2 inline-block" />
              )}
              Start Monitoring {addedUrls.length > 0 && `(${addedUrls.length})`}
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="sticky top-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                Queue
                <Badge variant={{ color: "blue" }}>{addedUrls.length}</Badge>
              </h3>
              {addedUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAddedUrls([])}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3 inline-block" /> Clear
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {addedUrls.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <Globe className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">
                    No domains in queue
                  </p>
                </div>
              ) : (
                addedUrls.map((url) => (
                  <div
                    key={url}
                    className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all animate-in zoom-in-95 duration-200"
                  >
                    <span className="text-xs font-mono text-slate-600 truncate mr-2">
                      {url}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeUrl(url)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4 inline-block" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/domains/regist/")({
  component: RegistDomains,
});
