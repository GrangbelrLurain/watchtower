import { atomWithStorage } from "jotai/utils";

export type AppTheme = "watchtower-light" | "watchtower-dark";

// This atom stores the currently chosen theme in localStorage
export const themeAtom = atomWithStorage<AppTheme>("watchtower-theme", "watchtower-light");
