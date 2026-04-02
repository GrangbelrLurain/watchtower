import { atomWithStorage } from "jotai/utils";

export const dashboardSearchQueryAtom = atomWithStorage("watchtower_dashboard_search", "");
export const dashboardFilterGroupIdAtom = atomWithStorage<number | 0>("watchtower_dashboard_filter_group", 0);
