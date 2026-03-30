import { atomWithStorage } from "jotai/utils";

export const monitorLogsDateAtom = atomWithStorage(
  "watchtower_monitor_logs_date",
  new Date().toISOString().split("T")[0],
);
export const monitorLogsSearchAtom = atomWithStorage("watchtower_monitor_logs_search", "");
export const monitorLogsLevelFilterAtom = atomWithStorage<string[]>("watchtower_monitor_logs_level_filter", []);
