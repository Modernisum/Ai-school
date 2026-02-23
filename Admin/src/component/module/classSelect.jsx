// src/components/ClassSelect.jsx
import React, { useEffect, useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getSchoolId = () => localStorage.getItem("schoolId") || "622079";

export default function ClassSelect({ value, onChange }) {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const schoolId = getSchoolId();
        const response = await fetch(`${API_BASE_URL}/academic/${schoolId}/classes`);
        const result = await response.json();
        setClasses(result.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border p-2 rounded w-full"
      required
    >
      <option value="">-- Select Class --</option>
      {classes.map((c) => (
        <option key={c.id} value={c.className}>
          {c.className}
        </option>
      ))}
    </select>
  );
}
