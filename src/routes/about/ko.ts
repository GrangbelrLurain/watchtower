import type { en } from "./en";

type TranslationSchema = Record<keyof typeof en, string>;

export const ko: TranslationSchema = {
  hello: "About 페이지에서 인사드립니다!",
};
