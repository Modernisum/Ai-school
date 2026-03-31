import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CalendarDays, Plus, Trash2, CheckCircle, AlertTriangle, 
  ChevronLeft, ChevronRight, Users, GraduationCap, Shield, Info, 
  Search, Filter, UserCheck, XCircle, Loader2, Sparkles, Settings
} from 'lucide-react';
import { 
  useGetHolidaysQuery, 
  useCreateHolidayMutation, 
  useDeleteHolidayMutation,
  useGetClassesQuery,
  useGetAttendanceByDateQuery,
  useMarkPresentMutation,
  useMarkHolidayMutation,
  useUpdateAttendanceMutation,
  useDeleteAttendanceMutation,
  useGetStudentsByClassQuery,
} from '../../academics/api/academicApi';

const getSchoolId = () => getSchoolIdFromStorage() || "";
const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

export default function AnnouncementsPage() {
  const schoolId = getSchoolId();
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements', 'attendance'
  
  // Announcements State
  const [notices, setNotices] = useState([]);
  const [isNoticesLoading, setIsNoticesLoading] = useState(false);

  // Attendance & Holiday State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [calViewDate, setCalViewDate] = useState(new Date()); 
  
  const { data: attendanceData = [], isLoading: isAttendanceLoading, refetch: refetchAttendance } = useGetAttendanceByDateQuery({ schoolId, date: selectedDate }, { skip: !schoolId || !selectedDate });
  const { data: classes = [], isLoading: isClassesLoading } = useGetClassesQuery(schoolId, { skip: !schoolId });
  const { data: holidays = [], isLoading: isHolidaysLoading } = useGetHolidaysQuery(schoolId, { skip: !schoolId });
  
  const [markPresent] = useMarkPresentMutation();
  const [markHoliday] = useMarkHolidayMutation();
  const [updateAttendance] = useUpdateAttendanceMutation();
  const [deleteAttendance] = useDeleteAttendanceMutation();
  const [createHoliday] = useCreateHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  const {
    data: baseStudents = [],
    isLoading: isStudentsLoading,
    refetch: refetchStudents
  } = useGetStudentsByClassQuery(
    { schoolId, className: selectedClass, section: selectedSection },
    { skip: !selectedClass }
  );

  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ title: '', description: '', fromDate: selectedDate, toDate: selectedDate });

  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  // Fetch Notices
  const fetchNotices = useCallback(async () => {
    setIsNoticesLoading(true);
    try {
      const res = await fetch(`${API}/reminder/${schoolId}`);
      if (res.ok) {
        const d = await res.json();
        setNotices(d.data || []);
      }
    } catch (e) {
      console.error("Notice fetch error:", e);
    } finally {
      setIsNoticesLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (activeTab === 'announcements') fetchNotices();
  }, [activeTab, fetchNotices]);

  // Calendar Logic
  const calendarDays = useMemo(() => {
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSchoolHoliday = holidays.some(h => h.fromDate === dateStr || (h.toDate && dateStr >= h.fromDate && dateStr <= h.toDate));
      days.push({ day: d, dateStr, isSchoolHoliday });
    }
    return days;
  }, [calViewDate, holidays]);

  const changeMonth = (offset) => {
    setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + offset, 1));
  };

  const handleMarkPresent = async (studentId) => {
    try {
      await markPresent({ schoolId, role: 'student', userId: studentId, body: { date: selectedDate } }).unwrap();
      showToast('success', `Attendance marked present for ${studentId}`);
      refetchAttendance();
    } catch (e) {
      showToast('error', e.data?.message || 'Failed to mark present');
    }
  };

  const handleUpdateAttendance = async (studentId, status) => {
    try {
      if (status === 'holiday') {
        await markHoliday({ schoolId, role: 'student', userId: studentId, body: { date: selectedDate } }).unwrap();
      } else if (status === 'delete') {
        await deleteAttendance({ schoolId, role: 'student', userId: studentId, date: selectedDate }).unwrap();
      }
      showToast('success', `Attendance updated for ${studentId}`);
      refetchAttendance();
    } catch (e) {
      showToast('error', e.data?.message || 'Failed to update attendance');
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    try {
      await createHoliday({ schoolId, body: newHoliday }).unwrap();
      showToast('success', 'Holiday declared successfully');
      setShowHolidayForm(false);
      setNewHoliday({ title: '', description: '', fromDate: selectedDate, toDate: selectedDate });
    } catch (e) {
      showToast('error', e.data?.message || 'Failed to declare holiday');
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      await deleteHoliday({ schoolId, holidayId }).unwrap();
      showToast('success', 'Holiday deleted');
    } catch (e) {
      showToast('error', e.data?.message || 'Failed to delete holiday');
    }
  };

  const attendanceMap = useMemo(() => {
    const map = {};
    attendanceData.forEach(a => {
        map[a.user_id || a.userId] = a.status || 'present';
    });
    return map;
  }, [attendanceData]);

  const studentList = useMemo(() => {
    if (!selectedClass) return [];
    return baseStudents.map(s => ({
        ...s,
        id: s.studentId || s.id,
        isMarked: !!attendanceMap[s.studentId || s.id],
        currentStatus: attendanceMap[s.studentId || s.id] || 'pending'
    }));
  }, [baseStudents, selectedClass, attendanceMap]);

  return (
    <div className="min-h-screen page-bg p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
               <Bell size={16} className="text-white" />
             </div>
             School Operations
          </h1>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          {[
            { id: 'announcements', label: 'Notices', icon: Bell },
            { id: 'attendance', label: 'Attendance Hub', icon: UserCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'announcements' && (
          <motion.div key="ann" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isNoticesLoading ? (
               <div className="col-span-full h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>
            ) : notices.length === 0 ? (
               <div className="col-span-full h-64 glass-card flex flex-col items-center justify-center opacity-40">
                  <Bell size={48} className="mb-4" />
                  <p className="font-black uppercase tracking-widest text-sm">No notices recorded</p>
               </div>
            ) : notices.map((n, i) => (
              <motion.div key={i} whileHover={{ y: -5 }} className="glass-card p-6 border-white/5 hover:border-primary/30 group transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform"><Bell size={20} /></div>
                  <span className="text-[10px] font-black text-slate-500 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{n.date}</span>
                </div>
                <h3 className="text-lg font-black text-white mb-2 group-hover:text-primary transition-colors">{n.title}</h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">{n.content}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div key="att" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Section: Interactive Regional Calendar */}
            <div className="xl:col-span-4 space-y-6">
               <div className="glass-card p-6 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 group"><ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /></button>
                        <span className="text-[10px] font-black text-white min-w-[100px] text-center uppercase tracking-widest">{calViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 group"><ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></button>
                     </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 mb-4">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                      <div key={d} className="text-center text-[9px] font-black text-slate-600 pb-2">{d}</div>
                    ))}
                    {calendarDays.map((cell, idx) => {
                      if (!cell) return <div key={idx} className="h-9 w-full" />;
                      const isSelected = selectedDate === cell.dateStr;
                      const isToday = new Date().toISOString().split('T')[0] === cell.dateStr;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDate(cell.dateStr)}
                          className={`h-9 w-full flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all relative group
                            ${isSelected ? 'bg-primary text-white shadow-lg' : 
                              cell.isSchoolHoliday ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              'text-slate-400 hover:bg-white/5'
                            }
                            ${isToday && !isSelected ? 'border border-primary/50' : ''}
                          `}
                        >
                          <span className="text-[11px] font-bold">{cell.day}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Marked Holidays</p>
                        <span className="text-xs font-bold text-white">{holidays.length} Registered</span>
                     </div>
                     <button 
                       onClick={() => {
                         setNewHoliday(prev => ({ ...prev, fromDate: selectedDate, toDate: selectedDate }));
                         setShowHolidayForm(true);
                       }}
                       className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5 active:scale-95"
                     >
                        <Plus size={14} /> Declare New Holiday
                     </button>
                  </div>

                  {/* Holiday List Mini Section */}
                  {holidays.length > 0 && (
                    <div className="mt-6 space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {holidays.slice(0, 5).map((h, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{h.title}</p>
                            <p className="text-[9px] text-slate-500">{h.fromDate}</p>
                          </div>
                          <button onClick={() => handleDeleteHoliday(h.id)} className="p-1.5 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                             <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>

               {/* Quick Insights - Removed Content */}
            </div>

            {/* Right Section: Attendance Registry */}
            <div className="xl:col-span-8 space-y-6">
               <div className="glass-card p-6 min-h-[500px] flex flex-col">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-6">
                     <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Live Registry</p>
                        <h2 className="text-2xl font-black text-white">
                           Attendance: <span className="text-slate-500 font-medium">{new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </h2>
                     </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <select 
                          className="input-dark text-xs h-11 w-40 bg-white/5"
                          value={selectedClass} 
                          onChange={e => {
                            setSelectedClass(e.target.value);
                            setSelectedSection(''); // Reset section when class changes
                          }}
                        >
                          {isClassesLoading ? (
                            <option>Loading...</option>
                          ) : (
                            <>
                              <option value="">Select Class</option>
                              {classes.map(c => {
                                const val = typeof c === 'string' ? c : (c.name || c.className || c.id);
                                return <option key={val} value={val}>{val}</option>;
                              })}
                            </>
                          )}
                        </select>

                        <select 
                          className="input-dark text-xs h-11 w-32 bg-white/5"
                          value={selectedSection} 
                          onChange={e => setSelectedSection(e.target.value)}
                          disabled={!selectedClass}
                        >
                          <option value="">All Sections</option>
                          {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                        </select>

                        <button onClick={() => { refetchAttendance(); refetchStudents(); }} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-slate-400"><Loader2 className={isAttendanceLoading || isStudentsLoading ? 'animate-spin' : ''} size={18} /></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-3">
                       <thead>
                          <tr>
                            <th className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student Information</th>
                            <th className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Status</th>
                            <th className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody>
                        {isAttendanceLoading || isStudentsLoading ? (
                          <tr><td colSpan="3" className="text-center py-20"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></td></tr>
                        ) : !selectedClass ? (
                          <tr><td colSpan="3" className="text-center py-20 opacity-30 italic text-sm font-medium">Please select a class to view students.</td></tr>
                        ) : studentList.length === 0 ? (
                          <tr><td colSpan="3" className="text-center py-20 opacity-30 italic text-sm font-medium">No students found in this class.</td></tr>
                        ) : studentList.map((item, idx) => (
                          <tr key={idx} className="group transition-all">
                            <td className="px-4 py-4 bg-white/[0.03] rounded-l-2xl border-y border-l border-white/5">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-primary group-hover:scale-110 transition-transform">
                                    {item.name?.charAt(0) || 'S'}
                                  </div>
                                  <div>
                                     <p className="text-[11px] font-black text-white group-hover:text-primary transition-colors">{item.name}</p>
                                     <p className="text-[9px] font-bold text-slate-500">Roll: {item.rollNumber || 'N/A'}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-4 py-4 bg-white/[0.03] border-y border-white/5">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${item.currentStatus === 'present' ? 'bg-emerald-500' : item.currentStatus === 'holiday' ? 'bg-rose-500' : 'bg-slate-700'}`} />
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${item.currentStatus === 'present' ? 'text-emerald-500' : item.currentStatus === 'holiday' ? 'text-rose-500' : 'text-slate-500'}`}>
                                     {item.currentStatus === 'present' ? 'Present' : item.currentStatus === 'holiday' ? 'Holiday' : 'Not Marked'}
                                  </span>
                               </div>
                            </td>
                            <td className="px-4 py-4 bg-white/[0.03] border-y border-r border-white/5 rounded-r-2xl text-right">
                               <div className="flex justify-end gap-2">
                                  {item.currentStatus === 'present' ? (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateAttendance(item.id, 'holiday')}
                                        className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                      >
                                        Mark Holiday
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateAttendance(item.id, 'delete')}
                                        className="p-2.5 rounded-xl bg-slate-800 text-slate-500 hover:bg-white/5 hover:text-white transition-all shadow-lg active:scale-95"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </>
                                  ) : (
                                    <button 
                                      onClick={() => handleMarkPresent(item.id)}
                                      className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                                    >
                                      Mark Present
                                    </button>
                                  )}
                               </div>
                            </td>
                          </tr>
                        ))}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistence Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border
              ${toast.type === 'success' ? 'bg-success/20 border-success/30 text-success' : 'bg-rose-500/20 border-rose-500/30 text-rose-500'}`}
          >
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase opacity-60">Operations Alert</span>
               <span className="text-sm font-black tracking-wide">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holiday Creation Modal */}
      <AnimatePresence>
        {showHolidayForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHolidayForm(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg glass-card p-8 border-rose-500/20 shadow-2xl overflow-hidden text-left">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-xl font-black text-white">Declare Institutional Holiday</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Personnel & Academic Sync</p>
                  </div>
                  <button onClick={() => setShowHolidayForm(false)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500"><Plus className="rotate-45" size={24} /></button>
               </div>

               <form onSubmit={handleCreateHoliday} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Holiday Title</label>
                    <input 
                      required
                      className="w-full input-dark h-14 bg-white/5 border-white/10 px-4" 
                      placeholder="e.g. Diwali Break, Annual Sports Meet"
                      value={newHoliday.title}
                      onChange={e => setNewHoliday({...newHoliday, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">From Date</label>
                      <input 
                        type="date"
                        required
                        className="w-full input-dark h-14 bg-white/5 border-white/10 px-4" 
                        value={newHoliday.fromDate}
                        onChange={e => setNewHoliday({...newHoliday, fromDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">To Date</label>
                      <input 
                        type="date"
                        required
                        className="w-full input-dark h-14 bg-white/5 border-white/10 px-4" 
                        value={newHoliday.toDate}
                        onChange={e => setNewHoliday({...newHoliday, toDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description (Optional)</label>
                    <textarea 
                      className="w-full input-dark min-h-[100px] p-4 bg-white/5 border-white/10" 
                      placeholder="Details about the holiday..."
                      value={newHoliday.description}
                      onChange={e => setNewHoliday({...newHoliday, description: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="w-full py-5 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-rose-500/20 active:scale-95 transition-all">
                    Register Holiday
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
