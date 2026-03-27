import type { en } from "./en";

type TranslationSchema = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export const ko: TranslationSchema = {
  title: "API",
  subtitle: "도메인별 로깅, 본문 저장 및 스키마 URL 설정을 관리합니다.",
  manageInSettings: "도메인 등록/해제는 Settings에서 관리",
  registeredDomains: (count: number) => `등록된 API 도메인 (${count})`,
  noDomainsYet: "아직 API 로깅용으로 등록된 도메인이 없습니다. Settings에서 도메인을 추가하세요.",
  settings: "설정",
  logging: "로깅",
  saveBody: "본문 저장",
  removeTitle: "API 모니터링에서 제거",
  schema: "스키마",
  schemaPlaceholder: "https://api.example.com/openapi.json",
  save: "저장",
  fetch: "가져오기",
  downloadSuccess: (size: string) => `${size} 바이트 다운로드 완료`,
  downloadFailed: (msg: string) => `다운로드 실패: ${msg}`,
};
