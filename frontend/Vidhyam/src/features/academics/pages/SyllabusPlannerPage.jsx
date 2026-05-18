import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, BarChart3, Play } from 'lucide-react';
import { toast } from 'react-toastify';
import { academicApi } from '../api/academicApi';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import StandardButton from '../../../components/ui/StandardButton';

const {
  useGetClassIdsQuery,
  useLazyGetSubjectIdsQuery,
  useGetSyllabusQuery,
  usePlotSyllabusMutation,
  useGetQuarterReportQuery,
} = academicApi;

const getSchoolId = () => localStorage.getItem('schoolId') || '';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const quarterColors = { Q1: 'bg-amber-500/20 text-amber-400', Q2: 'bg-blue-500/20 text-blue-400', Q3: 'bg-green-500/20 text-green-400', Q4: 'bg-purple-500/20 text-purple-400' };
const statusColors = { pending: 'bg-amber-500/20 border-amber-500/30', in_progress: 'bg-blue-500/20 border-blue-500/30', completed: 'bg-green-500/20 border-green-500/30', delayed: 'bg-red-500/20 border-red-500/30' };

export default function SyllabusPlannerPage() {
  const schoolId = getSchoolId();
  const { data: classes = [] } = useGetClassIdsQuery(schoolId);
  const [fetchSubjects, { data: subjects = [] }] = useLazyGetSubjectIdsQuery();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [plotYear, setPlotYear] = useState(new Date().getFullYear());
  const [plotting, setPlotting] = useState(false);

  const { data: syllabus = [], isLoading: sylLoading, refetch } = useGetSyllabusQuery(
    { schoolId, subjectId: selectedSubject },
    { skip: !selectedSubject }
  );
  const { data: quarterData = [] } = useGetQuarterReportQuery(
    { schoolId, quarter: activeQuarter },
    { skip: !selectedSubject }
  );
  const [plotSyllabus] = usePlotSyllabusMutation();

  const quarterSyllabus = syllabus.filter(s => s.quarter === activeQuarter);
  const quarterReportData = Array.isArray(quarterData) ? quarterData : [];

  const handleClassChange = async (className) => {
    setSelectedClass(className);
    setSelectedSubject('');
    if (className) {
      const result = await fetchSubjects({ schoolId, className });
      if (result.data) setSelectedSubject(result.data[0] || '');
    }
  };

  const handlePlot = async () => {
    if (!selectedClass || !selectedSubject) return;
    setPlotting(true);
    try {
      await plotSyllabus({ schoolId, classId: selectedClass, subjectId: selectedSubject, academicYear: plotYear }).unwrap();
      toast.success('Syllabus plotted for academic year');
      refetch();
    } catch (e) { toast.error(e?.data?.message || 'Plot failed'); }
    setPlotting(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
      <PageHeader title="Syllabus Planner" subtitle="AI-driven annual syllabus distribution" icon={BookOpen} />

      <GlassCard>
        <div className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Class</div>
            <select value={selectedClass} onChange={e => handleClassChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white">
              <option value="">Select Class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Subject</div>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <StandardButton onClick={handlePlot} icon={Play} variant="primary" size="sm" isLoading={plotting}>
            Plot Syllabus
          </StandardButton>
        </div>
      </GlassCard>

      {selectedSubject && (
        <div className="mt-4">
          <div className="flex gap-2 mb-4">
            {quarters.map(q => (
              <button key={q} onClick={() => setActiveQuarter(q)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeQuarter === q ? quarterColors[q] : 'bg-slate-800 text-slate-400'}`}>
                {q}
              </button>
            ))}
          </div>

          {sylLoading ? (
            <GlassCard><div className="p-8 text-center text-slate-400">Loading syllabus...</div></GlassCard>
          ) : quarterSyllabus.length === 0 ? (
            <GlassCard><div className="p-8 text-center text-slate-400">No chapters plotted for {activeQuarter}. Click "Plot Syllabus" to generate.</div></GlassCard>
          ) : (
            <div className="space-y-2">
              {quarterSyllabus.map(ch => (
                <GlassCard key={ch.id}>
                  <div className={`p-4 border-l-4 rounded-r-lg ${statusColors[ch.status] || statusColors.pending}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white">{ch.chapterName}</span>
                        <div className="text-xs text-slate-400 mt-1">
                          {ch.plannedStartDate} → {ch.plannedEndDate} · {ch.periodCount || 0} periods
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${ch.status === 'completed' ? 'bg-green-500/20 text-green-400' : ch.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : ch.status === 'delayed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {ch.status || 'pending'}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
