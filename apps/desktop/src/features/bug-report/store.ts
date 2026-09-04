import { atom } from "jotai";

export const bugReportModalOpenAtom = atom<boolean>(false);
export const bugReportScreenshotAtom = atom<string | null>(null);
