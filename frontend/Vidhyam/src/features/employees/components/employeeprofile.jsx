// src/component/ui/employeeprofile.jsx - Complete Employee Profile with Responsibilities
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Home, CheckCircle, AlertTriangle as AlertIcon, X as CloseIcon
} from 'lucide-react';

// Import sub-components
import EmployeeProfileHeader from './employeeprofile/EmployeeProfileHeader';
import ResponsibilitySection from './employeeprofile/ResponsibilitySection';
import AttendanceSection from './employeeprofile/AttendanceSection';
import AwardsSection from './employeeprofile/AwardsSection';

// Import utility functions and constants
import {
  getSchoolIdFromStorage,
  callApiWithBackoff,
  RESPONSIBILITY_API_URL,
  ATTENDANCE_API_URL,
  AWARDS_API_URL,
  DEFAULT_SCHOOL_ID
} from './employeeprofile/employeeprofileUtils';

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

      if (result.success && Array.isArray(result.attendance)) {
        setAttendanceHistory(result.attendance);
        calculateAttendanceStats(result.attendance);
      } else {
        setAttendanceHistory([]);
        setAttendanceStats({ present: 0, absent: 0, holiday: 0, total: 0 });
      }
    } catch (error) {
      console.error('❌ Failed to load attendance:', error);
      setAttendanceHistory([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Load awards
  const loadAwards = async () => {
    setIsLoadingAwards(true);

    try {
      const apiUrl = `${AWARDS_API_URL}/${schoolId}/employee/${employeeId}`;
      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.awards)) {
        setAwards(result.awards);
      } else {
        setAwards([]);
      }
    } catch (error) {
      console.error('❌ Failed to load awards:', error);
      setAwards([]);
    } finally {
      setIsLoadingAwards(false);
    }
  };

  // Load holidays
  const loadHolidays = async () => {
    try {
      // This would be implemented when holiday API is available
      setHolidays([]);
    } catch (error) {
      console.error('❌ Failed to load holidays:', error);
    }
  };

  // Calculate attendance statistics
  const calculateAttendanceStats = (attendanceRecords) => {
    let present = 0;
    let absent = 0;
    let holiday = 0;

    attendanceRecords.forEach(record => {
      if (record.status === 'present') present++;
      else if (record.status === 'absent') absent++;
      else if (record.status === 'holiday') holiday++;
    });

    setAttendanceStats({
      present,
      absent,
      holiday,
      total: attendanceRecords.length
    });
  };

  // Navigation handlers
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleBackToEmployees = () => {
    navigate('/dashboard/employee');
  };

  const handleEditEmployee = () => {
    if (employee && employee.employeeId) {
      navigate(`/dashboard/employee/edit?employeeId=${employee.employeeId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      {/* Success Message */}
      {success && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 text-green-800 rounded-lg shadow-lg flex items-center max-w-sm">
          <CheckCircle size={18} className="mr-2 flex-shrink-0 text-green-600" />
          <p className="font-medium text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-3 text-green-600 hover:text-green-800">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Error Message */}
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
            <ResponsibilitySection employee={employee} isLoading={isLoadingEmployee} />

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
