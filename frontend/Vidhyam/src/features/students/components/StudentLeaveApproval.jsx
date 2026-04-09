// StudentLeaveApproval.jsx – Student leave approval management system
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, RefreshCw, Calendar, User, Filter, Download, Bell, Clock, AlertCircle } from 'lucide-react';
import { callApiWithBackoff } from '../../../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
};

const getSchoolId = () => {
    for (const k of ['schoolId', 'school_id', 'currentSchoolId']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined') return v;
    }
    return "";
};

export default function StudentLeaveApproval() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedLeaves, setSelectedLeaves] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });

    const schoolId = getSchoolId();

    const fetchLeaves = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const res = await callApiWithBackoff(`${API_BASE_URL}/leave/${schoolId}`, { method: 'GET' });
            if (res.success) {
                // Filter student leaves (assuming student leaves have role='student' or similar)
                const studentLeaves = res.data.filter(leave =>
                    leave.role === 'student' || leave.applicantType === 'student' ||
                    (leave.applicantName && leave.applicantName.includes('Student'))
                );
                setLeaves(studentLeaves);

                // Calculate stats
                const total = studentLeaves.length;
                const pending = studentLeaves.filter(l => l.status === 'pending').length;
                const approved = studentLeaves.filter(l => l.status === 'approved').length;
                const rejected = studentLeaves.filter(l => l.status === 'rejected').length;

                setStats({ total, pending, approved, rejected });
            }
        } catch (e) {
            console.error('Failed to fetch leaves:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        if (!schoolId) return;
        try {
            const res = await callApiWithBackoff(`${API_BASE_URL}/leave/${schoolId}/notifications?unread_only=true`, { method: 'GET' });
            if (res.success) {
                setNotifications(res.data.slice(0, 5)); // Show only 5 latest
            }
        } catch (e) {
            console.error('Failed to fetch notifications:', e);
        }
    };

    useEffect(() => {
        if (schoolId) {
            fetchLeaves();
            fetchNotifications();
        }
    }, [schoolId]);

    const updateStatus = async (leaveId, action) => {
        try {
            const res = await callApiWithBackoff(
                `${API_BASE_URL}/leave/${schoolId}/${leaveId}/${action}`,
                { method: 'POST' }
            );
            if (res.success) {
                // Update local state
                setLeaves(prev => prev.map(leave =>
                    leave.id === leaveId || leave.leaveId === leaveId
                        ? { ...leave, status: action === 'approve' ? 'approved' : 'rejected' }
                        : leave
                ));

                // Refresh stats
                fetchLeaves();
                fetchNotifications();
            }
        } catch (e) {
            console.error(`Failed to ${action} leave:`, e);
        }
    };

    const bulkUpdateStatus = async (action) => {
        if (selectedLeaves.length === 0) return;

        try {
            const promises = selectedLeaves.map(leaveId =>
                callApiWithBackoff(
                    `${API_BASE_URL}/leave/${schoolId}/${leaveId}/${action}`,
                    { method: 'POST' }
                )
            );

            await Promise.all(promises);
            setSelectedLeaves([]);
            fetchLeaves();
            fetchNotifications();
        } catch (e) {
            console.error(`Failed to bulk ${action}:`, e);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const filtered = getFilteredLeaves();
            setSelectedLeaves(filtered.map(l => l.id || l.leaveId));
        } else {
            setSelectedLeaves([]);
        }
    };

    const handleSelectLeave = (leaveId) => {
        setSelectedLeaves(prev =>
            prev.includes(leaveId)
                ? prev.filter(id => id !== leaveId)
                : [...prev, leaveId]
        );
    };

    const getFilteredLeaves = () => {
        if (filter === 'all') return leaves;
        return leaves.filter(leave => leave.status === filter);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredLeaves = getFilteredLeaves();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Leave Approval System</h1>
                    <p className="text-gray-600">Manage and approve student leave applications</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={fetchLeaves}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </button>
                    {notifications.length > 0 && (
                        <div className="relative">
                            <Bell className="w-6 h-6 text-gray-600" />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {notifications.length}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Leaves</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Approved</p>
                            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Rejected</p>
                            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                        </div>
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedLeaves.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                            <span className="font-medium">{selectedLeaves.length} leaves selected</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => bulkUpdateStatus('approve')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                Approve Selected
                            </button>
                            <button
                                onClick={() => bulkUpdateStatus('reject')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Reject Selected
                            </button>
                            <button
                                onClick={() => setSelectedLeaves([])}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="border rounded-lg px-3 py-2"
                        >
                            <option value="all">All Leaves</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="selectAll"
                            checked={selectedLeaves.length === filteredLeaves.length && filteredLeaves.length > 0}
                            onChange={handleSelectAll}
                            className="mr-2"
                        />
                        <label htmlFor="selectAll" className="text-sm text-gray-600">
                            Select All
                        </label>
                    </div>
                </div>
            </div>

            {/* Leaves Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                        <p className="mt-2 text-gray-600">Loading student leaves...</p>
                    </div>
                ) : filteredLeaves.length === 0 ? (
                    <div className="p-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="mt-4 text-gray-600">No student leave applications found</p>
                        <p className="text-sm text-gray-500">Student leaves will appear here when they apply for leave</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Select
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Class
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Leave Dates
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reason
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLeaves.map((leave) => (
                                    <tr key={leave.id || leave.leaveId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeaves.includes(leave.id || leave.leaveId)}
                                                onChange={() => handleSelectLeave(leave.id || leave.leaveId)}
                                                className="rounded"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {leave.applicantName || leave.studentName || 'Unknown Student'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {leave.studentId || leave.rollNumber || ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{leave.class || leave.className || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{leave.section || ''}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm">
                                                <div className="font-medium">{formatDate(leave.startDate)}</div>
                                                <div className="text-gray-500">to {formatDate(leave.endDate)}</div>
                                                <div className="text-xs text-gray-400">
                                                    {leave.duration || leave.days || 1} day(s)
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {leave.reason || 'No reason provided'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[leave.status] || 'bg-gray-100 text-gray-800'}`}>
                                                {leave.status?.toUpperCase() || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {leave.status === 'pending' && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => updateStatus(leave.id || leave.leaveId, 'approve')}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(leave.id || leave.leaveId, 'reject')}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {leave.status === 'approved' && (
                                                <span className="text-green-600">Approved</span>
                                            )}
                                            {leave.status === 'rejected' && (
                                                <span className="text-red-600">Rejected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Notifications Panel */}
            {notifications.length > 0 && (
                <div className="mt-8 bg-white rounded-xl shadow border">
                    <div className="p-4 border-b">
                        <h3 className="font-bold text-gray-900 flex items-center">
                            <Bell className="w-5 h-5 mr-2 text-blue-600" />
                            Recent Notifications
                        </h3>
                    </div>
                    <div className="divide-y">
                        {notifications.map((notification, idx) => (
                            <div key={idx} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="font-medium">{notification.title || 'New Leave Application'}</p>
                                        <p className="text-sm text-gray-600">{notification.message || 'A student has applied for leave'}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {notification.timestamp ? new Date(notification.timestamp).toLocaleTimeString() : 'Just now'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-8 text-center text-sm text-gray-500">
                <p>Student Leave Approval System • Enhanced with conditional approvals and real-time notifications</p>
                <p className="mt-1">Total {stats.total} student leave applications • {stats.pending} pending review</p>
            </div>
        </div>
    );
}