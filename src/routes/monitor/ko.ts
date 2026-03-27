import type { en } from "./en";

type TranslationSchema = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export const ko: TranslationSchema = {
  title: "실시간 모니터링",
  lastSynched: "마지막 동기화",
  viewLogs: "로그 보기",
  refresh: "새로고침",
  copyReport: "보고서 복사",
  healthy: "정상",
  warnings: "경고",
  critical: "치명적",
  latencyAvg: "평균 지연 시간",
  filterPlaceholder: "도메인 이름으로 필터링...",
  noMatchingChecks: "일치하는 모니터링 결과가 없습니다",
  noMatchingDesc: "필터나 검색어를 조정해 보세요.",
  resetFilters: "필터 초기화",
  reportTitle: (time: string) => `🌍 모니터링 보고서 (${time})`,
  reportCopied: "보고서가 클립보드에 복사되었습니다!",
};
