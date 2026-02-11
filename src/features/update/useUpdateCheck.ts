import type { Update } from "@tauri-apps/plugin-updater";
import { check } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";

export interface UpdateState {
  update: Update | null;
  isChecking: boolean;
  error: string | null;
}

export function useUpdateCheck(options?: {
  onMount?: boolean;
  delayMs?: number;
}) {
  const { onMount = true, delayMs = 3000 } = options ?? {};
  const [state, setState] = useState<UpdateState>({
    update: null,
    isChecking: false,
    error: null,
  });

  const checkForUpdates = useCallback(async () => {
    setState((s) => ({ ...s, isChecking: true, error: null }));
    try {
      const update = await check();
      setState({
        update: update ?? null,
        isChecking: false,
        error: null,
      });
      return update;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({
        update: null,
        isChecking: false,
        error: message,
      });
      return null;
    }
  }, []);

  useEffect(() => {
    if (onMount) {
      const t = setTimeout(checkForUpdates, delayMs);
      return () => clearTimeout(t);
    }
  }, [onMount, delayMs, checkForUpdates]);

  return { ...state, checkForUpdates };
}
