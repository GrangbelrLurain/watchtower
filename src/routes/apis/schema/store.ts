import { atomWithStorage } from "jotai/utils";
import type { ParsedEndpoint } from "@/shared/lib/openapi-parser";

export interface EndpointFormState {
  paramValues: Record<string, string>;
  bodyText: string;
  headerText: string;
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    elapsedMs: number;
  } | null;
  error: string | null;
}

export const apiSchemaSelectedDomainIdAtom = atomWithStorage<number | null>(
  "watchtower_api_schema_selected_domain_id",
  null,
);
export const apiSchemaSearchAtom = atomWithStorage<string>("watchtower_api_schema_search", "");
export const apiSchemaSelectedEndpointAtom = atomWithStorage<ParsedEndpoint | null>(
  "watchtower_api_schema_selected_endpoint",
  null,
);

/**
 * Key format: `${domainId}:${method}:${path}`
 * We store all form states in a single atom with storage for full persistence.
 */
export const apiSchemaFormsAtom = atomWithStorage<Record<string, EndpointFormState>>(
  "watchtower_api_schema_endpoint_forms",
  {},
);
