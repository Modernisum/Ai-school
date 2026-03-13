import React from 'react';
import { User, BookOpen, Users, Calendar, Clock, Edit3 } from 'lucide-react';
import { formatClassName, formatDate } from '../../../../utils/helpers';

const IdentitySection = ({ student, studentId, schoolId, onEdit }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-red-500 p-4 rounded-full shadow-lg">
            <User className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{student?.name || 'Student Name Not Set'}</h2>
            <p className="text-gray-600">
              {formatClassName(student?.className)} • Roll No: {student?.rollNumber} • Section: {student?.section}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              ID: {studentId} | School: {schoolId}
            </p>
          </div>
        </div>
        <button 
          onClick={onEdit}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-red-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
        >
          <Edit3 className="mr-2" size={16} />Edit Student
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <BookOpen className="text-blue-600 mr-2" size={20} />
            <span className="text-sm text-gray-600 font-medium">Class</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{formatClassName(student?.className)}</p>
        </div>

        <div className="bg-white border-2 border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <Users className="text-green-600 mr-2" size={20} />
            <span className="text-sm text-gray-600 font-medium">Status</span>
          </div>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            student?.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {student?.status === 'active' ? '✓ Active' : '○ Inactive'}
          </span>
        </div>

        <div className="bg-white border-2 border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <Calendar className="text-purple-600 mr-2" size={20} />
            <span className="text-sm text-gray-600 font-medium">Enrolled</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{formatDate(student?.createdAt)}</p>
        </div>

        <div className="bg-white border-2 border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <Clock className="text-orange-600 mr-2" size={20} />
            <span className="text-sm text-gray-600 font-medium">Last Updated</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{formatDate(student?.updatedAt)}</p>
        </div>
      </div>
    </div>
  );
};

export default IdentitySection;
