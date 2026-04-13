// StudentLeaveApplication.jsx – Form for students to apply for leave
import React, { useState, useEffect } from 'react';
import { Calendar, Upload, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { callApiWithBackoff } from '../../../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getSchoolId = () => {
    for (const k of ['schoolId', 'school_id', 'currentSchoolId']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined') return v;
    }
    return "";
};

const getStudentId = () => {
    for (const k of ['userId', 'user_id', 'studentId', 'student_id']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined') return v;
    }
    return "";
};

const LEAVE_TYPES = [
    { value: 'sick', label: 'Sick Leave', description: 'Medical illness or health issue' },
    { value: 'casual', label: 'Casual Leave', description: 'Personal or family reasons' },
    { value: 'emergency', label: 'Emergency Leave', description: 'Urgent family emergency' },
    { value: 'academic', label: 'Academic Leave', description: 'Exam preparation or academic event' },
    { value: 'other', label: 'Other', description: 'Any other reason' }
];

export default function StudentLeaveApplication() {
    const schoolId = getSchoolId();
    const studentId = getStudentId();
    
    const [form, setForm] = useState({
        leaveType: 'casual',
        fromDate: '',
        toDate: '',
        reason: '',
        emergencyContact: '',
        attachments: [],
        priority: 'normal'
    });
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [attachmentFiles, setAttachmentFiles] = useState([]);

    // Calculate days difference
    const calculateDays = () => {
        if (!form.fromDate || !form.toDate) return 0;
        const from = new Date(form.fromDate);
        const to = new Date(form.toDate);
        const diffTime = Math.abs(to - from);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    // Fetch leave balance
    useEffect(() => {
        const fetchLeaveBalance = async () => {
            if (!schoolId || !studentId) return;
            try {
                const res = await callApiWithBackoff(
                    `${API_BASE_URL}/leave/${schoolId}/balance/${studentId}`,
                    { method: 'GET' }
                );
                if (res.success) {
                    setLeaveBalance(res.data);
                }
            } catch (e) {
                console.error('Failed to fetch leave balance:', e);
            }
        };
        fetchLeaveBalance();
    }, [schoolId, studentId]);

    // Handle file upload
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setAttachmentFiles(files);
        
        // Convert files to base64 for preview
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
        if (!schoolId || !studentId) {
            setError('School ID or Student ID not found. Please login again.');
            return;
        }

        if (!form.fromDate || !form.toDate) {
            setError('Please select both start and end dates.');
            return;
        }

        if (calculateDays() <= 0) {
            setError('End date must be after start date.');
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
                applicant_id: studentId,
                applicant_type: 'student',
                leave_type: form.leaveType,
                from_date: form.fromDate,
                to_date: form.toDate,
                reason: form.reason,
                emergency_contact: form.emergencyContact,
                attachments: form.attachments,
                priority: form.priority,
                status: 'pending',
                submitted_via: 'web_portal'
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
                    priority: 'normal'
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
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const days = calculateDays();

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Apply for Leave</h1>
                <p className="text-gray-600">Submit a leave application for approval</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leave Balance Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h2>
                        
                        {leaveBalance ? (
                            <div className="space-y-4">
                                {Object.entries(leaveBalance).map(([type, balance]) => (
                                    <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                        <div>
                                            <span className="font-medium text-gray-800 capitalize">{type}</span>
                                            <p className="text-sm text-gray-600">Annual quota</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-blue-600">{balance.used || 0}/{balance.annual_quota || 0}</span>
                                            <p className="text-sm text-gray-600">{balance.remaining || 0} days remaining</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                <p className="text-gray-500 mt-2">Loading leave balance...</p>
                            </div>
                        )}
                        
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Important Notes</h3>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Submit leave applications at least 2 days in advance</li>
                                <li>• Emergency leaves require valid documentation</li>
                                <li>• Sick leaves require medical certificate if more than 3 days</li>
                                <li>• Check with your class teacher for academic leave approval</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Application Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <div className="space-y-6">
                            {/* Leave Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Leave Type <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                                            <span className="font-medium text-gray-900">{type.label}</span>
                                            <span className="text-sm text-gray-600 mt-1">{type.description}</span>
                                            {form.leaveType === type.value && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            </div>

                            {/* Days Calculation */}
                            {days > 0 && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-medium text-blue-900">Leave Duration</span>
                                            <p className="text-sm text-blue-700">{days} day{days !== 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-blue-600">{form.fromDate} to {form.toDate}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Reason for Leave <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="reason"
                                    value={form.reason}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Please provide detailed reason for your leave application..."
                                    required
                                />
                            </div>

                            {/* Emergency Contact */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Emergency Contact (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="emergencyContact"
                                    value={form.emergencyContact}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Parent/Guardian contact number"
                                />
                            </div>

                            {/* Attachments */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Supporting Documents (Optional)
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600 mb-2">
                                        <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                                            Click to upload
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            />
                                        </label>{' '}
                                        or drag and drop
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        PDF, JPG, PNG, DOC up to 10MB each
                                    </p>
                                    
                                    {attachmentFiles.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Files:</h4>
                                            <ul className="space-y-2">
                                                {attachmentFiles.map((file, index) => (
                                                    <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                                        <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Priority Level
                                </label>
                                <div className="flex space-x-4">
                                    {['low', 'normal', 'high', 'urgent'].map(level => (
                                        <label key={level} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="priority"
                                                value={level}
                                                checked={form.priority === level}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-900 capitalize">{level}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-3 px-4 rounded-lg font-medium text-white ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin inline mr-2" />
                                            Submitting Application...
                                        </>
                                    ) : (
                                        'Submit Leave Application'
                                    )}
                                </button>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    By submitting, you agree that all information provided is accurate.
                                </p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}