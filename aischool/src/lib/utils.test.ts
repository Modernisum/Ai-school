import { describe, it, expect } from "vitest";
import { cn, formatDate, calculateReadTime } from "./utils";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("should handle undefined values", () => {
    expect(cn("base", undefined, "extra")).toBe("base extra");
  });

  it("should handle multiple classes", () => {
    expect(cn("px-4", "px-6")).toBe("px-4 px-6");
  });
});

describe("formatDate", () => {
  it("should format ISO date string", () => {
    const result = formatDate("2026-04-15T10:00:00Z");
    expect(result).toBe("April 15, 2026");
  });
});

describe("calculateReadTime", () => {
  it("should return 1 minute for short content", () => {
    const short = "This is short content.";
    expect(calculateReadTime(short)).toBe(1);
  });

  it("should calculate based on 200 words per minute", () => {
    const words = Array(400).fill("word").join(" ");
    expect(calculateReadTime(words)).toBe(2);
  });

  it("should round up", () => {
    const words = Array(250).fill("word").join(" ");
    expect(calculateReadTime(words)).toBe(2);
  });
});