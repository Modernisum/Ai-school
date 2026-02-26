// src/component/ui/employeeprofile.jsx - Complete Employee Profile with Responsibilities
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  User, Calendar, Clock, Award, ArrowLeft,
  BookOpen, Users, Edit3, Loader, AlertTriangle as AlertIcon,
  PieChart, CheckCircle, XCircle, Trophy, Star,
  GraduationCap, Target, TrendingUp, Home, ChevronLeft, ChevronRight,
  CreditCard, DollarSign, Minus, Plus, FileText, MessageSquare,
  Brain, TrendingDown, Shield, Zap, Eye, Download,
  File, Image, Upload, ExternalLink, ZoomIn, X as CloseIcon,
  Calendar as CalendarIcon, Building, Briefcase, Phone, Mail, MapPin,
  Badge, Timer, Medal
} from 'lucide-react';

// --- API Configuration ---
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const EMPLOYEES_API_URL = `${API_BASE_URL}/employees`;
const RESPONSIBILITY_API_URL = `${API_BASE_URL}/responsibility`;
const ATTENDANCE_API_URL = `${API_BASE_URL}/attendance`;
const AWARDS_API_URL = `${API_BASE_URL}/award`;
const FEES_API_URL = `${API_BASE_URL}/fees`;
const COMPLAINS_API_URL = `${API_BASE_URL}/complains`;
const EXAM_API_URL = `${API_BASE_URL}/exam`;
const DOCUMENTS_API_URL = `${API_BASE_URL}/documentbox`;

const MAX_RETRIES = 3;

// **AUTO School ID Management**
const getSchoolIdFromStorage = () => {
  try {
    const possibleKeys = [
      'schoolId', 'school_id', 'currentSchoolId', 'selectedSchoolId', 'userSchoolId', 'SCHOOL_ID'
    ];

    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
        return value.trim();
      }
    }

    const userData = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.schoolId) return parsed.schoolId;
        if (parsed.school_id) return parsed.school_id;
      } catch (e) { }
    }

    return null;
  } catch (error) {
    console.error('Error reading School ID from localStorage:', error);
    return null;
  }
};

const DEFAULT_SCHOOL_ID = "622079";

// Helper Functions
const formatDate = (date) => {
  if (!date) return 'N/A';
  const dateValue = date._seconds ? date._seconds * 1000 : date;
  const dateObj = new Date(dateValue);
  if (isNaN(dateObj)) return 'Invalid Date';
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const dateValue = typeof date === 'string' ? new Date(date) : (date._seconds ? date._seconds * 1000 : date);
  const dateObj = new Date(dateValue);
  if (isNaN(dateObj)) return 'Invalid Date';
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTime = (time) => {
  if (!time) return 'N/A';
  const timeValue = time._seconds ? time._seconds * 1000 : time;
  const timeObj = new Date(timeValue);
  if (isNaN(timeObj)) return 'Invalid Time';
  return timeObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

// API call with exponential backoff
const callApiWithBackoff = async (apiUrl, options = {}) => {
  let lastError = null;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      if (i > 0) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(apiUrl, options);
      let result;

      try {
        result = await response.json();
      } catch (e) {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${text.substring(0, 100)}...`);
        }
        return { success: true, data: [], message: "Operation completed successfully." };
      }

      if (response.ok) {
        return result;
      } else {
        const errorMessage = result.message || result.error || `HTTP Error ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      lastError = error;
      if (i === MAX_RETRIES - 1) {
        throw new Error(`${lastError.message}`);
      }
    }
  }
};

// Employee Types Configuration
const EMPLOYEE_TYPES = {
  'Teacher': { icon: GraduationCap, color: 'bg-blue-100 text-blue-800' },
  'Principal': { icon: User, color: 'bg-purple-100 text-purple-800' },
  'Vice Principal': { icon: User, color: 'bg-indigo-100 text-indigo-800' },
  'Admin Staff': { icon: Building, color: 'bg-gray-100 text-gray-800' },
  'Peon': { icon: User, color: 'bg-green-100 text-green-800' },
  'Security Guard': { icon: Badge, color: 'bg-orange-100 text-orange-800' },
  'Librarian': { icon: BookOpen, color: 'bg-pink-100 text-pink-800' },
  'Lab Assistant': { icon: User, color: 'bg-cyan-100 text-cyan-800' },
  'Sports Coach': { icon: Trophy, color: 'bg-yellow-100 text-yellow-800' },
  'Counselor': { icon: User, color: 'bg-teal-100 text-teal-800' }
};

// Employee Profile Header Component
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

// Responsibility Section Component
const ResponsibilitySection = ({ employee, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader size={24} className="animate-spin text-blue-600 mr-2" />
          <span>Loading responsibilities...</span>
        </div>
      </div>
    );
  }

  if (!employee || !employee.responsibilities) {
    return (
      <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
          <Briefcase className="mr-2 text-blue-600" size={20} />
          Responsibilities & Salary
        </h3>
        <div className="text-center py-8">
          <Briefcase size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No responsibilities assigned</p>
        </div>
      </div>
    );
  }

  const responsibilities = employee.responsibilities || [];
  const totalPerDayPrice = employee.totalPerDayPrice || 0;
  const baseSalary = employee.baseSalary || 0;

  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
        <Briefcase className="mr-2 text-blue-600" size={20} />
        Responsibilities & Salary ({responsibilities.length})
      </h3>

      {/* Salary Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg border border-green-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-medium">Per Day Price</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(totalPerDayPrice)}</p>
            </div>
            <DollarSign size={24} className="text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg border border-blue-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-medium">Monthly Salary</p>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(baseSalary)}</p>
            </div>
            <CreditCard size={24} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg border border-purple-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-medium">Responsibilities</p>
              <p className="text-2xl font-bold text-purple-800">{responsibilities.length}</p>
            </div>
            <Target size={24} className="text-purple-600" />
          </div>
        </div>
      </div>

      {/* Responsibilities List */}
      {responsibilities.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Current Responsibilities:</h4>
          {responsibilities.map((responsibility, index) => (
            <div key={responsibility.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-1">{responsibility.name}</h5>
                  <p className="text-sm text-gray-600">{responsibility.responsibilityField}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Space & Category</p>
                  <div className="flex items-center text-sm">
                    <Building size={14} className="text-gray-400 mr-1" />
                    <span>{responsibility.spaceId}</span>
                  </div>
                  <p className="text-xs text-gray-500">{responsibility.spaceCategory}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Daily Rate & Hours</p>
                  <div className="flex items-center text-sm font-medium text-green-600">
                    <DollarSign size={14} className="mr-1" />
                    <span>{formatCurrency(responsibility.perDayPrice)}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Timer size={12} className="mr-1" />
                    <span>{responsibility.timePeriod}h per day</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${responsibility.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {responsibility.isActive ? (
                        <>
                          <CheckCircle size={12} className="mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle size={12} className="mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Added: {formatDate(responsibility.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Briefcase size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No responsibilities assigned to this employee</p>
        </div>
      )}
    </div>
  );
};

// Attendance Section Component
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

// Awards Section Component
const AwardsSection = ({ awards, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white border-2 border-yellow-200 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader size={24} className="animate-spin text-yellow-600 mr-2" />
          <span>Loading awards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-yellow-200 rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
        <Award className="mr-2 text-yellow-600" size={20} />
        Awards & Achievements ({awards.length})
      </h3>

      {awards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {awards.map((award, index) => (
            <div key={award.awardId || index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Medal className="text-yellow-600 mr-2" size={18} />
                    <h4 className="font-semibold text-gray-800">{award.awardName}</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Type:</span> <span className="text-gray-700">{award.awardType}</span></p>
                    <p><span className="text-gray-500">Position:</span> <span className="font-medium text-yellow-600">{award.position}</span></p>
                    {award.description && (
                      <p><span className="text-gray-500">Description:</span> <span className="text-gray-700">{award.description}</span></p>
                    )}
                    <p className="text-xs text-gray-500">
                      Awarded: {formatDateTime(award.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Trophy size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No awards found</p>
        </div>
      )}
    </div>
  );
};

// Main Employee Profile Component
export default function EmployeeProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const employeeIdFromUrl = queryParams.get('employeeId');

  const [schoolId, setSchoolId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employee, setEmployee] = useState(null);

  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [awards, setAwards] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, holiday: 0, total: 0 });

  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isLoadingAwards, setIsLoadingAwards] = useState(true);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Initialize
  useEffect(() => {
    const foundSchoolId = getSchoolIdFromStorage();
    setSchoolId(foundSchoolId || DEFAULT_SCHOOL_ID);

    if (employeeIdFromUrl) {
      setEmployeeId(employeeIdFromUrl);
    }
  }, [employeeIdFromUrl]);

  // Load data when IDs available
  useEffect(() => {
    if (schoolId && employeeId) {
      loadEmployeeData();
      loadAttendanceHistory();
      loadAwards();
      loadHolidays();
    }
  }, [schoolId, employeeId]);

  // Auto dismiss messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load employee data with responsibilities
  const loadEmployeeData = async () => {
    setIsLoadingEmployee(true);
    setError(null);

    try {
      // Use the API endpoint from your response
      const apiUrl = `${RESPONSIBILITY_API_URL}/${schoolId}/employees/${employeeId}`;
      console.log(`📖 Loading employee from: ${apiUrl}`);

      const result = await callApiWithBackoff(apiUrl);

      if (result.success && result.employee) {
        setEmployee(result.employee);
        setSuccess(`Employee ${employeeId} data loaded successfully`);
        console.log(`✅ Loaded employee:`, result.employee);
      } else {
        throw new Error(result.message || 'Employee not found');
      }
    } catch (error) {
      setError(`Failed to load employee data: ${error.message}`);
      console.error('❌ Failed to load employee:', error);
    } finally {
      setIsLoadingEmployee(false);
    }
  };

  // Load attendance history
  const loadAttendanceHistory = async () => {
    setIsLoadingAttendance(true);

    try {
      const apiUrl = `${ATTENDANCE_API_URL}/${schoolId}/employee/${employeeId}/history`;
      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.data)) {
        const sortedHistory = result.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceHistory(sortedHistory);

        // Calculate stats
        const presentCount = sortedHistory.filter(r => r.action === 'present_marked').length;
        const absentCount = sortedHistory.filter(r => r.action === 'absent_marked').length;
        setAttendanceStats({
          present: presentCount,
          absent: absentCount,
          total: presentCount + absentCount
        });
      } else {
        setAttendanceHistory([]);
        setAttendanceStats({ present: 0, absent: 0, total: 0 });
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setAttendanceHistory([]);
      setAttendanceStats({ present: 0, absent: 0, total: 0 });
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const res = await callApiWithBackoff(`${API_BASE_URL}/operations/attendance/${schoolId}/holidays`);
      if (res.success) setHolidays(res.data || []);
    } catch (e) { console.error(e); }
  };

  // Compute attendance stats whenever history or holidays change
  useEffect(() => {
    if (attendanceHistory.length === 0) {
      setAttendanceStats({ present: 0, absent: 0, holiday: 0, total: 0 });
      return;
    }

    const presentCount = attendanceHistory.filter(r => r.action === 'present_marked' || r.status === 'present').length;
    const absentCount = attendanceHistory.filter(r => r.action === 'absent_marked' || r.status === 'absent').length;

    // Range is from earliest attendance date to today
    const dates = attendanceHistory.map(r => new Date(r.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(); // up to today

    let holidayCount = 0;
    let cur = new Date(minDate);
    while (cur <= maxDate) {
      const dStr = cur.toISOString().split('T')[0];
      const isSun = cur.getDay() === 0;
      const isH = holidays.find(h => dStr >= h.fromDate && dStr <= (h.toDate || h.fromDate));

      if (isSun || isH) {
        const inHistory = attendanceHistory.find(r => r.date === dStr);
        if (!inHistory || (inHistory.status !== 'present' && inHistory.status !== 'absent')) {
          holidayCount++;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    setAttendanceStats({
      present: presentCount,
      absent: absentCount,
      holiday: holidayCount,
      total: presentCount + absentCount + holidayCount
    });
  }, [attendanceHistory, holidays]);

  // Load awards
  const loadAwards = async () => {
    setIsLoadingAwards(true);

    try {
      const apiUrl = `${AWARDS_API_URL}/${schoolId}/employees/${employeeId}/awards`;
      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.data)) {
        setAwards(result.data);
      } else {
        setAwards([]);
      }
    } catch (error) {
      console.error('Failed to load awards:', error);
      setAwards([]);
    } finally {
      setIsLoadingAwards(false);
    }
  };

  // Navigation handlers
  const handleBackToEmployees = () => {
    navigate('/dashboard/employee');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard/home');
  };

  const handleEditEmployee = () => {
    navigate(`/dashboard/employeeform?mode=edit&employeeId=${employeeId}`);
  };

  // Loading state
  if (!employeeIdFromUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <AlertIcon size={48} className="text-yellow-600 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-800">No Employee ID provided</p>
          <p className="text-sm text-gray-600 mb-4">Please select an employee from the list</p>
          <button
            onClick={handleBackToEmployees}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Employee List
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-800">Loading employee profile...</p>
          <p className="text-sm text-gray-600">Employee ID: {employeeId}</p>
          <p className="text-sm text-gray-600">School ID: {schoolId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <AlertIcon size={48} className="text-red-600 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-800">Error Loading Profile</p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={loadEmployeeData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Retry
            </button>
            <button
              onClick={handleBackToEmployees}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Employee List
            </button>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <User size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-800">Employee Not Found</p>
          <p className="text-sm text-gray-600 mb-4">Employee ID: {employeeId}</p>
          <div className="space-x-3">
            <button
              onClick={handleBackToEmployees}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Employee List
            </button>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
      {/* Notifications */}
      {success && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 text-green-800 rounded-lg shadow-lg flex items-center max-w-sm">
          <CheckCircle size={18} className="mr-2 flex-shrink-0 text-green-600" />
          <p className="font-medium text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-3 text-green-600 hover:text-green-800">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-gradient-to-r from-red-100 to-rose-100 border-2 border-red-300 text-red-800 rounded-lg shadow-lg flex items-center max-w-sm">
          <AlertIcon size={18} className="mr-2 flex-shrink-0 text-red-600" />
          <p className="font-medium text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-800">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <Home size={24} />
            </button>
            <button
              onClick={handleBackToEmployees}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <ArrowLeft className="mr-2" size={20} />
              Back to Employee List
            </button>
          </div>

          <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <span>School ID: <span className="font-bold text-blue-600">{schoolId}</span></span>
              <span className="mx-2">|</span>
              <span className="text-green-600">✓ Employee Profile</span>
            </div>
          </div>
        </div>

        {/* Employee Profile Header */}
        <EmployeeProfileHeader employee={employee} onEdit={handleEditEmployee} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column */}
          <div>
            {/* Responsibilities Section */}
            <ResponsibilitySection employee={employee} isLoading={false} />

            {/* Awards Section */}
            <AwardsSection awards={awards} isLoading={isLoadingAwards} />
          </div>

          {/* Right Column */}
          <div>
            {/* Attendance Section */}
            <AttendanceSection
              attendanceHistory={attendanceHistory}
              attendanceStats={attendanceStats}
              isLoading={isLoadingAttendance}
            />
          </div>
        </div>
      </div>
    </div>
  );
}