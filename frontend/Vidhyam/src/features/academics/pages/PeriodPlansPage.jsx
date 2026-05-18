import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { academicApi } from '../api/academicApi';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import StandardButton from '../../../components/ui/StandardButton';

const { useGetPeriodPlansQuery, useRestructurePlansMutation } = academicApi;
const getSchoolId = () => localStorage.getItem('schoolId') || '';

const formatDate = (d) => d.toISOString().split('T')[0];
const getWeekRange = (offset) => {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
};

const periodLabels = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PeriodPlansPage() {
  const schoolId = getSchoolId();
  const [weekOffset, setWeekOffset] = useState(0);
  const [teacherId, setTeacherId] = useState(localStorage.getItem('userId') || '');
  const { start } = getWeekRange(weekOffset);
  const date = formatDate(start);

  const { data: plans = [], isLoading, refetch } = useGetPeriodPlansQuery(
    { schoolId, teacherId, date },
    { skip: !teacherId }
  );
  const [restructure, { isLoading: restructuring }] = useRestructurePlansMutation();

  const handleRestructure = async () => {
    try {
      await restructure({ schoolId, teacherId, date }).unwrap();
      toast.success('Topics restructured');
      refetch();
    } catch (e) { toast.error(e?.data?.message || 'Restructure failed'); }
  };

  const grouped = {};
  for (const p of plans) {
    const dow = new Date(p.date).getDay() || 7;
    const dayIdx = dow - 1;
    if (!grouped[dayIdx]) grouped[dayIdx] = {};
    grouped[dayIdx][p.periodNumber - 1] = p;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
      <PageHeader title="Period Plans" subtitle={`Week of ${date}`} icon={CalendarDays} />
      <div className="flex items-center gap-3 mb-4">
        <input value={teacherId} onChange={e => setTeacherId(e.target.value)} placeholder="Teacher ID"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
        <StandardButton onClick={() => setWeekOffset(0)} icon={ChevronLeft} variant="ghost" size="sm" />
        <StandardButton onClick={() => setWeekOffset(w => w + 1)} icon={ChevronRight} variant="ghost" size="sm" />
        <StandardButton onClick={handleRestructure} icon={RefreshCw} variant="primary" size="sm" isLoading={restructuring}>
          Restructure
        </StandardButton>
      </div>

      {isLoading ? (
        <GlassCard><div className="p-8 text-center text-slate-400">Loading plans...</div></GlassCard>
      ) : (
        <GlassCard>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 text-left">Day</th>
                  {periodLabels.map(pl => <th key={pl} className="p-2 text-slate-500 text-center">{pl}</th>)}
                </tr>
              </thead>
              <tbody>
                {dayNames.map((day, di) => (
                  <tr key={di}>
                    <td className="p-2 font-semibold text-white">{day}</td>
                    {periodLabels.map((_, pi) => {
                      const p = grouped[di]?.[pi];
                      return (
                        <td key={pi} className="p-1">
                          {p ? (
                            <div className={`rounded p-2 text-center text-[10px] ${p.status === 'completed' ? 'bg-green-500/20 text-green-400' : p.status === 'missed' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-300'}`}>
                              <div className="font-semibold truncate max-w-[80px]">{p.topicName || p.subjectId}</div>
                            </div>
                          ) : (
                            <div className="rounded p-2 bg-slate-800/30 text-slate-600 text-center text-[10px]">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}
