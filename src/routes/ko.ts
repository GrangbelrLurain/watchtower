import type { en } from "./en";

type TranslationSchema = Record<keyof typeof en, string>;

export const ko: TranslationSchema = {
  hero_title: "디지털 제국을 ",
  hero_title_accent: "감시하세요",
  hero_description:
    "Watchtower는 모든 도메인과 서비스에 대해 실시간 상태 모니터링 및 성능 분석을 제공합니다. 서비스 중단이 발생하기 전에 조치하세요.",
  hero_btn_dashboard: "대시보드로 이동",
  hero_btn_add: "새 대상 추가하기",
  feature_grid_title: "고급 기능",
  feature_grid_subtitle: "강력한 기능들을 즉시 활용해 보세요.",
  feature_1_title: "실시간 모니터링",
  feature_1_desc: "밀리초 단위의 미세한 간격으로 즉각적인 알림과 상세한 상태 프로브 분석을 제공합니다.",
  feature_2_title: "고급 분석 서비스",
  feature_2_desc: "장기간에 걸쳐 수집된 과거 로그와 지연 시간 트렌드를 분석합니다.",
  feature_3_title: "스마트 그룹 관리",
  feature_3_desc: "인프라를 논리적이고 기능적인 단위의 그룹으로 체계화하여 관리합니다.",
  status_title: "글로벌 시스템 현황",
  status_healthy: "모든 시스템 정상 작동 중",
  status_issue: "시스템 이슈 발생 감지",
  status_checking: "시스템 상태 점검 중...",
  status_last_check: "마지막 점검 시간:",
};
