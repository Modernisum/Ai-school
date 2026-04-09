// Employee Profile Header Component
import React from 'react';
import {
    User, Calendar, Clock, Edit3, Badge, BookOpen,
    Trophy, GraduationCap, Target, Briefcase, Phone, Mail,
    MapPin, Building
} from 'lucide-react';
import { formatDate } from './employeeprofileUtils';

const EMPLOYEE_TYPES = {
    'Teacher': { icon: User, color: 'bg-blue-100 text-blue-800' },
    'Principal': { icon: GraduationCap, color: 'bg-purple-100 text-purple-800' },
    'Vice Principal': { icon: Target, color: 'bg-indigo-100 text-indigo-800' },
    'Admin': { icon: Building, color: 'bg-green-100 text-green-800' },
    'Accountant': { icon: Briefcase, color: 'bg-amber-100 text-amber-800' },
    'Clerk': { icon: User, color: 'bg-gray-100 text-gray-800' },
    'Security Guard': { icon: Badge, color: 'bg-orange-100 text-orange-800' },
    'Librarian': { icon: BookOpen, color: 'bg-pink-100 text-pink-800' },
    'Lab Assistant': { icon: User, color: 'bg-cyan-100 text-cyan-800' },
    'Sports Coach': { icon: Trophy, color: 'bg-yellow-100 text-yellow-800' },
    'Counselor': { icon: User, color: 'bg-teal-100 text-teal-800' }
};

const EmployeeProfileHeader = ({ employee, onEdit }) => {
    if (!employee) return null;

    const typeConfig = EMPLOYEE_TYPES[employee.employeeType] || {
        icon: User,
        color: 'bg-gray-100 text-gray-800'
    };
    const IconComponent = typeConfig.icon;

    return (
        <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-red-500 p-4 rounded-full mr-6 shadow-lg">
                        <IconComponent className="text-white" size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">
                            {employee.firstName || employee.name || employee.employeeId}
                            {employee.lastName && ` ${employee.lastName}`}
                        </h2>
                        <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig.color}`}>
                                {employee.employeeType}
                            </span>
                            <span className="text-gray-600">ID: {employee.employeeId}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                                <Calendar size={14} className="mr-1" />
                                <span>Joined: {formatDate(employee.createdAt)}</span>
                            </div>
                            <div className="flex items-center">
                                <Clock size={14} className="mr-1" />
                                <span>Updated: {formatDate(employee.updatedAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-red-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-red-600 transition-all duration-300 shadow-lg text-sm"
                >
                    <Edit3 className="mr-2" size={16} />
                    Edit Employee
                </button>
            </div>
        </div>
    );
};

export default EmployeeProfileHeader;