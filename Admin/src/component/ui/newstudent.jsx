// AddStudentForm.jsx - Minimal form for adding new students
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, User, GraduationCap, ArrowRight } from "lucide-react";

export default function AddStudentForm() {
  const [selectedClass, setSelectedClass] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const classOptions = [
    { value: "class-1", label: "Class 1" },
    { value: "class-2", label: "Class 2" },
    { value: "class-3", label: "Class 3" },
    { value: "class-4", label: "Class 4" },
    { value: "class-5", label: "Class 5" },
    { value: "class-6", label: "Class 6" },
    { value: "class-7", label: "Class 7" },
    { value: "class-8", label: "Class 8" },
    { value: "class-9", label: "Class 9" },
    { value: "class-10", label: "Class 10" },
    { value: "class-11", label: "Class 11" },
    { value: "class-12", label: "Class 12" },
  ];

  const handleAddStudent = () => {
    if (selectedClass) {
      setIsLoading(true);
      // Navigate to student form with class parameter
      navigate(`/dashboard/student/addstudent?mode=add&class=${selectedClass}`);
    }
  };

  return (
    <div className="bg-white border-2 border-dashed border-blue-400 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Plus className="text-blue-600" size={32} />
        </div>
        <h2 className="text-xl font-bold text-blue-700 mb-2">Add New Student</h2>
        <p className="text-gray-600 text-sm">Create a new student record</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <GraduationCap className="inline mr-1" size={16} />
            Select Class
          </label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          >
            <option value="">-- Choose Class --</option>
            {classOptions.map((cls) => (
              <option key={cls.value} value={cls.value}>
                {cls.label}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleAddStudent}
          disabled={!selectedClass || isLoading}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <User className="mr-2" size={18} />
          )}
          {isLoading ? 'Creating...' : 'Add Student'}
          <ArrowRight className="ml-2" size={18} />
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 Select a class to create a new student record. You'll be taken to the full form to add student details.
        </p>
      </div>
    </div>
  );
}