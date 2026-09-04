import { useRouterState } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import {
  Bug,
  Camera,
  Check,
  ExternalLink,
  Github,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Scissors,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { installIdAtom, languageAtom, proxyRunningAtom, supabaseSessionAtom } from "@/entities/app";
import { proxyPortInputAtom } from "@/entities/proxy";
import { commands } from "@/shared/api";
import { supabase } from "@/shared/api/supabase";
import { APP_VERSION, getOsLabel } from "@/shared/lib/appMeta";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/input/Input";
import { Modal } from "@/shared/ui/modal/Modal";
import { Textarea } from "@/shared/ui/textarea/Textarea";
import { toastError, toastInfo, toastSuccess } from "@/shared/ui/toast";
import { en } from "../i18n/en";
import { ko } from "../i18n/ko";
import { bugReportModalOpenAtom, bugReportScreenshotAtom } from "../store";
import type { BugReportCategory } from "../types";

export function BugReportModal() {
  const [isOpen, setIsOpen] = useAtom(bugReportModalOpenAtom);
  const [screenshot, setScreenshot] = useAtom(bugReportScreenshotAtom);

  const lang = useAtomValue(languageAtom);
  const t = lang === "ko" ? ko : en;

  const session = useAtomValue(supabaseSessionAtom);
  const installId = useAtomValue(installIdAtom);
  const proxyRunning = useAtomValue(proxyRunningAtom);
  const proxyPort = useAtomValue(proxyPortInputAtom);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [category, setCategory] = useState<BugReportCategory>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [includeSysInfo, setIncludeSysInfo] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-capture screenshot on first open if empty
  const handleCaptureWindow = useCallback(async () => {
    setIsCapturing(true);
    try {
      const res = await commands.captureAppScreenshot();
      if (res.status === "ok" && res.data) {
        setScreenshot(res.data);
      }
    } catch (err) {
      console.warn("Failed to capture app screenshot natively:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [setScreenshot]);

  useEffect(() => {
    if (isOpen && !screenshot) {
      handleCaptureWindow();
    }
  }, [isOpen, screenshot, handleCaptureWindow]);

  // Global paste event listener to accept screenshot from clipboard (Ctrl+V)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) {
        return;
      }
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                setScreenshot(reader.result);
                toastSuccess(t.copiedToClipboard);
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, t, setScreenshot]);

  const handleOpenSnippingTool = async () => {
    try {
      await commands.triggerOsSnip();
      toastInfo(t.snipHint);
    } catch (err) {
      toastError(String(err));
    }
  };

  const copyDataUrlToClipboard = async (dataUrl: string) => {
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          } catch (clipErr) {
            console.warn("Clipboard write failed:", clipErr);
          }
        }
      }, "image/png");
    } catch (err) {
      console.warn("Failed to copy image to clipboard:", err);
    }
  };

  const handleCreateGithubIssue = async () => {
    if (!title.trim()) {
      toastError(lang === "ko" ? "제목을 입력해 주세요." : "Please enter a title.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (screenshot) {
        await copyDataUrlToClipboard(screenshot);
      }

      const categoryPrefix = category === "bug" ? "[Bug]" : category === "feature" ? "[Feature]" : "[Question]";
      const fullTitle = `${categoryPrefix} ${title.trim()}`;

      let body = `### Category\n${
        category === "bug" ? "🐛 Bug Report" : category === "feature" ? "✨ Feature Request" : "💬 Question"
      }\n\n`;

      body += `### Description\n${description.trim() || "_No description provided._"}\n\n`;

      if (includeSysInfo) {
        body += `### Environment & Metadata\n`;
        body += `- **App Version**: v${APP_VERSION}\n`;
        body += `- **OS**: ${getOsLabel()}\n`;
        body += `- **Context Route**: \`${pathname || "/"}\`\n`;
        body += `- **Proxy Active**: ${proxyRunning ? `Yes (Port ${proxyPort})` : "No"}\n`;
        body += `- **Timestamp**: ${new Date().toISOString()}\n\n`;
      }

      if (screenshot) {
        body += `### Screenshot\n> 💡 *Note: The captured screenshot has been copied to your clipboard. Simply press **Ctrl + V** in this text box to attach it directly!* \n\n`;
      }

      const repoUrl = "https://github.com/delete-horizon/horizon-gateway/issues/new";
      const issueUrl = `${repoUrl}?title=${encodeURIComponent(fullTitle)}&body=${encodeURIComponent(body)}`;

      await commands.openExternalUrl(issueUrl);
      toastSuccess(t.githubOpened);
      handleClose();
    } catch (err) {
      toastError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInApp = async () => {
    if (!title.trim() && !description.trim()) {
      toastError(lang === "ko" ? "내용을 입력해 주세요." : "Please enter details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullContent = `[${title.trim()}]\n\n${description.trim()}`;
      const { error } = await supabase.from("feedbacks").insert({
        profile_id: session?.user?.id || null,
        content: fullContent,
        category,
        app_version: APP_VERSION,
        os: getOsLabel(),
        context: pathname || "general",
        install_id: installId,
      });

      if (error) {
        toastError(`${t.inAppError}: ${error.message}`);
      } else {
        toastSuccess(t.inAppSuccess);
        handleClose();
      }
    } catch (err) {
      toastError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTitle("");
    setDescription("");
    setScreenshot(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <Modal.Header title={t.modalTitle} description={t.modalSubtitle} />

      <Modal.Body className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Category Selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setCategory("bug")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              category === "bug"
                ? "border-error/40 bg-error/10 text-error font-semibold shadow-xs"
                : "border-base-300 bg-base-200/50 text-base-content/70 hover:bg-base-200",
            )}
          >
            <Bug className="size-3.5" />
            {t.categoryBug}
          </button>
          <button
            type="button"
            onClick={() => setCategory("feature")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              category === "feature"
                ? "border-primary/40 bg-primary/10 text-primary font-semibold shadow-xs"
                : "border-base-300 bg-base-200/50 text-base-content/70 hover:bg-base-200",
            )}
          >
            <Sparkles className="size-3.5" />
            {t.categoryFeature}
          </button>
          <button
            type="button"
            onClick={() => setCategory("question")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              category === "question"
                ? "border-info/40 bg-info/10 text-info font-semibold shadow-xs"
                : "border-base-300 bg-base-200/50 text-base-content/70 hover:bg-base-200",
            )}
          >
            <HelpCircle className="size-3.5" />
            {t.categoryQuestion}
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            className="w-full text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-base-content/80">{t.descLabel}</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descPlaceholder}
            rows={4}
            className="w-full text-sm font-sans resize-none"
          />
        </div>

        {/* Screenshot Section */}
        <div className="space-y-2 rounded-xl border border-base-300 bg-base-200/40 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-base-content/90">
              <Camera className="size-3.5 text-primary" />
              {t.screenshotLabel}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCaptureWindow}
                disabled={isCapturing}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className={cn("size-3 mr-1", isCapturing && "animate-spin")} />
                {t.recapture}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleOpenSnippingTool} className="h-7 px-2 text-xs">
                <Scissors className="size-3 mr-1" />
                {t.openSnip}
              </Button>
              {screenshot && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreenshot(null)}
                  className="h-7 px-2 text-xs text-error hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="size-3 mr-1" />
                  {t.removeScreenshot}
                </Button>
              )}
            </div>
          </div>

          {screenshot ? (
            <div className="relative group overflow-hidden rounded-lg border border-base-300 bg-base-300/30 max-h-52 flex items-center justify-center">
              <img src={screenshot} alt="Captured screen" className="max-h-52 w-auto object-contain rounded-md" />
              <div className="absolute bottom-2 right-2 rounded-md bg-base-100/90 backdrop-blur-xs px-2 py-1 text-[11px] text-base-content/70 shadow-xs border border-base-300 flex items-center gap-1">
                <Check className="size-3 text-success" />
                <span>{t.pasteHint}</span>
              </div>
            </div>
          ) : (
            <div
              onClick={handleCaptureWindow}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-base-300 bg-base-100/40 p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <ImageIcon className="size-6 text-base-content/40 mb-1.5" />
              <p className="text-xs text-base-content/70">{t.noScreenshot}</p>
              <p className="text-[11px] text-base-content/50 mt-0.5">{t.pasteHint}</p>
            </div>
          )}
        </div>

        {/* System Info Toggle */}
        <label className="flex items-center gap-2 text-xs text-base-content/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeSysInfo}
            onChange={(e) => setIncludeSysInfo(e.target.checked)}
            className="checkbox checkbox-xs checkbox-primary rounded"
          />
          <span>{t.includeSysInfo}</span>
        </label>
      </Modal.Body>

      <Modal.Footer>
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            {lang === "ko" ? "취소" : "Cancel"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendInApp}
              disabled={isSubmitting}
              className="gap-1.5 text-xs"
            >
              <Send className="size-3.5" />
              {t.sendInApp}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateGithubIssue}
              disabled={isSubmitting}
              className="gap-1.5 text-xs shadow-sm"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Github className="size-3.5" />}
              {t.createGithubIssue}
              <ExternalLink className="size-3 opacity-60 ml-0.5" />
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
