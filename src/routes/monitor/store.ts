import { atomWithStorage } from "jotai/utils";

export const monitorSearchAtom = atomWithStorage("watchtower_monitor_search", "");
export const monitorFilterLevelAtom = atomWithStorage<string[]>("watchtower_monitor_filter_level", []);
