import type { en } from "./en";

type TranslationSchema = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export const ko: TranslationSchema = {
  title: "모니터링 내역",
  subtitle: "모든 도메인의 상세 모니터링 로그를 검토하세요.",
  searchPlaceholder: "URL 또는 그룹으로 검색...",
  level: "수준",
  all: "전체",
  noLogs: "해당 날짜에 로그가 없습니다.",
  tableTime: "시간",
  tableDomain: "도메인",
  tableStatus: "상태",
  tableMessage: "메시지",
  tableLatency: "지연 시간",
  tableLevel: "수준",
  modalTitle: "로그 통계",
  modalDesc: "이 특정 점검에 대한 상세 정보입니다.",
  targetDomain: "대상 도메인",
  timestamp: "타임스탬프",
  systemMessage: "시스템 메시지",
  noSystemMessage: "이 이벤트에 대한 추가 시스템 메시지가 없습니다.",
  closePanel: "패널 닫기",
  openUrl: "URL 열기",
  levelInfo: "정보",
  levelWarning: "경고",
  levelError: "오류",
};
