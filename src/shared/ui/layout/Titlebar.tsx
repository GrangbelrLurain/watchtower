import { getCurrentWindow } from "@tauri-apps/api/window";
import clsx from "clsx";
import { Maximize2, Minus, Monitor, Square, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const appWindow = getCurrentWindow();

export function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateState = useCallback(async () => {
    setIsMaximized(await appWindow.isMaximized());
    setIsFullscreen(await appWindow.isFullscreen());
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const current = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!current);
    setIsFullscreen(!current);
  }, []);

  useEffect(() => {
    updateState();

    const unlistenResized = appWindow.onResized(() => updateState());

    // Listen for F11
    const handleF11 = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleF11);

    return () => {
      unlistenResized.then((f) => f());
      window.removeEventListener("keydown", handleF11);
    };
  }, [updateState, toggleFullscreen]);

  if (isFullscreen) {
    return null;
  }

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={() => appWindow.toggleMaximize()}
      className="bg-slate-950 flex items-center justify-between select-none z-110 border-b border-slate-800/50 h-10 shrink-0 backdrop-blur-md bg-opacity-80 cursor-default"
    >
      <div className="flex items-center gap-2 px-4 pointer-events-none">
        <img src="/app-icon.svg" alt="" className="w-4 h-4 shrink-0 object-contain" aria-hidden />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Watchtower <span className="text-slate-600 font-medium ml-1">v1.2.0</span>
        </span>
      </div>

      <div className="flex items-center h-full">
        <button
          type="button"
          onClick={() => toggleFullscreen()}
          title="Toggle Fullscreen (F11)"
          className="w-12 h-full flex items-center justify-center hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <Monitor className={clsx("w-3.5 h-3.5", isFullscreen && "text-blue-400")} />
        </button>
        <button
          type="button"
          onClick={() => appWindow.minimize()}
          className="w-12 h-full flex items-center justify-center hover:bg-slate-800 text-slate-400 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => appWindow.toggleMaximize()}
          className="w-12 h-full flex items-center justify-center hover:bg-slate-800 text-slate-400 transition-colors"
        >
          {isMaximized ? <Square className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => appWindow.close()}
          className="w-12 h-full flex items-center justify-center hover:bg-rose-600 hover:text-white text-slate-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
