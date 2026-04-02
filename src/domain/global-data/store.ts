import type { Domain, DomainGroupLink } from "@/entities/domain/types/domain";
import type { DomainGroup } from "@/entities/domain/types/domain_group";
import type { DomainMonitorWithUrl, DomainStatusLog } from "@/entities/domain/types/domain_monitor";
import type { DomainApiLoggingLink, LocalRoute } from "@/entities/proxy/types/local_route";
import { atomWithBroadcast } from "@/shared/lib/jotai/atomWithBroadcast";

export const globalDomainsAtom = atomWithBroadcast<Domain[]>("global-domains", []);
export const globalGroupsAtom = atomWithBroadcast<DomainGroup[]>("global-groups", []);
export const globalLinksAtom = atomWithBroadcast<DomainGroupLink[]>("global-links", []);
export const globalMonitorLinksAtom = atomWithBroadcast<DomainMonitorWithUrl[]>("global-monitor-links", []);
export const globalApiLoggingLinksAtom = atomWithBroadcast<DomainApiLoggingLink[]>("global-api-logging-links", []);
export const globalLocalRoutesAtom = atomWithBroadcast<LocalRoute[]>("global-local-routes", []);
export const globalSiteCheckAtom = atomWithBroadcast<DomainStatusLog[]>("global-site-check", []);
