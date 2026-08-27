import { atomWithWindowStorage } from "@/shared/lib/jotai/window-storage";

const defaultDate = new Date().toISOString().split("T")[0];

export const apiLogsDateAtom = atomWithWindowStorage("api_logs_date", defaultDate);
export const apiLogsSearchAtom = atomWithWindowStorage("api_logs_search", "");
export const apiLogsHostFilterAtom = atomWithWindowStorage("api_logs_host_filter", "");
export const apiLogsMethodFilterAtom = atomWithWindowStorage("api_logs_method_filter", "");
