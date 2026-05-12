import { apiFetch } from "@/lib/api-client";

export async function sendSchoolAccessNotification(
  schoolName: string,
  contactEmail: string
): Promise<{ success: boolean }> {
  return apiFetch("/api/admin/notify/global", {
    method: "POST",
    body: {
      title: "New School Access Request",
      message: `School "${schoolName}" (${contactEmail}) has requested access to Vidhyam.`,
      type: "info",
      priority: "high",
    },
    timeout: 10000,
  });
}