// EnhancedLeaveManagement.jsx - Main admin interface for enhanced leave system
import React, { useState, useEffect } from 'react';
import { Calendar, Bell, Filter, CheckCircle, XCircle, Clock, Users, Loader, RefreshCw } from 'lucide-react';
import { callApiWithBackoff } from '../../../../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getSchoolId = () => {
    for (const k of ['schoolId', 'school_id', 'currentSchoolId']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined') return v;
    }
    return "";
};

const EnhancedLeaveManagement = ({ schoolId: propSchoolId }) => {
    const schoolId = propSchoolId || getSchoolId();
    const [leaves, setLeaves] = useState([]);
    const [selectedLeaves, setSelectedLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filters, setFilters] = useState({ status: 'all', department: 'all', leaveType: 'all' });

    const fetchLeaves = async () => {
        if (!schoolId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await callApiWithBackoff(`${API_BASE_URL}/leave/${schoolId}`, { method: 'GET' });
            if (Array.isArray(res)) setLeaves(res);
            else if (res.leaves) setLeaves(res.leaves);
        } catch (e) {
            setError('Failed to fetch leave applications: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await callApiWithBackoff(`${API_BASE_URL}/notifications/${schoolId}`, { method: 'GET' });
            if (res.success) {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.read).length);
            }
        } catch (e) {
            console.error('Failed to fetch notifications:', e);
        }
    };

    useEffect(() => {
        fetchLeaves();
        fetchNotifications();
        const interval = setInterval(() => {
            fetchLeaves();
            fetchNotifications();
        }, 30000);
        return () => clearInterval(interval);
    }, [schoolId]);

    const updateStatus = async (leaveId, action) => {
        setActionLoading(prev => ({ ...prev, [leaveId]: action }));
        try {
            await callApiWithBackoff(`${API_BASE_URL}/leave/${schoolId}/${leaveId}/${action}`, { method: 'POST' });
            setLeaves(prev => prev.map(l => l.leaveId === leaveId ? { ...l, status: action === 'approve' ? 'approved' : 'rejected' } : l));
        } catch (e) {
            setError(`Failed to ${action} leave: ${e.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [leaveId]: null }));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedLeaves.length === 0) return;
        try {
            await Promise.all(selectedLeaves.map(leaveId =>
                callApiWithBackoff(`${API_BASE_URL}/leave/${schoolId}/${leaveId}/approve`, { method: 'POST' })
            ));
            setLeaves(prev => prev.map(l =>
                selectedLeaves.includes(l.leaveId) ? { ...l, status: 'approved' } : l
            ));
            setSelectedLeaves([]);
        } catch (e) {
            setError('Failed to bulk approve leaves: ' + e.message);
        }
    };

    const handleBulkReject = async () => {
        if (selectedLeaves.length === 0) return;
        try {
            await Promise.all(selectedLeaves.map(leaveId =>
                callApiWithBackoff(`${API_BASE_URL}/leave/${schoolId}/${leaveId}/reject`, { method: 'POST' })
            ));
            setLeaves(prev => prev.map(l =>
                selectedLeaves.includes(l.leaveId) ? { ...l, status: 'rejected' } : l
            ));
            setSelectedLeaves([]);
        } catch (e) {
            setError('Failed to bulk reject leaves: ' + e.message);
        }
    };

    const handleSelectLeave = (leaveId) => {
        setSelectedLeaves(prev =>
            prev.includes(leaveId)
                ? prev.filter(id => id !== leaveId)
                : [...prev, leaveId]
        );
    };

    const handleSelectAll = () => {
        if (selectedLeaves.length === leaves.length) {
            setSelectedLeaves([]);
        } else {
            setSelectedLeaves(leaves.map(l => l.leaveId));
        }
    };

    const filteredLeaves = leaves.filter(leave => {
        if (filters.status !== 'all' && leave.status !== filters.status) return false;
        if (filters.department !== 'all' && leave.department !== filters.department) return false;
        if (filters.leaveType !== 'all' && leave.leaveType !== filters.leaveType) return false;
        return true;
    });

    const pendingCount = leaves.filter(l => l.status === 'pending').length;
    const approvedCount = leaves.filter(l => l.status === 'approved').length;
    const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Calendar className="mr-3 text-blue-600" size={32} />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Enhanced Leave Management</h1>
                        <p className="text-gray-500 text-sm">Real-time leave requests with enhanced features</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button className="relative p-2">
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={fetchLeaves}
                        disabled={loading}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? <Loader size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
                        Refresh
                    </button>
                </div>
            </div>

            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Pending Requests</p>
                            <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
                        </div>
                        <Clock className="text-yellow-500" size={24} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Approved</p>
                            <p className="text-2xl font-bold text-gray-800">{approvedCount}</p>
                        </div>
                        <CheckCircle className="text-green-500" size={24} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Rejected</p>
                            <p className="text-2xl font-bold text-gray-800">{rejectedCount}</p>
                        </div>
                        <XCircle className="text-red-500" size={24} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Employees</p>
                            <p className="text-2xl font-bold text-gray-800">{leaves.length}</p>
                        </div>
                        <Users className="text-blue-500" size={24} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                        <Filter size={18} className="mr-2" />
                        Filters
                    </h3>

                    {selectedLeaves.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{selectedLeaves.length} selected</span>
                            <button
                                onClick={handleBulkApprove}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                            >
                                Bulk Approve
                            </button>
                            <button
                                onClick={handleBulkReject}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                            >
                                Bulk Reject
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                            value={filters.department}
                            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="all">All Departments</option>
                            <option value="teaching">Teaching</option>
                            <option value="administration">Administration</option>
                            <option value="support">Support</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                        <select
                            value={filters.leaveType}
                            onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="all">All Types</option>
                            <option value="sick">Sick Leave</option>
                            <option value="casual">Casual Leave</option>
                            <option value="earned">Earned Leave</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Leave Table */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {loading && leaves.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <Loader size={40} className="animate-spin text-blue-600" />
                </div>
            ) : leaves.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No leave applications found</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedLeaves.length === leaves.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Employee</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Leave Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">From</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">To</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredLeaves.map(leave => (
                                <tr key={leave.leaveId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeaves.includes(leave.leaveId)}
                                            onChange={() => handleSelectLeave(leave.leaveId)}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <div>
                                                <p className="font-medium text-gray-800">{leave.employeeName || leave.employeeId}</p>
                                                <p className="text-xs text-gray-400">{leave.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 capitalize text-gray-700">{leave.leaveType}</td>
                                    <td className="px-4 py-3 text-gray-700">{leave.fromDate}</td>
                                    <td className="px-4 py-3 text-gray-700">{leave.toDate}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border capitalize ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                leave.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                                                    'bg-red-100 text-red-800 border-red-300'
                                            }`}>
                                            {leave.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {leave.status === 'pending' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateStatus(leave.leaveId, 'approve')}
                                                    disabled={!!actionLoading[leave.leaveId]}
                                                    className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs disabled:opacity-50"
                                                >
                                                    {actionLoading[leave.leaveId] === 'approve'
                                                        ? <Loader size={12} className="animate-spin mr-1" />
                                                        : <CheckCircle size={12} className="mr-1" />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(leave.leaveId, 'reject')}
                                                    disabled={!!actionLoading[leave.leaveId]}
                                                    className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs disabled:opacity-50"
                                                >
                                                    {actionLoading[leave.leaveId] === 'reject'
                                                        ? <Loader size={12} className="animate-spin mr-1" />
                                                        : <XCircle size={12} className="mr-1" />}
                                                    Reject
                                                </button>
                                            </div>
                                        ) : leave.status === 'approved' ? (
                                            <a
                                                href={`${API_BASE_URL}/leave/${schoolId}/${leave.leaveId}/pdf`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                                            >
                                                Download PDF
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EnhancedLeaveManagement;
