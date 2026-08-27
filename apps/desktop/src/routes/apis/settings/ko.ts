import type { en } from "./en";

type TranslationSchema = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export const ko: TranslationSchema = {
  title: "API 설정",
  subtitle: "API 로깅 대상 도메인을 등록하거나 해제하세요. 여러 개 선택 후 버튼으로 일괄 처리할 수 있습니다.",
  searchPlaceholder: "URL 또는 그룹명으로 검색...",
  registeredTitle: (count: number) => `API 등록 도메인 (${count})`,
  unregisteredTitle: (count: number) => `미등록 도메인 (${count})`,
  registeredSubtitle: "프록시 트래픽 로깅 및 스키마 관리 대상입니다.",
  unregisteredSubtitle: "Domains에 등록되어 있지만 API 로깅 대상이 아닌 도메인입니다.",
  selectAll: "전체 선택",
  deselectAll: "해제",
  noSearchResults: "검색 결과가 없습니다.",
  noRegisteredDomains: "등록된 도메인이 없습니다.",
  allDomainsRegistered: "모든 도메인이 API에 등록되어 있습니다.",
  unregisterSelected: (count: number) => `선택 항목 등록 해제 (${count})`,
  registerSelected: (count: number) => `선택 항목 API 등록 (${count})`,
  loading: "로딩 중...",
  defaultGroup: "기본값",
};
