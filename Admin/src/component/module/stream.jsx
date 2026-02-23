// src/components/StreamManager.jsx
import React, { useState, useEffect } from "react";
import ClassSelect from "./classSelect";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getSchoolId = () => localStorage.getItem("schoolId") || "622079";

export default function StreamManager() {
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [newStreamName, setNewStreamName] = useState("");
  const [classes, setClasses] = useState([]);

  // fetch all classes
  const fetchClasses = async () => {
    try {
      const schoolId = getSchoolId();
      const response = await fetch(`${API_BASE_URL}/academic/${schoolId}/classes`);
      const result = await response.json();
      setClasses(result.data || []);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleAddStream = async () => {
    if (!newStreamName.trim()) return alert("Enter stream name");
    if (!selectedClassName) return alert("Select a class first");

    try {
      const schoolId = getSchoolId();
      // Find the class ID for the selected class name
      const targetClass = classes.find(c => c.name === selectedClassName || c.className === selectedClassName);
      const classId = targetClass?.id || selectedClassName;

      const response = await fetch(`${API_BASE_URL}/academic/${schoolId}/classes/${classId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName: newStreamName.trim(),
          subjects: selectedSubjects,
        }),
      });

      if (!response.ok) throw new Error("Failed to add stream");

      setNewStreamName("");
      setSelectedSubjects([]);
      fetchClasses();
    } catch (err) {
      console.error("Error adding stream:", err);
      alert("Failed to add stream, check console");
    }
  };

  // find selected class object
  const selectedClass = classes.find((c) => c.className === selectedClassName);

  const toggleSubject = (subj) => {
    setSelectedSubjects((prev) =>
      prev.some((s) => s.subjectId === subj.subjectId)
        ? prev.filter((s) => s.subjectId !== subj.subjectId)
        : [...prev, subj]
    );
  };

  return (
    <div className="flex gap-6">
      {/* Left: Streams List */}
      <div className="w-1/3 border p-4 rounded-lg bg-gray-50 shadow max-h-[500px] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Streams (Sections)</h2>
        {/* Subjects Checkboxes */}
        {selectedClass ? (
          <div className="mb-4 max-h-[200px] overflow-y-auto border p-2 rounded bg-gray-50">

            {selectedClass.subjects && selectedClass.subjects.length > 0 ? (
              selectedClass.subjects.map((subj, idx) => (
                <label
                  key={subj.subjectId || idx}
                  className="block cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjects.some(
                      (s) => s.subjectId === subj.subjectId
                    )}
                    onChange={() => toggleSubject(subj)}
                    className="mr-2"
                  />
                  {subj.subjectName}
                </label>
              ))
            ) : (
              <p className="text-gray-500">No subjects found for this class.</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 mb-4">
            Select a class to choose subjects.
          </p>
        )}
      </div>

      {/* Right: Add Stream */}
      <div className="flex-1 border p-4 rounded-lg bg-white shadow">
        <h2 className="text-lg font-semibold mb-4">Add New Stream</h2>

        {/* Class Select */}
        <ClassSelect
          value={selectedClassName}
          onChange={setSelectedClassName}
        />

        {/* Stream Name */}
        <input
          type="text"
          placeholder="Stream Name"
          value={newStreamName}
          onChange={(e) => setNewStreamName(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />



        <button
          onClick={handleAddStream}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Stream
        </button>
      </div>
    </div>
  );
}
