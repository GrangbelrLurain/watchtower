import type { en } from "./en";

type TranslationSchema = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export const ko: TranslationSchema = {
  title: "도메인 그룹 관리",
  subtitle: "도메인을 그룹별로 구성하여 한층 효율적으로 관리하고 필터링하세요.",
  noGroupsYet: "등록된 그룹이 없습니다",
  noGroupsDesc: "그룹을 사용해 도메인의 용도나 고객사를 분류하고, 대시보드 전체에 걸쳐 손쉽게 필터링할 수 있습니다.",
  confirmDelete: "정말로 이 그룹을 삭제하시겠습니까?",
  confirmDeleteTitle: "그룹 삭제 확인",
  confirmDeleteAction: "삭제하기",
  editModalTitle: "그룹 이름 변경",

  cardCreateTitle: "새 그룹 만들기",
  cardCreatePlaceholder: "예: 운영 서버, 고객사 A...",
  cardCreateBtn: "그룹 생성",

  cardNoDomains: "이 그룹에 등록된 도메인이 없습니다. 이곳을 클릭하여 선택해 보세요.",
  cardDomainCount: (count) => `도메인 ${count}개`,
  cardMoreCount: (count) => `외 ${count}개 더보기`,

  assignModalTitle: (groupName: string) => `[${groupName}] 그룹 도메인 할당`,
  assignModalDesc: "이 그룹에 포함시킬 도메인들을 선택하세요. 저장 버튼을 누르면 반영됩니다.",
  assignModalSelectAll: "전체 선택",
  assignModalDeselectAll: "전체 해제",
  assignModalNoDomainsText: "등록된 도메인이 없습니다.",
  assignModalAddLink: "도메인 추가",
  assignModalFirst: "를 먼저 진행해주세요.",
  assignModalInfo: "이 그룹에 이미 소속되었거나 아직 아무 그룹에도 속하지 않은 도메인만 표시됩니다.",
  assignModalStats: (total: number, selected: number) => `전체 ${total}개 중 ${selected}개 선택됨`,
  assignModalCancel: "취소",
  assignModalSave: "저장",
};
