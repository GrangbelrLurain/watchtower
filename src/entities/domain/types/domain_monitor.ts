/** 체크 결과 구조 (BE DomainStatusLog). 최신은 메모리, 과거는 logs/{date}.json */
export interface DomainStatusLog {
  url: string;
  status: string;
  level: string;
  latency: number;
  ok: boolean;
  group: string;
  timestamp: string;
  errorMessage?: string;
}

/** monitor 체크 대상 + url (BE DomainMonitorWithUrl) */
export interface DomainMonitorWithUrl {
  domainId: number;
  url: string;
  checkEnabled: boolean;
  intervalSecs: number;
}
