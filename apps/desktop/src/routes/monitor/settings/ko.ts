import type { en } from "./en";

type TranslationSchema = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export const ko: TranslationSchema = {
  title: "모니터링 설정",
  subtitle: "체크할 도메인과 체크하지 않을 도메인을 선택하세요. 여러 개 선택 후 버튼으로 일괄 업데이트할 수 있습니다.",
  searchPlaceholder: "URL 또는 그룹명으로 검색...",
  checkedTitle: (count: number) => `체크할 도메인 (${count})`,
  uncheckedTitle: (count: number) => `체크 안할 도메인 (${count})`,
  selectAll: "전체 선택",
  deselect: "해제",
  checkedDesc: "백그라운드에서 주기적으로 상태를 체크합니다.",
  uncheckedDesc: "모니터링에서 제외됩니다. 수동으로 Refresh 시에만 체크됩니다.",
  noResults: (search: string) => (search ? "검색 결과가 없습니다." : "등록된 도메인이 없습니다."),
  allCheckedResult: "모든 도메인이 체크 대상입니다.",
  disableBtn: (count: number) => `선택 항목 → 체크 안함 (${count})`,
  enableBtn: (count: number) => `선택 항목 → 체크함 (${count})`,
  loading: "로딩 중...",
  defaultGroup: "기본값",
};
