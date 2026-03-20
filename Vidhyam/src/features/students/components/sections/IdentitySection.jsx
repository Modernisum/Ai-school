import React from 'react';
import { User, BookOpen, Users, Calendar, Clock, Edit3, Phone, Mail, Fingerprint, Heart, CalendarDays } from 'lucide-react';
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

      {/* Detailed Personal & Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white/50 border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Heart size={14} className="text-red-400" /> Family & Personal
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Father's Name</span>
              <span className="font-semibold text-gray-800">{student?.fatherName || 'Not Set'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Mother's Name</span>
              <span className="font-semibold text-gray-800">{student?.motherName || 'Not Set'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Date of Birth</span>
              <span className="font-semibold text-gray-800">{student?.dob || 'Not Set'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Gender</span>
              <span className="font-semibold text-gray-800">{student?.gender || 'Not Set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Aadhaar</span>
              <span className="font-mono font-bold text-blue-600">{student?.aadhaarNumber || 'Not Set'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/50 border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Phone size={14} className="text-green-400" /> Contact & Enrollment
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Primary Mobile</span>
              <span className="font-semibold text-gray-800 flex items-center gap-1">
                 <Phone size={12} className="text-green-500" /> {student?.contact || 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Email ID</span>
              <span className="font-semibold text-gray-800 flex items-center gap-1">
                 <Mail size={12} className="text-blue-500" /> {student?.email || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Admission Date</span>
              <span className="font-semibold text-gray-800 flex items-center gap-1">
                 <CalendarDays size={12} className="text-purple-500" /> {student?.admissionDate || 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">TC Number</span>
              <span className="font-semibold text-amber-600">{student?.tcNumber || 'None'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentitySection;
