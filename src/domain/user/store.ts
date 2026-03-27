import { atomWithStorage } from "jotai/utils";

export interface UserProfile {
  name: string;
  role: string;
  avatarColor: string;
  isSetupComplete: boolean;
}

export const AVATAR_COLORS = [
  "bg-gradient-to-br from-indigo-500 to-purple-600",
  "bg-gradient-to-br from-blue-500 to-cyan-400",
  "bg-gradient-to-br from-emerald-400 to-teal-600",
  "bg-gradient-to-br from-amber-400 to-orange-500",
  "bg-gradient-to-br from-rose-400 to-red-500",
  "bg-gradient-to-br from-fuchsia-500 to-pink-500",
  "bg-slate-800", // Default minimal dark
] as const;

export const defaultProfile: UserProfile = {
  name: "",
  role: "",
  avatarColor: AVATAR_COLORS[0],
  isSetupComplete: false,
};

// Jotai atom that automatically syncs with localStorage key "watchtower-user-profile"
export const userProfileAtom = atomWithStorage<UserProfile>("watchtower-user-profile", defaultProfile);

// Helper function to extract initials from a name
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }

  // Check if there are multiple words (e.g., "John Doe")
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Single word
  // If Hangul (Korean), try to take up to 2 characters depending on length
  const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(trimmed);
  if (isKorean) {
    return trimmed.substring(0, 2);
  }

  // English single word: return the first 2 characters
  return trimmed.substring(0, 2).toUpperCase();
}
