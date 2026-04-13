import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion } from 'framer-motion';
import {
  Users, Calendar, CheckCircle, XCircle, Download, Upload,
  Loader, AlertTriangle, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import {
  useGetClassesQuery,
  useGetStudentsByClassQuery,
  useBulkMarkAttendanceMutation,
  useGetClassAttendanceQuery
} from '../api/academicApi';

const getSchoolId = () => getSchoolIdFromStorage() || "";

const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HOLIDAY: 'holiday',
  LEAVE: 'leave'
};

const STATUS_COLORS = {
  present: 'bg-green-500/20 text-green-300 border-green-500/30',
  absent: 'bg-red-500/20 text-red-300 border-red-500/30',
  holiday: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  leave: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
};

const STATUS_ICONS = {
  present: CheckCircle,
  absent: XCircle,
  holiday: Calendar,
  leave: AlertTriangle
};

export default function BulkAttendance() {
  const schoolId = getSchoolId();
  const pollingInterval = useSelector(state => state.settings?.pollingInterval || 30000);
  
  // API hooks
  const { data: classes = [], isLoading: classesLoading } = useGetClassesQuery(schoolId, {
    skip: !schoolId
  });
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get students for selected class
  const { data: studentsData = [], isLoading: studentsLoading, refetch: refetchStudents } = 
    useGetStudentsByClassQuery({ schoolId, className: selectedClass }, {
      skip: !schoolId || !selectedClass
    });
  
  // Get existing attendance for selected class and date
  const { data: existingAttendance = [], isLoading: attendanceLoading, refetch: refetchAttendance } = 
    useGetClassAttendanceQuery({ schoolId, className: selectedClass, date: selectedDate }, {
      skip: !schoolId || !selectedClass || !selectedDate
    });
  
  const [bulkMarkAttendance] = useBulkMarkAttendanceMutation();
  
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };
  
  // Initialize attendance data when students or existing attendance changes
  useEffect(() => {
    if (studentsData.length > 0) {
      const students = Array.isArray(studentsData) ? studentsData : (studentsData.data || []);
      const existingMap = {};
      
      // Create map of existing attendance
      if (existingAttendance.length > 0) {
        const existing = Array.isArray(existingAttendance) ? existingAttendance : (existingAttendance.data || []);
        existing.forEach(item => {
          if (item.user_id) {
            existingMap[item.user_id] = item.status || ATTENDANCE_STATUS.ABSENT;
          }
        });
      }
      
      const newAttendanceData = students.map(student => {
        const userId = student.studentId || student.id || student.user_id;
        const existingStatus = existingMap[userId] || ATTENDANCE_STATUS.ABSENT;
        
        return {
          id: userId,
          name: student.name || student.studentName || `Student ${userId}`,
          rollNumber: student.rollNumber || student.roll_number || '',
          className: selectedClass,
          status: existingStatus,
          inTime: '',
          outTime: '',
          notes: ''
        };
      });
      
      setAttendanceData(newAttendanceData);
    }
  }, [studentsData, existingAttendance, selectedClass]);
  
  const handleStatusChange = (id, status) => {
    setAttendanceData(prev => prev.map(item => 
      item.id === id ? { ...item, status } : item
    ));
  };
  
  const handleBulkStatusChange = (status) => {
    setAttendanceData(prev => prev.map(item => ({
      ...item,
      status
    })));
    setBulkAction('');
  };
  
  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedDate) {
      showToast('error', 'Please select class and date');
      return;
    }
    
    if (attendanceData.length === 0) {
      showToast('error', 'No students to mark attendance for');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        class_name: selectedClass,
        date: selectedDate,
        attendance: attendanceData.map(item => ({
          user_id: item.id,
          role: 'student',
          status: item.status,
          in_time: item.inTime || null,
          out_time: item.outTime || null,
          notes: item.notes || ''
        }))
      };
      
      const result = await bulkMarkAttendance({ schoolId, body: payload }).unwrap();
      
      showToast('success', `Attendance marked for ${attendanceData.length} students`);
      refetchAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error);
      showToast('error', error.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };
  
  const handleExportCSV = () => {
    if (attendanceData.length === 0) return;
    
    const headers = ['ID', 'Name', 'Roll Number', 'Class', 'Status', 'In Time', 'Out Time', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...attendanceData.map(item => [
        item.id,
        `"${item.name}"`,
        item.rollNumber,
        item.className,
        item.status,
        item.inTime,
        item.outTime,
        `"${item.notes}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedClass}_${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('success', 'CSV exported successfully');
  };
  
  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Simple CSV parsing - in a real app you'd use a proper CSV parser
        const importedData = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const item = {};
          headers.forEach((header, index) => {
            item[header.toLowerCase()] = values[index] || '';
          });
          return item;
        });
        
        // Update attendance data with imported values
        setAttendanceData(prev => prev.map(item => {
          const importedItem = importedData.find(imp => imp.id === item.id);
          if (importedItem) {
            return {
              ...item,
              status: importedItem.status || item.status,
              inTime: importedItem.in_time || importedItem.intime || item.inTime,
              outTime: importedItem.out_time || importedItem.outtime || item.outTime,
              notes: importedItem.notes || item.notes
            };
          }
          return item;
        }));
        
        showToast('success', `Imported ${importedData.length} records from CSV`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        showToast('error', 'Failed to parse CSV file');
      }
    };
    
    reader.readAsText(file);
  };
  
  const filteredAttendance = attendanceData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const stats = {
    total: attendanceData.length,
    present: attendanceData.filter(item => item.status === ATTENDANCE_STATUS.PRESENT).length,
    absent: attendanceData.filter(item => item.status === ATTENDANCE_STATUS.ABSENT).length,
    holiday: attendanceData.filter(item => item.status === ATTENDANCE_STATUS.HOLIDAY).length,
    leave: attendanceData.filter(item => item.status === ATTENDANCE_STATUS.LEAVE).length
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Bulk Attendance</h2>
            <p className="text-sm text-slate-500">Mark attendance for entire classes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
          >
            <Filter size={14} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Select Class</label>
              <select
                className="input-dark w-full"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={classesLoading}
              >
                <option value="">-- Select Class --</option>
                {classes.map(cls => (
                  <option key={cls.id || cls.name} value={cls.name || cls.className}>
                    {cls.name || cls.className}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Date</label>
              <input
                type="date"
                className="input-dark w-full"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Search Students</label>
              <input
                type="text"
                className="input-dark w-full"
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center">Bulk Actions:</span>
            <button
              onClick={() => handleBulkStatusChange(ATTENDANCE_STATUS.PRESENT)}
              className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/20 transition-colors"
            >
              Mark All Present
            </button>
            <button
              onClick={() => handleBulkStatusChange(ATTENDANCE_STATUS.ABSENT)}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/20 transition-colors"
            >
              Mark All Absent
            </button>
            <button
              onClick={() => handleBulkStatusChange(ATTENDANCE_STATUS.LEAVE)}
              className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors"
            >
              Mark All Leave
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className="glass-card p-3 text-center border-l-2 border-green-500/30">
          <div className="text-2xl font-bold text-green-300">{stats.present}</div>
          <div className="text-xs text-slate-500">Present</div>
        </div>
        <div className="glass-card p-3 text-center border-l-2 border-red-500/30">
          <div className="text-2xl font-bold text-red-300">{stats.absent}</div>
          <div className="text-xs text-slate-500">Absent</div>
        </div>
        <div className="glass-card p-3 text-center border-l-2 border-amber-500/30">
          <div className="text-2xl font-bold text-amber-300">{stats.holiday}</div>
          <div className="text-xs text-slate-500">Holiday</div>
        </div>
        <div className="glass-card p-3 text-center border-l-2 border-blue-500/30">
          <div className="text-2xl font-bold text-blue-300">{stats.leave}</div>
          <div className="text-xs text-slate-500">Leave</div>
        </div>
      </div>
      
      {/* Attendance Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">
              {selectedClass || 'Select a class'} - {selectedDate}
            </h3>
            <p className="text-xs text-slate-500">
              {filteredAttendance.length} students • Click status to toggle
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors">
                <Upload size={12} />
                Import CSV
              </div>
            </label>
            
            <button
              onClick={handleExportCSV}
              disabled={attendanceData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>
        
        {studentsLoading || attendanceLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={24} className="animate-spin text-primary" />
            <span className="ml-2 text-slate-400">Loading students...</span>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">
              {selectedClass ? 'No students found in this class' : 'Select a class to view students'}
            </p>
            {selectedClass && (
              <button
                onClick={() => refetchStudents()}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Refresh students
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-3 text-xs text-slate-500 font-medium">Roll No</th>
                  <th className="text-left p-3 text-xs text-slate-500 font-medium">Name</th>
                  <th className="text-left p-3 text-xs text-slate-500 font-medium">Status</th>
                  <th className="text-left p-3 text-xs text-slate-500 font-medium">In Time</th>
                  <th className="text-left p-3 text-xs text-slate-500 font-medium">Out Time</th>
                  <th className="text-left p-3 text-xs text-slate-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((item) => {
                  const StatusIcon = STATUS_ICONS[item.status] || CheckCircle;
                  return (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="p-3 text-sm text-slate-400">{item.rollNumber || '-'}</td>
                      <td className="p-3 text-sm font-medium text-white">{item.name}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.values(ATTENDANCE_STATUS).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(item.id, status)}
                              className={`px-2 py-1 rounded-md text-xs font-medium border capitalize transition-all ${
                                item.status === status
                                  ? STATUS_COLORS[status]
                                  : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="time"
                          value={item.inTime}
                          onChange={(e) =>
                            setAttendanceData(prev =>
                              prev.map(a => a.id === item.id ? { ...a, inTime: e.target.value } : a)
                            )
                          }
                          className="input-dark text-xs py-1 px-2 w-24"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="time"
                          value={item.outTime}
                          onChange={(e) =>
                            setAttendanceData(prev =>
                              prev.map(a => a.id === item.id ? { ...a, outTime: e.target.value } : a)
                            )
                          }
                          className="input-dark text-xs py-1 px-2 w-24"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.notes}
                          placeholder="Add note..."
                          onChange={(e) =>
                            setAttendanceData(prev =>
                              prev.map(a => a.id === item.id ? { ...a, notes: e.target.value } : a)
                            )
                          }
                          className="input-dark text-xs py-1 px-2 w-32"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Save Button */}
        {filteredAttendance.length > 0 && (
          <div className="p-4 border-t border-white/5 flex justify-end">
            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-300'
            : 'bg-red-500/20 border border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}