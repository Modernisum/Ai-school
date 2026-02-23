// EditStudentForm.jsx - Minimal form for editing existing students
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Search, User, ArrowRight } from "lucide-react";

export default function EditStudentForm() {
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEditStudent = () => {
    if (studentId.trim()) {
      setIsLoading(true);
      // Navigate to student form with edit mode and student ID
      navigate(`/dashboard/student/addstudent?mode=edit&studentId=${studentId}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && studentId.trim()) {
      handleEditStudent();
    }
  };

  return (
    <div className="bg-white border-2 border-dashed border-green-400 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Edit className="text-green-600" size={32} />
        </div>
        <h2 className="text-xl font-bold text-green-700 mb-2">Edit Student</h2>
        <p className="text-gray-600 text-sm">Modify existing student record</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Search className="inline mr-1" size={16} />
            Student ID
          </label>
          <input 
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter Student ID (e.g., S000001)"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
          />
        </div>

        <button 
          onClick={handleEditStudent}
          disabled={!studentId.trim() || isLoading}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <User className="mr-2" size={18} />
          )}
          {isLoading ? 'Loading...' : 'Edit Student'}
          <ArrowRight className="ml-2" size={18} />
        </button>
      </div>

      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <p className="text-xs text-green-700">
          💡 Enter the Student ID to load and edit existing student information. You'll be taken to the full form with pre-filled data.
        </p>
      </div>
    </div>
  );
}