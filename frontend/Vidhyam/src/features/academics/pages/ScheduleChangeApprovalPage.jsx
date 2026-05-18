import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { academicApi } from '../api/academicApi';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import StandardButton from '../../../components/ui/StandardButton';

const { useGetPendingChangesQuery, useApproveChangeMutation, useRejectChangeMutation } = academicApi;
const getSchoolId = () => localStorage.getItem('schoolId') || '';

const typeLabels = { block_merge: 'Block Merge', skip: 'Topic Skip', substitute: 'Substitute' };
const typeColors = { block_merge: 'bg-blue-500/20 text-blue-400', skip: 'bg-amber-500/20 text-amber-400', substitute: 'bg-purple-500/20 text-purple-400' };

export default function ScheduleChangeApprovalPage() {
  const schoolId = getSchoolId();
  const { data: changes = [], isLoading, refetch } = useGetPendingChangesQuery(schoolId);
  const [approveChange] = useApproveChangeMutation();
  const [rejectChange] = useRejectChangeMutation();
  const [rejectId, setRejectId] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [approvingId, setApprovingId] = useState(null);

  const handleApprove = async (id) => {
    setApprovingId(id);
    try { await approveChange({ schoolId, changeId: id }).unwrap(); toast.success('Approved'); refetch(); }
    catch (e) { toast.error(e?.data?.message || 'Failed'); }
    setApprovingId(null);
  };

  const handleReject = async (id) => {
    try { await rejectChange({ schoolId, changeId: id, adminNote }).unwrap(); toast.info('Rejected'); setRejectId(null); setAdminNote(''); refetch(); }
    catch (e) { toast.error(e?.data?.message || 'Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
      <PageHeader title="Change Approvals" subtitle="Approve or reject schedule change requests" icon={CheckCircle} />

      {isLoading ? (
        <GlassCard><div className="p-8 text-center text-slate-400">Loading requests...</div></GlassCard>
      ) : changes.length === 0 ? (
        <GlassCard><div className="p-8 text-center text-slate-400">No pending change requests</div></GlassCard>
      ) : (
        <div className="space-y-3 mt-4">
          {changes.map(c => (
            <GlassCard key={c.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeColors[c.type] || 'bg-slate-500/20 text-slate-400'}`}>
                        {typeLabels[c.type] || c.type}
                      </span>
                      <span className="text-xs text-slate-400">by {c.requestedBy}</span>
                    </div>
                    {c.reason && <div className="text-sm text-slate-300 mb-1">{c.reason}</div>}
                    <div className="flex gap-4 text-xs text-slate-500">
                      {c.sourceClassId && <span>Source: {c.sourceClassId}</span>}
                      {c.targetClassId && <span>Target: {c.targetClassId}</span>}
                      {c.dateFrom && <span>{c.dateFrom} → {c.dateTo}</span>}
                      {c.blockCapMinutes && <span className="text-indigo-400">Cap: {c.blockCapMinutes}min</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <StandardButton onClick={() => handleApprove(c.id)} icon={CheckCircle} variant="success" size="xs" isLoading={approvingId === c.id} />
                    <StandardButton onClick={() => setRejectId(c.id)} icon={XCircle} variant="danger" size="xs" />
                  </div>
                </div>
                {rejectId === c.id && (
                  <div className="mt-3 flex gap-2">
                    <input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Reason for rejection"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
                    <StandardButton onClick={() => handleReject(c.id)} variant="danger" size="xs">Confirm Reject</StandardButton>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
