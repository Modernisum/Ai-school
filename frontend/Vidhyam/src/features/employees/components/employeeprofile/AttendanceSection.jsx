// Attendance Section Component
import React from 'react';
import { Loader, Calendar, CheckCircle, XCircle, PieChart } from 'lucide-react';
import { formatDate, formatTime } from './employeeprofileUtils';

const AttendanceSection = ({ attendanceHistory, attendanceStats, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="animate-spin text-blue-600 mr-2" />
                    <span>Loading attendance...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
                <Calendar className="mr-2 text-blue-600" size={20} />
                Attendance History ({attendanceHistory.length} records)
            </h3>

            {/* Attendance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <CheckCircle className="text-green-600 mr-2" size={20} />
                        <div>
                            <p className="text-green-700 font-medium">Present</p>
                            <p className="text-2xl font-bold text-green-800">{attendanceStats.present}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <XCircle className="text-red-600 mr-2" size={20} />
                        <div>
                            <p className="text-red-700 font-medium">Absent</p>
                            <p className="text-2xl font-bold text-red-800">{attendanceStats.absent}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <PieChart className="text-blue-600 mr-2" size={20} />
                        <div>
                            <p className="text-blue-700 font-medium">Total Days</p>
                            <p className="text-2xl font-bold text-blue-800">{attendanceStats.total}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Attendance */}
            {attendanceHistory.length > 0 ? (
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Recent Attendance:</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {attendanceHistory.slice(0, 10).map((record, index) => (
                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500 font-medium">Date</span>
                                        <p className="text-gray-800">{formatDate(record.date)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 font-medium">In Time</span>
                                        <p className="text-gray-800">{formatTime(record.inTime)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 font-medium">Out Time</span>
                                        <p className="text-gray-800">{formatTime(record.outTime)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 font-medium">Total Time</span>
                                        <p className="text-gray-800">{record.totalTime || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 font-medium">Status</span>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${record.status === 'present'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {record.status || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No attendance records found</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceSection;