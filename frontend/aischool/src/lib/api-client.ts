const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeout?: number;
  revalidate?: number | false;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { body, timeout = 15000, revalidate, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchConfig: RequestInit & { next?: { revalidate?: number | false } } = {
    ...fetchOptions,
    headers,
    signal: controller.signal,
  };

  if (body !== undefined) {
    fetchConfig.body = JSON.stringify(body);
  }

  if (revalidate !== undefined) {
    fetchConfig.next = { revalidate };
  }

  try {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, fetchConfig);
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");
    const responseData = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message = isJson && responseData?.error
        ? responseData.error
        : responseData?.message || `HTTP ${response.status}`;
      throw new ApiError(message, response.status, responseData);
    }

    return responseData as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }
}

export { apiFetch, ApiError, API_BASE_URL };
export type { FetchOptions };