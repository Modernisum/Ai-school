// LeaveManagement.jsx – Admin view for leave applications
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, RefreshCw, Calendar, User } from 'lucide-react';
import { callApiWithBackoff } from '../../../utils/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
    return '622079';
};

export default function LeaveManagement({ schoolId: propSchoolId }) {
    const schoolId = propSchoolId || getSchoolId();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});

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

    useEffect(() => { fetchLeaves(); }, [schoolId]);

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

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Calendar className="mr-2 text-blue-600" size={28} />
                    Leave Management
                </h1>
                <button
                    onClick={fetchLeaves}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? <Loader size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
                    Refresh
                </button>
            </div>

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
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Employee</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Leave Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">From</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">To</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Reason</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {leaves.map(leave => (
                                <tr key={leave.leaveId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <User size={14} className="mr-2 text-gray-400" />
                                            <div>
                                                <p className="font-medium text-gray-800">{leave.employeeName || leave.employeeId}</p>
                                                <p className="text-xs text-gray-400">{leave.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 capitalize text-gray-700">{leave.leaveType}</td>
                                    <td className="px-4 py-3 text-gray-700">{leave.fromDate}</td>
                                    <td className="px-4 py-3 text-gray-700">{leave.toDate}</td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{leave.reason}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[leave.status] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
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
}
