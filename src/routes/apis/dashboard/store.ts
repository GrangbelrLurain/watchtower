import { atom } from "jotai";

/** Schema URL 편집 중인 도메인 id → 입력값 */
export const apiDashboardSchemaUrlEditsAtom = atom<Record<number, string>>({});
