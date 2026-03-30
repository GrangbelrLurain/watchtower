import { atomWithStorage } from "jotai/utils";

export const apiLogsDateAtom = atomWithStorage("watchtower_api_logs_date", new Date().toISOString().split("T")[0]);
export const apiLogsSearchAtom = atomWithStorage("watchtower_api_logs_search", "");
export const apiLogsHostFilterAtom = atomWithStorage("watchtower_api_logs_host_filter", "");
export const apiLogsMethodFilterAtom = atomWithStorage("watchtower_api_logs_method_filter", "");
