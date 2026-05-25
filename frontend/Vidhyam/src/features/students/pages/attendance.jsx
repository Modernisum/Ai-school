import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Activity, Search, Loader, ShieldCheck, Database, 
  GraduationCap, Users, CalendarCheck, Layers, Info, X 
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../hooks/useAuth';
import { useGetStudentsQuery } from '../api/studentApi';
import { academicApi } from '../../academics/api/academicApi';
import GlassCard from '../../../components/ui/GlassCard';
import FormWidget from '../../../components/ui/FormWidget';
import KPITile from '../../../components/ui/KPITile';
import StandardButton from '../../../components/ui/StandardButton';

const { 
  useGetAttendanceByDateQuery, 
  useMarkPresentMutation, 
  useDeleteAttendanceMutation,
  useMarkHolidayMutation 
} = academicApi;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function StudentAttendance() {
  const { schoolId } = useAuth();
  const { control, handleSubmit, reset } = useForm();
  
  // Fetch students
  const { data: sData, isLoading: studentsLoading } = useGetStudentsQuery(schoolId);
  const students = useMemo(() => sData?.data || sData?.students || [], [sData]);
  
  // Attendance state
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attSpace, setAttSpace] = useState('All');
  const [attSearch, setAttSearch] = useState('');
  const [presentIds, setPresentIds] = useState(new Set());
  const [marking, setMarking] = useState({});
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  
  // Fetch current attendance for date
  const { data: attData, isLoading: attLoading } = useGetAttendanceByDateQuery({ schoolId, date: attDate }, { skip: !schoolId || !attDate });
  
  useEffect(() => {
    if (attData) {
        const ids = new Set((attData.data || attData || []).map(a => a.studentId || a.userId));
        setPresentIds(ids);
    }
  }, [attData]);

  const [markPresent] = useMarkPresentMutation();
  const [deleteAttendance] = useDeleteAttendanceMutation();
  const [markHolidayApi] = useMarkHolidayMutation();
  
  // Extract unique spaces
  const spaces = useMemo(() => {
    const spaceSet = new Set();
    students.forEach(s => {
      const sid = s.spaceId || s.space_id;
      if (sid) spaceSet.add(sid);
    });
    return Array.from(spaceSet).sort();
  }, [students]);
  
  // Filter students for attendance
  const attStudents = useMemo(() => students.filter(s => {
    const name = (s.name || s.studentName || '').toLowerCase();
    const sid = s.spaceId || s.space_id || '';
    return (attSpace === 'All' || sid === attSpace)
      && (!attSearch || name.includes(attSearch.toLowerCase()));
  }), [students, attSpace, attSearch]);
  
  const presentCount = attStudents.filter(s => presentIds.has(s.studentId || s.student_id)).length;
  const attPct = attStudents.length > 0 ? Math.round((presentCount / attStudents.length) * 100) : 0;
  
  // Toggle present/absent
  const togglePresent = async (student) => {
    const sid = student.studentId || student.student_id;
    if (!sid) return;
    
    setMarking(prev => ({ ...prev, [sid]: true }));
    
    try {
      const isPresent = presentIds.has(sid);
      if (isPresent) {
          await deleteAttendance({ schoolId, role: 'student', userId: sid, date: attDate }).unwrap();
          setPresentIds(prev => { const n = new Set(prev); n.delete(sid); return n; });
      } else {
          await markPresent({ schoolId, role: 'student', userId: sid, body: { date: attDate } }).unwrap();
          setPresentIds(prev => { const n = new Set(prev); n.add(sid); return n; });
      }
    } catch (error) {
      console.error('Attendance Sync Failure:', error);
    } finally {
      setMarking(prev => ({ ...prev, [sid]: false }));
    }
  };

  const handleMarkHoliday = async (data) => {
    try {
      // Logic for marking holiday (might be bulk or per student depending on backend)
      // Usually marking holiday for a class or entire school
      await markHolidayApi({ 
        schoolId, 
        role: 'student', 
        userId: 'bulk', // Assuming bulk or specialized logic
        body: { date: attDate, reason: data.reason } 
      }).unwrap();
      setShowHolidayModal(false);
      alert('Holiday marked successfully');
    } catch (error) {
      console.error('Holiday Sync Failure:', error);
      alert('Failed to mark holiday: ' + (error.data?.message || error.message));
    }
  };
  
  const regularStudents = useMemo(() => students.filter(s => (s.studentType || '').toLowerCase() !== 'private'), [students]);
  const privateStudents = useMemo(() => students.filter(s => (s.studentType || '').toLowerCase() === 'private'), [students]);
  
  if (studentsLoading) return (
      <div className="min-h-screen page-bg flex flex-col items-center justify-center">
          <Loader className="animate-spin text-primary mb-4" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Retrieving Student Records...</span>
      </div>
  );

    return (
        <div className="max-w-full p-1 space-y-2 text-slate-400">
            {/* ─── Header ─── */}
            <header className="flex justify-between items-center bg-white/[0.02] p-1 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                        <CalendarCheck size={12} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white tracking-tight uppercase italic leading-none">Attendance Registry</h1>
                        <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                            Local Time: {new Date().toLocaleTimeString()} • Synchronized
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <StandardButton variant="secondary" size="xs" onClick={() => setShowHolidayModal(true)} icon={Clock} label="Mark Holiday" />
                </div>
            </header>

            {/* ─── Global Analytics ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                <KPITile label="Total Students" value={students.length} sub={`${regularStudents.length} Regular`} icon={GraduationCap} color="primary" dense />
                <KPITile label="Private Students" value={privateStudents.length} sub="INDEPENDENT" icon={ShieldCheck} color="accent" dense />
                <KPITile label="Attendance Rate" value={`${attPct}%`} sub={`${presentCount} Present`} icon={Activity} color="success" dense />
                <KPITile label="Spaces" value={spaces.length} sub="Active Spaces" icon={Database} color="warning" dense />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1">
                {/* ─── Controls ─── */}
                <aside className="lg:col-span-3 space-y-1">
                    <GlassCard className="p-0 border border-white/5 bg-white/[0.01]" dense>
                        <FormWidget
                            title="Filter Parameters"
                            sections={[{
                                fields: [
                                    { name: 'date', label: 'Date', type: 'date', required: true },
                                    { name: 'space', label: 'Space (Class)', type: 'select', options: [
                                        { label: 'All Spaces', value: 'All' },
                                        ...spaces.map(s => ({ label: s.toUpperCase(), value: s }))
                                    ], required: true }
                                ]
                            }]}
                            control={control}
                            initialData={{ date: attDate, space: attSpace }}
                            onChange={(field, value) => {
                                if (field === 'date') setAttDate(value);
                                if (field === 'space') setAttSpace(value);
                            }}
                            showActions={false}
                            dense
                        />
                    </GlassCard>

                    <div className="p-1.5 rounded bg-amber-500/5 border border-amber-500/10">
                        <div className="flex items-center gap-1.5 text-amber-500 mb-0.5">
                            <Info size={10} />
                            <h4 className="text-[8px] font-black uppercase tracking-widest leading-none">Quick Tip</h4>
                        </div>
                        <p className="text-[7px] font-bold text-amber-500/50 leading-tight italic uppercase">
                            Attendance is saved automatically in real-time. Present students are marked "Present".
                        </p>
                    </div>
                </aside>

                {/* ─── Registry Viewport ─── */}
                <main className="lg:col-span-9">
                    <GlassCard className="h-[600px] flex flex-col p-0 border border-white/5 bg-white/[0.01]" dense>
                        <header className="p-1.5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-[10px] font-black text-white uppercase italic tracking-tight">Students List</h3>
                            <div className="relative group max-w-xs">
                                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-700" />
                                <input 
                                    className="w-48 bg-white/[0.02] border border-white/5 rounded py-1 pl-7 pr-2 text-micro text-white placeholder:text-slate-800 focus:outline-none focus:border-primary/20 transition-all font-black uppercase tracking-widest" 
                                    placeholder="Search students..." value={attSearch} onChange={e => setAttSearch(e.target.value)} 
                                    />
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                            {attLoading ? (
                                <div className="py-20 flex flex-col items-center gap-2">
                                    <Loader size={20} className="animate-spin text-slate-800" />
                                    <p className="text-micro font-black text-slate-700 uppercase tracking-widest">Loading students...</p>
                                </div>
                            ) : attStudents.length === 0 ? (
                                <div className="py-20 text-center glass-card border-dashed">
                                    <Users size={24} className="mx-auto mb-2 text-slate-800" />
                                    <p className="text-micro font-black text-slate-700 uppercase tracking-widest">No students found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1">
                                    {attStudents.map((s, i) => {
                                        const sid = s.studentId || s.student_id;
                                        const isPresent = presentIds.has(sid);
                                        return (
                                            <div key={sid || i} className={`p-1 rounded bg-white/[0.01] border transition-all flex items-center justify-between group ${isPresent ? 'border-success/30 bg-success/5 shadow-sm shadow-success/10' : 'border-white/5 hover:border-white/10'}`}>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="w-5 h-5 rounded bg-slate-900 border border-white/5 flex items-center justify-center font-black text-primary text-[8px] uppercase shrink-0">
                                                        {(s.name || s.studentName || 'S')[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-[9px] font-black text-white italic truncate uppercase leading-none">{s.name || s.studentName}</h4>
                                                        <p className="text-[7px] font-bold text-slate-700 truncate uppercase mt-0.5">{sid}</p>
                                                    </div>
                                                </div>
                                                <StandardButton 
                                                    variant={isPresent ? 'success' : 'ghost'}
                                                    size="xs"
                                                    onClick={() => togglePresent(s)} 
                                                    disabled={marking[sid]} 
                                                    isLoading={marking[sid]}
                                                    className="!h-5 !px-1.5 !text-[7px] shrink-0"
                                                    label={isPresent ? 'Present' : 'Absent'}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </main>
            </div>

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <GlassCard className="w-full max-w-md shadow-2xl p-0 overflow-hidden">
            <FormWidget
              title="Mark Holiday"
              sections={[{
                fields: [
                  { name: 'date', label: 'Holiday Date', type: 'date', required: true },
                  { name: 'reason', label: 'Reason / Description', type: 'textarea', placeholder: 'Enter reason for holiday', required: true }
                ]
              }]}
              control={control}
              onSubmit={handleSubmit(handleMarkHoliday)}
              onCancel={() => { setShowHolidayModal(false); reset(); }}
              submitLabel="Configure Holiday"
            />
          </GlassCard>
        </div>
      )}
    </div>
  );
}