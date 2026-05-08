import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Users, CheckCircle, XCircle, Download, 
  Loader, AlertTriangle, Filter, Search, Activity,
  Database, GraduationCap, ClipboardList, RefreshCw,
  Plus, Trash2, ChevronLeft, ChevronRight, Shield,
  BarChart3, Clock, User, Building, Hash
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { getSchoolIdFromStorage } from '../../../utils/api';

import StandardButton from '../../../components/ui/StandardButton';
import DropdownWidget from '../../../components/ui/DropdownWidget';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import FormWidget from '../../../components/ui/FormWidget';
import DataGrid from '../../../components/ui/DataGrid';

import {
  useGetClassesQuery,
  useGetStudentsByClassQuery,
  useBulkMarkAttendanceMutation,
  useGetClassAttendanceQuery,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useGetAdvancedAttendanceQuery,
} from '../api/academicApi';
import { useGetSpacesQuery } from '../../infrastructure/infrastructureApi';

const getSchoolId = () => getSchoolIdFromStorage() || "";
const today = new Date().toISOString().split('T')[0];

const STATUS_CONFIG = {
  present: { color: 'success', icon: CheckCircle, label: 'Present' },
  absent: { color: 'danger', icon: XCircle, label: 'Absent' },
  holiday: { color: 'warning', icon: Calendar, label: 'Holiday' },
  leave: { color: 'primary', icon: AlertTriangle, label: 'Leave' }
};

export default function AttendancePage() {
  const schoolId = getSchoolId();
  
  // Core state
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  
  // Analytics filters (used by DataGrid's filterDefinitions)
  const [filters, setFilters] = useState({
    date: today,
    period: 'day',
    incoming_after: '',
    outgoing_before: '',
    user_type: '',
    class_name: '',
    space_name: '',
    user_ids: '',
    fields: ''
  });

  const { control, handleSubmit, reset } = useForm();

  // API Hooks
  const { data: classes = [], isLoading: classesLoading } = useGetClassesQuery(schoolId, { skip: !schoolId });
  const { data: holidays = [], isLoading: isHolidaysLoading } = useGetHolidaysQuery(schoolId, { skip: !schoolId });
  const { data: spacesData = [] } = useGetSpacesQuery(schoolId, { skip: !schoolId });
  const { data: studentsData = [], isLoading: studentsLoading } = useGetStudentsByClassQuery(
    { schoolId, className: selectedClass }, 
    { skip: !schoolId || !selectedClass }
  );
  const { data: existingAttendance = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useGetClassAttendanceQuery(
    { schoolId, className: selectedClass, date: selectedDate }, 
    { skip: !schoolId || !selectedClass || !selectedDate }
  );

  // Advanced attendance analytics - always fetched with current filters
  const { data: advancedAttendance, isLoading: advancedLoading, refetch: refetchAdvanced } = useGetAdvancedAttendanceQuery(
    { school_id: schoolId, ...filters },
    { skip: !schoolId }
  );

  const [bulkMarkAttendance] = useBulkMarkAttendanceMutation();
  const [createHoliday] = useCreateHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  // Initialize attendance data from students + existing records
  useEffect(() => {
    if (studentsData.length > 0) {
      const students = Array.isArray(studentsData) ? studentsData : (studentsData.data || []);
      const existingMap = {};
      
      const existing = Array.isArray(existingAttendance) ? existingAttendance : (existingAttendance.data || []);
      existing.forEach(item => {
        if (item.user_id) existingMap[item.user_id] = item.status || 'absent';
      });
      
      const newAttendanceData = students.map(student => {
        const userId = student.studentId || student.id || student.user_id;
        return {
          id: userId,
          name: student.name || student.studentName || `Student ${userId}`,
          rollNumber: student.rollNumber || student.roll_number || '',
          status: existingMap[userId] || 'absent',
          inTime: '',
          outTime: ''
        };
      });
      setAttendanceData(newAttendanceData);
    }
  }, [studentsData, existingAttendance, selectedClass]);

  // Handlers
  const handleStatusChange = async (id, status) => {
    try {
      await bulkMarkAttendance({ 
        schoolId, 
        body: { 
          class_name: selectedClass, 
          date: selectedDate, 
          attendance: [{ user_id: id, role: 'student', status }] 
        } 
      }).unwrap();
      refetchAttendance();
    } catch (e) {
      toast.error('Sync Failure: Protocol rejected');
    }
  };

  const handleBulkStatusChange = async (status) => {
    try {
      const payload = {
        class_name: selectedClass,
        date: selectedDate,
        attendance: attendanceData.map(item => ({
          user_id: item.id,
          role: 'student',
          status
        }))
      };
      await bulkMarkAttendance({ schoolId, body: payload }).unwrap();
      toast.info(`Protocol: All nodes synced as ${status.toUpperCase()}`);
      refetchAttendance();
    } catch (e) {
      toast.error('Bulk Sync Failure');
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await deleteHoliday({ schoolId, holidayId: id }).unwrap();
      toast.success('Holiday protocol terminated');
    } catch(e) { toast.error('De-registration failure'); }
  };

  // Filter change helper
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all analytics filters
  const handleClearFilters = () => {
    setFilters({
      date: today,
      period: 'day',
      incoming_after: '',
      outgoing_before: '',
      user_type: '',
      class_name: '',
      space_name: '',
      user_ids: '',
      fields: ''
    });
  };

  // Filtered attendance for mark mode
  const filteredAttendance = attendanceData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats for mark mode
  const stats = useMemo(() => ({
    total: attendanceData.length,
    present: attendanceData.filter(item => item.status === 'present').length,
    absent: attendanceData.filter(item => item.status === 'absent').length
  }), [attendanceData]);

  // Advanced attendance stats & records
  const advancedStats = useMemo(() => advancedAttendance?.summary || null, [advancedAttendance]);
  const advancedRecords = useMemo(() => advancedAttendance?.records || [], [advancedAttendance]);

  // Combined KPI stats (uses advanced stats when filters are active, otherwise mark stats)
  const hasActiveFilters = Object.values(filters).some(v => v && v !== 'day' && v !== today);
  const kpiStats = hasActiveFilters && advancedStats ? {
    total: advancedStats.total_users || 0,
    present: advancedStats.total_present || 0,
    absent: advancedStats.total_absent || 0,
    percentage: advancedStats.attendance_percentage?.toFixed(1) || 0
  } : {
    total: stats.total,
    present: stats.present,
    absent: stats.absent,
    percentage: stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0
  };

  // Columns for mark attendance mode
  const markColumns = [
    {
      header: 'Identity',
      key: 'name',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white group-hover:text-primary transition-colors italic uppercase tracking-tighter">{val}</span>
          <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-0.5">NODE_{row.rollNumber || row.id}</span>
        </div>
      )
    },
    {
      header: 'Status Protocol',
      key: 'status',
      render: (val, row) => (
        <div className="flex gap-1">
          {['present', 'absent'].map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(row.id, s)}
              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${val === s ? `bg-${STATUS_CONFIG[s].color}-500/20 text-${STATUS_CONFIG[s].color}-400 border-${STATUS_CONFIG[s].color}-500/40 shadow-lg shadow-${STATUS_CONFIG[s].color}-500/10` : 'bg-white/5 border-white/5 text-slate-700 hover:text-slate-500'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )
    },
    {
      header: 'Scan Window',
      key: 'inTime',
      render: (_, row) => (
        <div className="flex gap-1">
           <input type="time" value={row.inTime} className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-primary focus:outline-none focus:border-primary/50" />
           <input type="time" value={row.outTime} className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-accent focus:outline-none focus:border-accent/50" />
        </div>
      )
    }
  ];

  // Columns for analytics records
  const analyticsColumns = [
    { header: 'User ID', key: 'user_id', render: (v) => <span className="text-[10px] font-mono text-slate-400">{v}</span> },
    { header: 'Name', key: 'name', render: (v) => <span className="text-xs font-bold text-white uppercase">{v || '---'}</span> },
    { header: 'Date', key: 'date' },
    { 
      header: 'Status', 
      key: 'status',
      render: (v) => {
        const cfg = STATUS_CONFIG[v?.toLowerCase()];
        return cfg ? (
          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase bg-${cfg.color}-500/20 text-${cfg.color}-400 border border-${cfg.color}-500/30`}>{v}</span>
        ) : <span className="text-xs text-slate-500">{v}</span>;
      }
    },
    { header: 'Class', key: 'class_name' },
    { header: 'In', key: 'in_time', render: (v) => <span className="text-[10px] font-mono text-primary">{v || '---'}</span> },
    { header: 'Out', key: 'out_time', render: (v) => <span className="text-[10px] font-mono text-accent">{v || '---'}</span> },
  ];

  // Determine which data to show in the grid
  // When a class is selected for marking, show mark view; otherwise show analytics
  const showMarkView = selectedClass && !hasActiveFilters;
  const gridColumns = showMarkView ? markColumns : analyticsColumns;
  const gridRows = showMarkView ? filteredAttendance : advancedRecords;
  const gridLoading = showMarkView ? (studentsLoading || attendanceLoading) : advancedLoading;

  // Structured filter definitions for DataGrid
  const filterDefinitions = [
    {
      type: 'date',
      label: 'Date',
      value: filters.date,
      onChange: (v) => handleFilterChange('date', v),
    },
    {
      type: 'select',
      label: 'Period',
      value: filters.period,
      onChange: (v) => handleFilterChange('period', v),
      options: [
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Month', value: 'month' },
        { label: 'Year', value: 'year' },
      ]
    },
    {
      type: 'select',
      label: 'User Type',
      value: filters.user_type,
      onChange: (v) => handleFilterChange('user_type', v),
      options: [
        { label: 'All', value: '' },
        { label: 'Student', value: 'student' },
        { label: 'Employee', value: 'employee' },
      ]
    },
    {
      type: 'select',
      label: 'Class',
      value: filters.class_name,
      onChange: (v) => handleFilterChange('class_name', v),
      options: [
        { label: 'All', value: '' },
        ...classes.map(cls => ({ label: cls.name || cls.className, value: cls.name || cls.className }))
      ]
    },
    {
      type: 'time',
      label: 'In After',
      value: filters.incoming_after,
      onChange: (v) => handleFilterChange('incoming_after', v),
    },
    {
      type: 'time',
      label: 'Out Before',
      value: filters.outgoing_before,
      onChange: (v) => handleFilterChange('outgoing_before', v),
    },
    {
      type: 'text',
      label: 'User IDs',
      value: filters.user_ids,
      onChange: (v) => handleFilterChange('user_ids', v),
      placeholder: 'id1,id2,...',
      className: 'col-span-2'
    },
  ];

  return (
    <div className="max-w-full p-2 space-y-4 pb-20">
      <PageHeader
        title="ATTENDANCE"
        accentTitle="MANAGEMENT"
        subtitle="Verification, Analytics & Exceptions"
        icon={Users}
        actions={[
          { label: "DECLARE HOLIDAY", onClick: () => setShowHolidayForm(true), variant: "ghost", size: "sm", icon: Plus, className: "text-rose-400" }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-4">
        {/* Left: Exceptions & KPIs */}
        <div className="space-y-4">
          <GlassCard className="p-4 border-primary/20 bg-primary/5">
             <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-primary" />
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Active Exceptions</h4>
             </div>
             {isHolidaysLoading ? <Loader className="animate-spin mx-auto" /> : (
               <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {holidays.map(h => (
                    <div key={h.id} className="p-2 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center group">
                      <div>
                        <p className="text-[10px] font-black text-white uppercase">{h.title}</p>
                        <p className="text-[8px] text-slate-500 font-bold">{h.fromDate} → {h.toDate || h.fromDate}</p>
                      </div>
                      <StandardButton variant="ghost" size="xs" onClick={() => handleDeleteHoliday(h.id)} icon={Trash2} className="text-rose-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
               </div>
             )}
          </GlassCard>

          <KPIWidget columns={1}>
            <KPITile label="Total Nodes" value={kpiStats.total} icon={Users} color="primary" />
            <KPITile label="Verified" value={kpiStats.present} icon={CheckCircle} color="success" />
            <KPITile label="Missing" value={kpiStats.absent} icon={XCircle} color="danger" />
            <KPITile label="Attendance %" value={`${kpiStats.percentage}%`} icon={Activity} color="warning" />
          </KPIWidget>
        </div>

        {/* Right: Unified DataGrid with integrated filters */}
        <div className="space-y-4">
          <input id="scan-date" type="date" className="sr-only" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <DataGrid 
            columns={gridColumns}
            rows={gridRows}
            isLoading={gridLoading}
            emptyMessage={showMarkView ? "NO_NODES_IN_CLUSTER" : "NO_ATTENDANCE_RECORDS"}
            showSearch={true}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={showMarkView ? "Scan student nodes..." : "Search records..."}
            onRefresh={showMarkView ? () => { if (selectedClass) refetchAttendance(); } : refetchAdvanced}
            // Mark mode: class & date filters as legacy JSX
            filters={showMarkView ? [
              <DropdownWidget
                key="class-select"
                dense
                options={[{ label: 'SELECT CLASS', value: '' }, ...classes.map(cls => ({ label: `CLASS ${cls.name || cls.className}`, value: cls.name || cls.className }))]}
                value={selectedClass}
                onChange={setSelectedClass}
              />,
              <StandardButton 
                key="date-picker"
                variant="ghost" 
                size="sm" 
                icon={Calendar} 
                onClick={() => document.getElementById('scan-date').showPicker?.()}
                className="text-primary bg-primary/10 hover:bg-primary/20"
              >
                {selectedDate}
              </StandardButton>
            ] : []}
            // Analytics mode: structured filter definitions
            filterDefinitions={showMarkView ? [] : filterDefinitions}
            onApplyFilters={refetchAdvanced}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>

      <AnimatePresence>
        {showHolidayForm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHolidayForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md">
                <FormWidget
                  title="LOG_EXCEPTION"
                  description="Register custom holiday protocols"
                  sections={[{ fields: [
                    { name: 'title', label: 'Reference ID', type: 'text', required: true },
                    { name: 'fromDate', label: 'Node Start', type: 'date', required: true },
                    { name: 'toDate', label: 'Node End', type: 'date' },
                    { name: 'allClasses', label: 'Global Application', type: 'checkbox' }
                  ]}]}
                  control={control}
                  onSubmit={handleSubmit((v) => { createHoliday({ schoolId, body: { ...v, classes: v.allClasses ? ['All'] : [] } }).unwrap().then(() => { setShowHolidayForm(false); reset(); toast.success('Exception registered'); }); })}
                  onCancel={() => { setShowHolidayForm(false); reset(); }}
                  submitLabel="COMMIT_EXCEPTION"
                />
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
