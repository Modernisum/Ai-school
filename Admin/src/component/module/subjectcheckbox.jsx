// src/components/SubjectsCheckbox.jsx
import React, { useEffect, useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getSchoolId = () => localStorage.getItem("schoolId") || "622079";

export default function SubjectsCheckbox({ className, selectedSubjects, onChange }) {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchClassSubjects = async () => {
      if (!className) {
        setSubjects([]);
        return;
      }
      try {
        const schoolId = getSchoolId();
        const response = await fetch(`${API_BASE_URL}/academic/${schoolId}/classes`);
        const result = await response.json();
        const classData = result.data?.find(c => c.name === className || c.className === className);
        setSubjects(classData?.subjects || []);
      } catch (err) {
        console.error("Error fetching class subjects:", err);
      }
    };

    fetchClassSubjects();
  }, [className]);

  const handleToggle = (subjectName) => {
    if (selectedSubjects.includes(subjectName)) {
      onChange(selectedSubjects.filter((s) => s !== subjectName));
    } else {
      onChange([...selectedSubjects, subjectName]);
    }
  };

  if (!className) {
    return <p className="text-gray-500 text-sm">Select a class to load subjects</p>;
  }

  return (
    <div className="mb-4">
      <h3 className="font-medium mb-2">Subjects for {className}</h3>
      {subjects.length === 0 ? (
        <p className="text-gray-500 text-sm">No subjects found in {className}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {subjects.map((subj, idx) => (
            <label key={idx} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedSubjects.includes(subj)}
                onChange={() => handleToggle(subj)}
                className="h-4 w-4"
              />
              <span>{subj}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
