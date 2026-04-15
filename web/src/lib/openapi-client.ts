import createClient from "openapi-fetch";
import type { paths } from "@/lib/generated/api-types";

/** P4-4: typed fetch client for `/api/v1` (same-origin: pass `""` or window origin). */
export function createVibehubApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}
