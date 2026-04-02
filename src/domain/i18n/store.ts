import { atomWithStorage } from "jotai/utils";
import { atomWithBroadcast } from "@/shared/lib/jotai/atomWithBroadcast";

export type SupportedLanguage = "en" | "ko";

// Determine the default language based on the user's browser/system settings.
// Fallback to "en" for safety.
const getDefaultLanguage = (): SupportedLanguage => {
  if (typeof navigator !== "undefined") {
    return navigator.language.startsWith("ko") ? "ko" : "en";
  }
  return "en";
};

// Jotai atom that automatically syncs with localStorage key "watchtower-language"
// It will instantly trigger re-renders on components subscribed via useAtomValue(languageAtom)
export const languageAtom = atomWithBroadcast<SupportedLanguage>(
  "watchtower-language",
  getDefaultLanguage(),
  atomWithStorage<SupportedLanguage>("watchtower-language", getDefaultLanguage()),
);
