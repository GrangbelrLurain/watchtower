export interface Domain {
  id: number;
  url: string;
}

/** 도메인–그룹 n:n 연결 (백엔드 domain_group_links) */
export interface DomainGroupLink {
  domain_id: number;
  group_id: number;
}
