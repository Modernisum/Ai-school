// EmployeeLeaveApplication.jsx – Form for employees to apply for leave
import React, { useState, useEffect } from 'react';
import { Calendar, Upload, AlertCircle, CheckCircle, XCircle, Loader, Briefcase, UserCheck } from 'lucide-react';
import { callApiWithBackoff } from '../../../../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getSchoolId = () => {
    for (const k of ['schoolId', 'school_id', 'currentSchoolId']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined') return v;
    }
    return "";
};

const getEmployeeId = () => {
    for (const k of ['userId', 'user_id', 'employeeId', 'employee_id']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined') return v;
    }
    return "";
};

const LEAVE_TYPES = [
    { value: 'casual', label: 'Casual Leave', maxDays: 12, description: 'For personal or family reasons' },
    { value: 'sick', label: 'Sick Leave', maxDays: 15, description: 'Medical illness with certificate required for >3 days' },
    { value: 'earned', label: 'Earned Leave', maxDays: 30, description: 'Accumulated leave based on service period' },
    { value: 'maternity', label: 'Maternity Leave', maxDays: 180, description: 'For childbirth and postnatal care' },
    { value: 'paternity', label: 'Paternity Leave', maxDays: 15, description: 'For new fathers' },
    { value: 'bereavement', label: 'Bereavement Leave', maxDays: 7, description: 'Death in immediate family' },
    { value: 'study', label: 'Study Leave', maxDays: 30, description: 'For academic pursuits with approval' },
    { value: 'sabbatical', label: 'Sabbatical', maxDays: 365, description: 'Long-term professional development' }
];

export default function EmployeeLeaveApplication() {
    const schoolId = getSchoolId();
    const employeeId = getEmployeeId();
    
    const [form, setForm] = useState({
        leaveType: 'casual',
        fromDate: '',
        toDate: '',
        reason: '',
        emergencyContact: '',
        attachments: [],
        priority: 'normal',
        coverageRequired: true,
        handoverNotes: '',
        reportingManager: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [managers, setManagers] = useState([]);
    const [coverageOptions, setCoverageOptions] = useState([]);

    // Calculate days difference
    const calculateDays = () => {
        if (!form.fromDate || !form.toDate) return 0;
        const from = new Date(form.fromDate);
        const to = new Date(form.toDate);
        const diffTime = Math.abs(to - from);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    // Fetch leave balance and manager list
    useEffect(() => {
        const fetchData = async () => {
            if (!schoolId || !employeeId) return;
            
            try {
                // Fetch leave balance
                const balanceRes = await callApiWithBackoff(
                    `${API_BASE_URL}/leave/${schoolId}/balance/${employeeId}`,
                    { method: 'GET' }
                );
                if (balanceRes.success) {
                    setLeaveBalance(balanceRes.data);
                }

                // Fetch managers (simplified - in real app would call API)
                setManagers([
                    { id: 'manager1', name: 'Principal', role: 'Principal' },
                    { id: 'manager2', name: 'Vice Principal', role: 'Vice Principal' },
                    { id: 'manager3', name: 'Head of Department', role: 'HOD' }
                ]);

                // Fetch coverage options
                const coverageRes = await callApiWithBackoff(
                    `${API_BASE_URL}/leave/${schoolId}/coverage/available`,
                    { method: 'GET' }
                );
                if (coverageRes.success) {
                    setCoverageOptions(coverageRes.data);
                }
            } catch (e) {
                console.error('Failed to fetch data:', e);
            }
        };
        fetchData();
    }, [schoolId, employeeId]);

    // Handle file upload
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setAttachmentFiles(files);
        
        const filePromises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result.split(',')[1]
                });
                reader.readAsDataURL(file);
            });
        });
        
        Promise.all(filePromises).then(attachments => {
            setForm(prev => ({ ...prev, attachments }));
        });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!schoolId || !employeeId) {
            setError('School ID or Employee ID not found. Please login again.');
            return;
        }

        if (!form.fromDate || !form.toDate) {
            setError('Please select both start and end dates.');
            return;
        }

        const days = calculateDays();
        if (days <= 0) {
            setError('End date must be after start date.');
            return;
        }

        // Check against max days for leave type
        const leaveTypeConfig = LEAVE_TYPES.find(t => t.value === form.leaveType);
        if (leaveTypeConfig && days > leaveTypeConfig.maxDays) {
            setError(`${leaveTypeConfig.label} cannot exceed ${leaveTypeConfig.maxDays} days.`);
            return;
        }

        if (!form.reason.trim()) {
            setError('Please provide a reason for leave.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const payload = {
                applicant_id: employeeId,
                applicant_type: 'employee',
                leave_type: form.leaveType,
                from_date: form.fromDate,
                to_date: form.toDate,
                reason: form.reason,
                emergency_contact: form.emergencyContact,
                attachments: form.attachments,
                priority: form.priority,
                coverage_required: form.coverageRequired,
                handover_notes: form.handoverNotes,
                reporting_manager: form.reportingManager,
                status: 'pending',
                submitted_via: 'web_portal',
                total_days: days
            };

            const res = await callApiWithBackoff(
                `${API_BASE_URL}/leave/${schoolId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );

            if (res.success) {
                setSuccess(true);
                // Reset form
                setForm({
                    leaveType: 'casual',
                    fromDate: '',
                    toDate: '',
                    reason: '',
                    emergencyContact: '',
                    attachments: [],
                    priority: 'normal',
                    coverageRequired: true,
                    handoverNotes: '',
                    reportingManager: ''
                });
                setAttachmentFiles([]);
                
                // Show success for 5 seconds
                setTimeout(() => setSuccess(false), 5000);
            } else {
                setError(res.message || 'Failed to submit leave application');
            }
        } catch (e) {
            setError('Network error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const days = calculateDays();
    const selectedLeaveType = LEAVE_TYPES.find(t => t.value === form.leaveType);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Employee Leave Application</h1>
                <p className="text-gray-600">Submit a leave application for manager approval</p>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">Leave application submitted successfully!</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                        Your leave application has been submitted for approval. You will be notified once it's reviewed.
                    </p>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                        <span className="text-red-800 font-medium">Error</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Leave Balance & Info Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Leave Balance Card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h2>
                        
                        {leaveBalance ? (
                            <div className="space-y-3">
                                {Object.entries(leaveBalance).map(([type, balance]) => (
                                    <div key={type} className="p-3 bg-gray-50 rounded border border-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-800 capitalize">{type}</span>
                                            <span className="text-sm font-bold text-blue-600">
                                                {balance.used || 0}/{balance.annual_quota || 0}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full" 
                                                style={{ 
                                                    width: `${Math.min(100, ((balance.used || 0) / (balance.annual_quota || 1)) * 100)}%` 
                                                }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {balance.remaining || 0} days remaining
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                <p className="text-gray-500 mt-2">Loading leave balance...</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Policy</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Casual Leave</span>
                                <span className="text-sm font-medium text-gray-900">12 days/year</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Sick Leave</span>
                                <span className="text-sm font-medium text-gray-900">15 days/year</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Earned Leave</span>
                                <span className="text-sm font-medium text-gray-900">30 days/year</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Maternity Leave</span>
                                <span className="text-sm font-medium text-gray-900">180 days</span>
                            </div>
                        </div>
                    </div>

                    {/* Important Notes */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Important Notes</h2>
                        <ul className="text-sm text-gray-600 space-y-2">
                            <li className="flex items-start">
                                <AlertCircle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Submit leave applications at least 3 working days in advance</span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Sick leaves require medical certificate for more than 3 days</span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Ensure proper handover before proceeding on leave</span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Check with HR for special leave types (study, sabbatical)</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Application Form */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <div className="space-y-8">
                            {/* Leave Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-4">
                                    Select Leave Type <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {LEAVE_TYPES.map(type => (
                                        <label
                                            key={type.value}
                                            className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${form.leaveType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="leaveType"
                                                value={type.value}
                                                checked={form.leaveType === type.value}
                                                onChange={handleChange}
                                                className="sr-only"
                                            />
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-medium text-gray-900">{type.label}</span>
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    Max {type.maxDays}d
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-600">{type.description}</span>
                                            {form.leaveType === type.value && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range & Duration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        From Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="date"
                                            name="fromDate"
                                            value={form.fromDate}
                                            onChange={handleChange}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        To Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="date"
                                            name="toDate"
                                            value={form.toDate}
                                            onChange={handleChange}
                                            min={form.fromDate || new Date().toISOString().split('T')[0]}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Duration
                                    </label>
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="