import { apiFetch } from "@/lib/api-client";

export async function uploadImage(
  file: File,
  folder?: string
): Promise<{
  success: boolean;
  url: string;
  file_id: string;
  file_name: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);

  return apiFetch("/api/storage/upload", {
    method: "POST",
    body: formData,
    headers: {},
    timeout: 60000,
  });
}