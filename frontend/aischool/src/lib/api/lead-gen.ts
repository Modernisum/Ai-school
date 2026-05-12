import { apiFetch } from "@/lib/api-client";
import type { SchoolAccessRequest, SchoolAccessRequestResponse } from "@/lib/types";

export async function submitSchoolRequest(
  data: SchoolAccessRequest
): Promise<SchoolAccessRequestResponse> {
  return apiFetch<SchoolAccessRequestResponse>("/api/cms/school-request", {
    method: "POST",
    body: data,
    timeout: 30000,
  });
}