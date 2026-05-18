import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileCheck, FileX, CheckCircle, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import StandardButton from '../../../components/ui/StandardButton';

const getSchoolId = () => localStorage.getItem('schoolId') || '';
const API = (path) => `/api/school/${getSchoolId()}/people/${path}`;

export default function FormFillDashboard() {
  const schoolId = getSchoolId();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [completingId, setCompletingId] = useState(null);
  const [autoFillingId, setAutoFillingId] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(API('students/form-status'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await res.json();
      setStudents(data?.data || []);
    } catch (e) { toast.error('Failed to load'); }
    setLoading(false);
  };

  React.useEffect(() => { fetchStatus(); }, []);

  const autoFill = async (studentId, name) => {
    setAutoFillingId(studentId);
    setSelectedStudent({ id: studentId, name });
    try {
      const res = await fetch(API(`students/${studentId}/auto-fill`), {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await res.json();
      setPrefillData(data?.data || null);
    } catch (e) { toast.error('Auto-fill failed'); }
    setAutoFillingId(null);
  };

  const markComplete = async (studentId) => {
    setCompletingId(studentId);
    try {
      await fetch(API(`students/${studentId}/form-complete`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      toast.success('Form marked as complete');
      fetchStatus();
    } catch (e) { toast.error('Failed'); }
    setCompletingId(null);
  };

  const filtered = students.filter(s => {
    if (filter === 'completed') return s.formCompleted;
    if (filter === 'pending') return !s.formCompleted;
    return true;
  });

  const completed = students.filter(s => s.formCompleted).length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
      <PageHeader title="Form Fill Dashboard" subtitle={`${completed}/${students.length} completed · Bulk auto-fill from documents`} icon={FileCheck} />

      <div className="flex gap-3 mb-4">
        <StandardButton onClick={() => setFilter('all')} variant={filter === 'all' ? 'primary' : 'ghost'} size="sm">All</StandardButton>
        <StandardButton onClick={() => setFilter('pending')} variant={filter === 'pending' ? 'primary' : 'ghost'} size="sm">Pending</StandardButton>
        <StandardButton onClick={() => setFilter('completed')} variant={filter === 'completed' ? 'primary' : 'ghost'} size="sm">Completed</StandardButton>
        <StandardButton onClick={fetchStatus} icon={RefreshCw} variant="ghost" size="sm" />
      </div>

      {filtered.length === 0 && !loading && (
        <GlassCard><div className="p-8 text-center text-slate-400">No students found</div></GlassCard>
      )}

      {prefillData && (
        <GlassCard>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Auto-Filled Data for {selectedStudent?.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(prefillData).filter(([k]) => !['ocrAvailable', 'formCompleted', 'studentId'].includes(k)).map(([key, val]) => (
                <div key={key} className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-400">{key}</span>
                  <span className="text-white font-mono">{val || '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <StandardButton onClick={() => markComplete(prefillData.studentId)} variant="success" size="xs" icon={CheckCircle} isLoading={completingId === prefillData.studentId}>Mark Complete</StandardButton>
              <StandardButton onClick={() => setPrefillData(null)} variant="ghost" size="xs">Close</StandardButton>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map(s => (
          <GlassCard key={s.studentId}>
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {s.formCompleted
                  ? <CheckCircle size={18} className="text-green-400" />
                  : <FileX size={18} className="text-amber-400" />
                }
                <div>
                  <div className="text-sm font-semibold text-white">{s.name}</div>
                  <div className="text-[10px] text-slate-400">{s.className} · {s.hasDocuments ? `${s.documentCount} docs` : 'No docs'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {!s.formCompleted && (
                  <>
                    <StandardButton onClick={() => autoFill(s.studentId, s.name)} icon={Search} variant="primary" size="xs" isLoading={autoFillingId === s.studentId}>Auto-Fill</StandardButton>
                    <StandardButton onClick={() => markComplete(s.studentId)} variant="success" size="xs" isLoading={completingId === s.studentId}>Done</StandardButton>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}
