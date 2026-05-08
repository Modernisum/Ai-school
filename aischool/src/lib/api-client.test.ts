import { describe, it, expect, vi } from "vitest";
import { apiFetch, ApiError } from "./api-client";

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should make a GET request and return JSON data", async () => {
    const mockData = { success: true, data: [{ id: "1", title: "Test" }] };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue(mockData),
    });

    const result = await apiFetch<typeof mockData>("/test-endpoint");
    expect(result).toEqual(mockData);
  });

  it("should throw ApiError on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({ success: false, error: "Not found", message: "Resource not found" }),
    });

    await expect(apiFetch("/missing")).rejects.toThrow(ApiError);
    await expect(apiFetch("/missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("should throw ApiError on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(apiFetch("/test")).rejects.toThrow(ApiError);
    await expect(apiFetch("/test")).rejects.toMatchObject({
      status: 0,
    });
  });

  it("should send POST request with JSON body", async () => {
    const mockData = { success: true, data: { id: "new" } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue(mockData),
    });

    const body = { name: "Test School", email: "test@school.edu" };
    await apiFetch("/submit", { method: "POST", body });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/submit"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      })
    );
  });
});