"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { submitSchoolRequest } from "@/lib/api/lead-gen";
import { sendSchoolAccessNotification } from "@/lib/api/notifications";

const formSchema = z.object({
  school_name: z.string().min(2, "School name is required"),
  contact_name: z.string().min(2, "Contact name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  employee_count: z.enum(["", "1-10", "11-50", "51-100", "101-500", "500+"]),
  student_count: z.enum(["", "1-100", "101-500", "501-1000", "1001-2000", "2000+"]),
  message: z.string().max(500, "Message must be under 500 characters").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FieldError {
  [key: string]: string;
}

export function RequestAccessForm() {
  const [formData, setFormData] = useState<FormData>({
    school_name: "",
    contact_name: "",
    email: "",
    phone: "",
    employee_count: "",
    student_count: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof FieldError];
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("submitting");

      const result = formSchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: FieldError = {};
        result.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
        setStatus("idle");
        return;
      }

      try {
        const data = {
          ...result.data,
          employee_count: result.data.employee_count ? parseInt(result.data.employee_count.split("-")[0]) || null : null,
          student_count: result.data.student_count ? parseInt(result.data.student_count.split("-")[0]) || null : null,
          message: result.data.message || "",
        };

        await submitSchoolRequest(data);
        await sendSchoolAccessNotification(
          result.data.school_name,
          result.data.email
        ).catch(() => {});
        setStatus("success");
      } catch {
        setStatus("error");
      }
    },
    [formData]
  );

  if (status === "success") {
    return (
      <div className="text-center py-12 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-text-primary mb-2">Request Submitted!</h3>
        <p className="text-text-secondary max-w-md mx-auto">
          Our team will contact you within 24 hours to set up your school&apos;s Vidhyam account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField
          label="School Name"
          name="school_name"
          value={formData.school_name}
          onChange={handleChange}
          error={errors.school_name}
          placeholder="e.g. Delhi Public School"
          required
        />
        <FormField
          label="Your Name"
          name="contact_name"
          value={formData.contact_name}
          onChange={handleChange}
          error={errors.contact_name}
          placeholder="Your full name"
          required
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="you@school.edu"
          required
        />
        <FormField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="+91 98765 43210"
          required
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormSelect
          label="No. of Employees"
          name="employee_count"
          value={formData.employee_count}
          onChange={handleChange}
          options={["", "1-10", "11-50", "51-100", "101-500", "500+"]}
        />
        <FormSelect
          label="Student Count"
          name="student_count"
          value={formData.student_count}
          onChange={handleChange}
          options={["", "1-100", "101-500", "501-1000", "1001-2000", "2000+"]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Message / Requirements <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
          placeholder="Tell us about your school's needs..."
        />
      </div>

      {status === "error" && (
        <div className="text-sm text-error bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          Something went wrong. Please try again or email us directly at hello@vidhyam.in
        </div>
      )}

      <Button type="submit" size="lg" isLoading={status === "submitting"} className="w-full">
        Submit Request
      </Button>

      <p className="text-xs text-text-tertiary text-center">
        By submitting, you agree to our Privacy Policy and Terms of Service.
      </p>
    </form>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border bg-white text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
          error ? "border-error ring-1 ring-error/20" : "border-border"
        }`}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || "Select..."}
          </option>
        ))}
      </select>
    </div>
  );
}