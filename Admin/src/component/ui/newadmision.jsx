import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getSchoolId = () => localStorage.getItem("schoolId") || "622079";

export default function StudentForm({ onClose }) {
  const [form, setForm] = useState({ className: "", name: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const schoolId = getSchoolId();
      const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to save student");
      }

      onClose();
    } catch (err) {
      console.error("Error saving student", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded w-96 shadow">
        <h3 className="text-lg font-semibold mb-4">Add New Student</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Student Name"
            value={form.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 mb-3"
            required
          />
          <input
            type="text"
            name="className"
            placeholder="Class (e.g. Class-10)"
            value={form.className}
            onChange={handleChange}
            className="w-full border px-3 py-2 mb-3"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
