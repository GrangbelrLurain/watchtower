import type { en } from "./en";

type TranslationSchema = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => unknown ? (...args: A) => string : string;
};

export const ko: TranslationSchema = {
  title: "프록시",
  subtitle: "특정 도메인을 로컬 서버로 라우팅합니다. 브라우저나 시스템의 HTTP 프록시를 아래 설정으로 변경하세요.",
  running: "실행 중",
  failed: "실패",
  starting: "시작 중...",
  startProxy: "프록시 시작",
  on: "켜짐",
  off: "꺼짐",
  localRouting: "로컬 라우팅",
  failedToStart: "프록시 시작 실패",
  failedToStartDesc: '해당 포트가 다른 프로세스에서 사용 중인지 확인한 후 "프록시 시작"을 클릭하여 재시도하세요.',
  portSettings: "포트 설정",
  portSettingsDesc: "포트 변경 사항은 앱을 재시작한 후에 적용됩니다.",
  forwardProxyPort: "포워드 프록시 포트",
  reverseHttpPort: "리버스 HTTP (선택)",
  reverseHttpsPort: "리버스 HTTPS (선택)",
  saving: "저장 중...",
  save: "저장",
  howToUse: "프록시 사용 방법",
  forwardProxyHowTo: (port: number | string) =>
    `포워드 프록시: 브라우저/시스템의 HTTP/HTTPS 프록시를 127.0.0.1:${port}로 설정하세요. 프록시는 호스트명을 기준으로 로컬 대상을 결정하거나 그대로 전달합니다.`,
  noSystemProxyHowTo: (port: number | string) =>
    `시스템 프록시 없음: 브라우저에서 http://127.0.0.1:${port}를 여세요 (hosts 파일 수정 불필요). 트래픽이 첫 번째 로컬 경로로 라우팅됩니다.`,
  openSetupPage: "설정 페이지 열기",
  addRoute: "경로 추가",
  domainHost: "도메인 (호스트)",
  targetHost: "대상 호스트",
  targetPort: "대상 포트",
  add: "추가",
  routes: (count: number) => `경로 (${count})`,
  noRoutesYet: "아직 경로가 없습니다. 위에 도메인과 대상을 추가하세요.",
};
