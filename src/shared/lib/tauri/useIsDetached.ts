import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

/**
 * Hook to detect if the current window is a detached/secondary window.
 * Returns true if the window label is not "main".
 */
export function useIsDetached() {
  const [isDetached, setIsDetached] = useState(false);

  useEffect(() => {
    // Label can be determined synchronously if we want,
    // but the API is generally async for safety.
    const win = getCurrentWindow();
    setIsDetached(win.label !== "main");
  }, []);

  return isDetached;
}
