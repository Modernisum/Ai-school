import { describe, it, expect } from "vitest";
import { z } from "zod";

const formSchema = z.object({
  school_name: z.string().min(2, "School name is required"),
  contact_name: z.string().min(2, "Contact name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  employee_count: z.enum(["", "1-10", "11-50", "51-100", "101-500", "500+"]),
  student_count: z.enum(["", "1-100", "101-500", "501-1000", "1001-2000", "2000+"]),
  message: z.string().max(500).optional(),
});

describe("RequestAccessForm validation", () => {
  it("should pass with valid data", () => {
    const valid = {
      school_name: "Test School",
      contact_name: "John Doe",
      email: "john@school.edu",
      phone: "9876543210",
      employee_count: "11-50" as const,
      student_count: "501-1000" as const,
      message: "We need a demo",
    };

    const result = formSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should fail with empty school name", () => {
    const result = formSchema.safeParse({
      ...validData,
      school_name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("school_name");
    }
  });

  it("should fail with invalid email", () => {
    const result = formSchema.safeParse({
      ...validData,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email");
    }
  });

  it("should fail with short phone number", () => {
    const result = formSchema.safeParse({
      ...validData,
      phone: "1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("phone");
    }
  });
});

const validData = {
  school_name: "Test School",
  contact_name: "John Doe",
  email: "john@school.edu",
  phone: "9876543210",
  employee_count: "11-50" as const,
  student_count: "501-1000" as const,
  message: "",
};