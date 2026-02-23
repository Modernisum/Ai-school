import React, { useState, useEffect } from 'react';

const AttendanceManager = () => {
  // Get data from localStorage
  const getSchoolId = () => localStorage.getItem('schoolId') || '622079';
  const getSchoolName = () => localStorage.getItem('schoolName') || 'Modern School';

  // State Management
  const [activeTab, setActiveTab] = useState('student-mark');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data States
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [employeeAttendanceData, setEmployeeAttendanceData] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Form States
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkAction, setBulkAction] = useState('present');
  const [reason, setReason] = useState('');

  const schoolId = getSchoolId();

  const apiCall = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await response.json();
    return { data, success: response.ok };
  };

  const attendanceApi = {
    get: (url) => apiCall(`${process.env.REACT_APP_API_BASE_URL}/attendance${url}`, { method: 'GET' }),
    post: (url, body) => apiCall(`${process.env.REACT_APP_API_BASE_URL}/attendance${url}`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (url) => apiCall(`${process.env.REACT_APP_API_BASE_URL}/attendance${url}`, { method: 'DELETE' }),
  };

  // Utility Functions
  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  };

  // Fetch Classes
  const fetchClasses = async () => {
    try {
      const response = await apiCall(process.env.REACT_APP_API_BASE_URL + `/class/${schoolId}/classIds`, { method: 'GET' });
      if (response.data.success) {
        setClasses(response.data.classIds || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Fetch Students by Class
  const fetchStudentsByClass = async (className) => {
    if (!className) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);
      const response = await attendanceApi.get(`/${schoolId}/students/attendance/${selectedDate}/${className}`);
      if (response.data.success) {
        setStudents(response.data.data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showMessage('Error fetching students', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch All Students Attendance
  const fetchAllStudentsAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.get(`/${schoolId}/students/attendance/${selectedDate}`);
      if (response.data.success) {
        setAttendanceData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      showMessage('Error fetching attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employee Attendance
  const fetchEmployeeAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.get(`/${schoolId}/employees/attendance/${selectedDate}`);
      if (response.data.success) {
        setEmployeeAttendanceData(response.data.data);
        setEmployees(response.data.data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      showMessage('Error fetching employee attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Holidays
  const fetchHolidays = async () => {
    try {
      const response = await attendanceApi.get(`/${schoolId}/holidays`);
      if (response.data.success) {
        setHolidays(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  // Mark Individual Attendance
  const markIndividualAttendance = async (role, userId, status, additionalData = {}) => {
    try {
      setLoading(true);
      const endpoint = `/${schoolId}/${role}/${userId}/${status}`;
      const payload = {
        date: selectedDate,
        ...additionalData
      };

      await attendanceApi.post(endpoint, payload);
      showMessage(`${status.charAt(0).toUpperCase() + status.slice(1)} marked successfully`);

      // Refresh data
      if (role === 'student') {
        if (selectedClass) {
          fetchStudentsByClass(selectedClass);
        } else {
          fetchAllStudentsAttendance();
        }
      } else {
        fetchEmployeeAttendance();
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      showMessage(`Error marking ${status}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Mark Attendance
  const bulkMarkAttendance = async () => {
    if (activeTab.includes('student') && selectedStudents.length === 0) {
      showMessage('Please select at least one student', 'error');
      return;
    }
    if (activeTab.includes('employee') && selectedEmployees.length === 0) {
      showMessage('Please select at least one employee', 'error');
      return;
    }

    try {
      setLoading(true);
      const role = activeTab.includes('student') ? 'student' : 'employee';
      const userIds = activeTab.includes('student') ? selectedStudents : selectedEmployees;

      const promises = userIds.map(userId => {
        const endpoint = `/${schoolId}/${role}/${userId}/${bulkAction}`;
        const payload = {
          date: selectedDate,
          ...(bulkAction === 'absent' && reason && { reason })
        };
        return attendanceApi.post(endpoint, payload);
      });

      await Promise.all(promises);
      showMessage(`Bulk ${bulkAction} marked successfully for ${userIds.length} users`);

      setSelectedStudents([]);
      setSelectedEmployees([]);
      setReason('');

      // Refresh data
      if (role === 'student') {
        if (selectedClass) {
          fetchStudentsByClass(selectedClass);
        } else {
          fetchAllStudentsAttendance();
        }
      } else {
        fetchEmployeeAttendance();
      }
    } catch (error) {
      console.error('Error bulk marking attendance:', error);
      showMessage('Error marking bulk attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mark Holiday
  const markHoliday = async () => {
    const description = prompt('Enter holiday description:');
    if (!description) return;

    try {
      setLoading(true);
      await attendanceApi.post(`/${schoolId}/holidays/${selectedDate}`, {
        description,
        createdBy: 'Admin'
      });
      showMessage('Holiday marked successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error marking holiday:', error);
      showMessage('Error marking holiday', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete Holiday
  const deleteHoliday = async (date) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      setLoading(true);
      await attendanceApi.delete(`/${schoolId}/holidays/${date}`);
      showMessage('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      showMessage('Error deleting holiday', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Student Selection
  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Handle Employee Selection
  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Select All Students
  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.studentId));
    }
  };

  // Select All Employees
  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.employeeId));
    }
  };

  // Initialize data
  useEffect(() => {
    fetchClasses();
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (activeTab === 'student-mark' && selectedClass) {
      fetchStudentsByClass(selectedClass);
    } else if (activeTab === 'student-view') {
      fetchAllStudentsAttendance();
    } else if (activeTab.includes('employee')) {
      fetchEmployeeAttendance();
    }
  }, [activeTab, selectedClass, selectedDate]);

  return (
    <div className="attendance-manager">
      <style jsx>{`
        .attendance-manager {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          font-family: 'Arial', sans-serif;
          padding: 20px;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          color: white;
          padding: 20px 0;
          margin-bottom: 30px;
        }

        .school-name {
          font-size: 42px;
          font-weight: bold;
          margin-bottom: 10px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 15px 15px 0 0;
          overflow: hidden;
          box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .tab {
          flex: 1;
          padding: 18px 25px;
          text-align: center;
          cursor: pointer;
          border-bottom: 4px solid transparent;
          transition: all 0.3s ease;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.9);
        }

        .tab:hover {
          background: rgba(102, 126, 234, 0.1);
        }

        .tab.active {
          border-bottom-color: #667eea;
          background: white;
        }

        .content {
          background: white;
          border-radius: 0 0 15px 15px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .controls-section {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .control-group label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .form-control {
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.3s ease;
          min-width: 150px;
        }

        .form-control:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .btn-success {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
        }

        .btn-danger {
          background: linear-gradient(135deg, #f44336, #d32f2f);
          color: white;
        }

        .btn-warning {
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .table-container {
          overflow-x: auto;
          margin-top: 20px;
        }

        .attendance-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .attendance-table thead {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .attendance-table th,
        .attendance-table td {
          padding: 15px 20px;
          text-align: left;
          border-bottom: 1px solid #f0f0f0;
        }

        .attendance-table th {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 13px;
        }

        .attendance-table tbody tr {
          transition: all 0.3s ease;
        }

        .attendance-table tbody tr:hover {
          background: rgba(102, 126, 234, 0.05);
          transform: scale(1.01);
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          display: inline-block;
        }

        .status-present {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-absent {
          background: #ffebee;
          color: #c62828;
        }

        .status-holiday {
          background: #fff3e0;
          color: #e65100;
        }

        .checkbox-input {
          width: 20px;
          height: 20px;
          cursor: pointer;
          transform: scale(1.2);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .alert {
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: linear-gradient(135deg, #f8f9ff, #e8f0ff);
          border-radius: 15px;
          padding: 25px;
          text-align: center;
          transition: all 0.3s ease;
          border: 1px solid rgba(102, 126, 234, 0.1);
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
        }

        .stat-value {
          font-size: 36px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }

        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .bulk-actions {
          background: rgba(248, 249, 255, 0.6);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 2px dashed rgba(102, 126, 234, 0.3);
        }

        .bulk-actions h4 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
        }

        .bulk-controls {
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }

        .holidays-list {
          display: grid;
          gap: 15px;
        }

        .holiday-item {
          background: rgba(255, 255, 255, 0.9);
          padding: 20px;
          border-radius: 12px;
          border-left: 4px solid #ff9800;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }

        .holiday-item:hover {
          transform: translateX(5px);
          box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .holiday-info {
          flex: 1;
        }

        .holiday-date {
          font-weight: 600;
          color: #333;
          font-size: 16px;
          margin-bottom: 5px;
        }

        .holiday-description {
          color: #666;
          font-size: 14px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .tabs {
            flex-direction: column;
          }

          .controls-section {
            flex-direction: column;
            align-items: stretch;
          }

          .control-group {
            flex-direction: column;
            align-items: stretch;
          }

          .form-control {
            width: 100%;
          }

          .stat-value {
            font-size: 28px;
          }
        }
      `}</style>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="container">
        <div className="header">
          <h1 className="school-name">📊 {getSchoolName()} Attendance</h1>
          <p style={{ fontSize: '18px', opacity: 0.9 }}>Complete Attendance Management System</p>
        </div>

        {/* Messages */}
        {success && <div className="alert alert-success">✅ {success}</div>}
        {error && <div className="alert alert-error">❌ {error}</div>}

        {/* Tabs */}
        <div className="tabs">
          <div
            className={`tab ${activeTab === 'student-mark' ? 'active' : ''}`}
            onClick={() => setActiveTab('student-mark')}
          >
            👨‍🎓 Mark Student Attendance
          </div>
          <div
            className={`tab ${activeTab === 'student-view' ? 'active' : ''}`}
            onClick={() => setActiveTab('student-view')}
          >
            📋 View Student Attendance
          </div>
          <div
            className={`tab ${activeTab === 'employee-mark' ? 'active' : ''}`}
            onClick={() => setActiveTab('employee-mark')}
          >
            👩‍🏫 Mark Employee Attendance
          </div>
          <div
            className={`tab ${activeTab === 'employee-view' ? 'active' : ''}`}
            onClick={() => setActiveTab('employee-view')}
          >
            📊 View Employee Attendance
          </div>
          <div
            className={`tab ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => setActiveTab('holidays')}
          >
            🏖️ Holidays
          </div>
        </div>

        <div className="content">
          {/* Controls Section */}
          <div className="controls-section">
            <div className="control-group">
              <label>📅 Date:</label>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {activeTab.includes('student') && (
              <div className="control-group">
                <label>🎓 Class:</label>
                <select
                  className="form-control"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>
                      {cls.replace('class-', 'Class ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button className="btn btn-primary" onClick={() => {
              if (activeTab === 'student-mark' && selectedClass) {
                fetchStudentsByClass(selectedClass);
              } else if (activeTab === 'student-view') {
                fetchAllStudentsAttendance();
              } else if (activeTab.includes('employee')) {
                fetchEmployeeAttendance();
              }
            }}>
              🔄 Refresh Data
            </button>

            <button className="btn btn-warning" onClick={markHoliday}>
              🏖️ Mark Holiday
            </button>
          </div>

          {/* Student Mark Attendance Tab */}
          {activeTab === 'student-mark' && (
            <>
              {selectedClass && students.length > 0 && (
                <>
                  {/* Bulk Actions */}
                  <div className="bulk-actions">
                    <h4>⚡ Bulk Actions ({selectedStudents.length} selected)</h4>
                    <div className="bulk-controls">
                      <button className="btn btn-primary" onClick={selectAllStudents}>
                        {selectedStudents.length === students.length ? '✓ Deselect All' : '☐ Select All'}
                      </button>

                      <select
                        className="form-control"
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="holiday">Holiday</option>
                      </select>

                      {bulkAction === 'absent' && (
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Reason for absence"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      )}

                      <button
                        className="btn btn-success"
                        onClick={bulkMarkAttendance}
                        disabled={selectedStudents.length === 0}
                      >
                        ✓ Mark {bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)}
                      </button>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="table-container">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              className="checkbox-input"
                              checked={selectedStudents.length === students.length}
                              onChange={selectAllStudents}
                            />
                          </th>
                          <th>Roll No</th>
                          <th>Student Name</th>
                          <th>Class</th>
                          <th>Section</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.studentId}>
                            <td>
                              <input
                                type="checkbox"
                                className="checkbox-input"
                                checked={selectedStudents.includes(student.studentId)}
                                onChange={() => handleStudentSelection(student.studentId)}
                              />
                            </td>
                            <td>{student.rollNumber || 'N/A'}</td>
                            <td>{student.name}</td>
                            <td>{student.class}</td>
                            <td>{student.section}</td>
                            <td>
                              <span className={`status-badge status-${student.attendance.status}`}>
                                {student.attendance.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn btn-success"
                                  onClick={() => markIndividualAttendance('student', student.studentId, 'present')}
                                  style={{ padding: '8px 16px', fontSize: '12px' }}
                                >
                                  ✓ Present
                                </button>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => {
                                    const reason = prompt('Reason for absence:');
                                    if (reason) {
                                      markIndividualAttendance('student', student.studentId, 'absent', { reason });
                                    }
                                  }}
                                  style={{ padding: '8px 16px', fontSize: '12px' }}
                                >
                                  ✗ Absent
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!selectedClass && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Please select a class to mark attendance
                </div>
              )}
            </>
          )}

          {/* Student View Attendance Tab */}
          {activeTab === 'student-view' && attendanceData && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{attendanceData.summary.total}</div>
                  <div className="stat-label">Total Students</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#4CAF50' }}>{attendanceData.summary.present}</div>
                  <div className="stat-label">Present</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#f44336' }}>{attendanceData.summary.absent}</div>
                  <div className="stat-label">Absent</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#ff9800' }}>{attendanceData.summary.holiday}</div>
                  <div className="stat-label">Holiday</div>
                </div>
              </div>

              {Object.keys(attendanceData.groupedByClass || {}).map(className => (
                <div key={className} style={{ marginBottom: '30px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#333' }}>
                    {className.replace('class-', 'Class ').toUpperCase()}
                  </h3>
                  <div className="table-container">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Student Name</th>
                          <th>Section</th>
                          <th>Status</th>
                          <th>In Time</th>
                          <th>Out Time</th>
                          <th>Total Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.groupedByClass[className].map((student) => (
                          <tr key={student.studentId}>
                            <td>{student.rollNumber || 'N/A'}</td>
                            <td>{student.name}</td>
                            <td>{student.section}</td>
                            <td>
                              <span className={`status-badge status-${student.attendance.status}`}>
                                {student.attendance.status}
                              </span>
                            </td>
                            <td>{student.attendance.inTime ? new Date(student.attendance.inTime.toDate()).toLocaleTimeString() : '-'}</td>
                            <td>{student.attendance.outTime ? new Date(student.attendance.outTime.toDate()).toLocaleTimeString() : '-'}</td>
                            <td>{student.attendance.totalTime || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Employee Mark Attendance Tab */}
          {activeTab === 'employee-mark' && employees.length > 0 && (
            <>
              {/* Bulk Actions */}
              <div className="bulk-actions">
                <h4>⚡ Bulk Actions ({selectedEmployees.length} selected)</h4>
                <div className="bulk-controls">
                  <button className="btn btn-primary" onClick={selectAllEmployees}>
                    {selectedEmployees.length === employees.length ? '✓ Deselect All' : '☐ Select All'}
                  </button>

                  <select
                    className="form-control"
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="holiday">Holiday</option>
                  </select>

                  {bulkAction === 'absent' && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Reason for absence"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  )}

                  <button
                    className="btn btn-success"
                    onClick={bulkMarkAttendance}
                    disabled={selectedEmployees.length === 0}
                  >
                    ✓ Mark {bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)}
                  </button>
                </div>
              </div>

              {/* Employees Table */}
              <div className="table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={selectedEmployees.length === employees.length}
                          onChange={selectAllEmployees}
                        />
                      </th>
                      <th>Employee Code</th>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.employeeId}>
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox-input"
                            checked={selectedEmployees.includes(employee.employeeId)}
                            onChange={() => handleEmployeeSelection(employee.employeeId)}
                          />
                        </td>
                        <td>{employee.employeeCode || 'N/A'}</td>
                        <td>{employee.name}</td>
                        <td>{employee.designation}</td>
                        <td>{employee.department}</td>
                        <td>
                          <span className={`status-badge status-${employee.attendance.status}`}>
                            {employee.attendance.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-success"
                              onClick={() => markIndividualAttendance('employee', employee.employeeId, 'present')}
                              style={{ padding: '8px 16px', fontSize: '12px' }}
                            >
                              ✓ Present
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => {
                                const reason = prompt('Reason for absence:');
                                if (reason) {
                                  markIndividualAttendance('employee', employee.employeeId, 'absent', { reason });
                                }
                              }}
                              style={{ padding: '8px 16px', fontSize: '12px' }}
                            >
                              ✗ Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Employee View Attendance Tab */}
          {activeTab === 'employee-view' && employeeAttendanceData && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{employeeAttendanceData.summary.total}</div>
                  <div className="stat-label">Total Employees</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#4CAF50' }}>{employeeAttendanceData.summary.present}</div>
                  <div className="stat-label">Present</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#f44336' }}>{employeeAttendanceData.summary.absent}</div>
                  <div className="stat-label">Absent</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{employeeAttendanceData.summary.presentPercentage}%</div>
                  <div className="stat-label">Present Rate</div>
                </div>
              </div>

              <div className="table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Employee Code</th>
                      <th>Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>In Time</th>
                      <th>Out Time</th>
                      <th>Total Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeAttendanceData.employees.map((employee) => (
                      <tr key={employee.employeeId}>
                        <td>{employee.employeeCode || 'N/A'}</td>
                        <td>{employee.name}</td>
                        <td>{employee.designation}</td>
                        <td>{employee.department}</td>
                        <td>
                          <span className={`status-badge status-${employee.attendance.status}`}>
                            {employee.attendance.status}
                          </span>
                        </td>
                        <td>{employee.attendance.inTime ? new Date(employee.attendance.inTime.toDate()).toLocaleTimeString() : '-'}</td>
                        <td>{employee.attendance.outTime ? new Date(employee.attendance.outTime.toDate()).toLocaleTimeString() : '-'}</td>
                        <td>{employee.attendance.totalTime || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Holidays Tab */}
          {activeTab === 'holidays' && (
            <div className="holidays-list">
              <h3 style={{ marginBottom: '20px', color: '#333' }}>🏖️ School Holidays</h3>
              {holidays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No holidays marked yet
                </div>
              ) : (
                holidays.map((holiday) => (
                  <div key={holiday.id} className="holiday-item">
                    <div className="holiday-info">
                      <div className="holiday-date">{holiday.date}</div>
                      <div className="holiday-description">{holiday.description}</div>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteHoliday(holiday.date)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;