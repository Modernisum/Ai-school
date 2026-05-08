import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage, API_BASE_URL } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Calendar, CheckCircle, XCircle, Clock, AlertTriangle,
  User, Loader, ChevronDown, ChevronUp, MessageSquare, Shield, RefreshCw
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import FormWidget from '../../../components/ui/FormWidget';
import SwitchButton from '../../../components/ui/SwitchButton';

const getSchoolId = () => getSchoolIdFromStorage() || '';
const getToken = () => localStorage.getItem('accessToken') || '';

const LEAVE_TYPES = [
  { id: 'casual', label: 'Casual Leave', description: 'For personal reasons or short-notice' },
  { id: 'sick', label: 'Sick Leave', description: 'Medical reasons / health emergencies' },
  { id: 'annual', label: 'Annual Leave', description: 'Pre-planned leave for vacation/travel' },
  { id: 'emergency', label: 'Emergency Leave', description: 'Urgent unforeseen family situations' },
  { id: 'maternity', label: 'Maternity Leave', description: 'Post/pre-delivery time off' },
];

const STATUS_COLORS = {
  PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  conditionally_approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const STATUS_ICONS = {
  PENDING: Clock,
  pending: Clock,
  APPROVED: CheckCircle,
  approved: CheckCircle,
  REJECTED: XCircle,
  rejected: XCircle,
  conditionally_approved: Shield,
};

function Badge({ status }) {
  const cls = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  const Icon = STATUS_ICONS[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>
      <Icon size={10} />{status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// ── Apply Leave Form ──────────────────────────────────────────────────────────
function ApplyLeaveForm({ onSuccess }) {
  const schoolId = getSchoolId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { control, handleSubmit } = useForm({
    defaultValues: {
      type: 'casual',
      from_date: new Date().toISOString().split('T')[0],
      to_date: '',
      reason: '',
      contact_during_leave: '',
    }
  });

  const SCHEMA = useMemo(() => [
    {
      id: 'details',
      label: 'Leave Specs',
      icon: Calendar,
      fields: [
        { 
          name: 'type', 
          label: 'Leave Category', 
          type: 'select', 
          required: true,
          options: LEAVE_TYPES.map(t => ({ label: t.label, value: t.id }))
        },
        { name: 'from_date', label: 'Start Date', type: 'date', required: true },
        { name: 'to_date', label: 'End Date', type: 'date', required: true },
        { name: 'reason', label: 'Reason for absence', type: 'textarea', required: true, placeholder: 'Explain why you need leave...' },
        { name: 'contact_during_leave', label: 'Alternate Contact', type: 'tel', placeholder: 'Optional phone/email' },
      ]
    }
  ], []);

  const submit = async (data) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...data,
          leaveType: data.type,
          fromDate: data.from_date,
          toDate: data.to_date,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success !== false) {
        onSuccess?.();
      } else {
        setError(resData.message || 'Synchronization failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} />{error}
        </div>
      )}

      <FormWidget
        title=""
        sections={SCHEMA}
        activeSection="details"
        control={control}
        onSubmit={handleSubmit(submit)}
        onCancel={() => onSuccess?.()}
        submitLabel="Submit Application"
        isLoading={saving}
        showDescription={false}
      />
    </div>
  );
}

// ── Leave List ────────────────────────────────────────────────────────────────
function LeaveList({ leaves, onRefresh, isAdmin = false }) {
  const schoolId = getSchoolId();
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const handleAction = async (leaveId, action) => {
    setActionLoading(`${leaveId}-${action}`);
    try {
      // Different endpoints might be used depending on the backend structure
      // Supporting both /leaves and /leave (legacy)
      const url = `${API_BASE_URL}/leaves/${schoolId}/${leaveId}/${action}`;
      const res = await fetch(url, {
        method: action === 'approve' || action === 'reject' ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) onRefresh?.();
      else {
        // Try fallback legacy endpoint if /leaves fails
        const fallbackUrl = `${API_BASE_URL}/leave/${schoolId}/${leaveId}/${action}`;
        const res2 = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res2.ok) onRefresh?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  if (!leaves || leaves.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <FileText size={40} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500">{isAdmin ? 'No leave requests' : 'No leave applications yet'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaves.map(leave => {
        const id = leave.id || leave.leaveId;
        const isExpanded = expandedId === id;
        const status = leave.status || 'PENDING';
        const StatusIcon = STATUS_ICONS[status] || Clock;
        return (
          <div key={id} className="glass-card overflow-hidden">
            <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setExpandedId(isExpanded ? null : id)}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <StatusIcon size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white capitalize">
                  {isAdmin ? `${leave.employeeName || leave.employeeId || 'Employee'} - ` : ''}
                  {(leave.leaveType || leave.type || 'casual').replace('_', ' ')} Leave
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{leave.fromDate || leave.from_date} → {leave.toDate || leave.to_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={status} />
                {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                    <p className="text-sm text-slate-400">{leave.reason || 'No reason provided'}</p>
                    {leave.contact_during_leave && (
                      <p className="text-xs text-slate-500">Contact: {leave.contact_during_leave}</p>
                    )}

                    {/* Admin actions */}
                    {isAdmin && (status.toLowerCase() === 'pending') && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleAction(id, 'approve')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                          {actionLoading === `${id}-approve` ? <Loader size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                          Approve
                        </button>
                        <button onClick={() => handleAction(id, 'reject')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                          {actionLoading === `${id}-reject` ? <Loader size={11} className="animate-spin" /> : <XCircle size={11} />}
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Leave Management Page ────────────────────────────────────────────────
export default function LeaveManagement({ isAdmin = false }) {
  const schoolId = getSchoolId();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'queue' : 'my');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchLeaves = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${schoolId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || data.leaves || []);
      
      // Fallback to legacy endpoint if /leaves is empty but expected data
      if (list.length === 0) {
        const res2 = await fetch(`${API_BASE_URL}/leave/${schoolId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data2 = await res2.json();
        const list2 = Array.isArray(data2) ? data2 : (data2.data || data2.leaves || []);
        setLeaves(list2);
      } else {
        setLeaves(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { 
    fetchLeaves(); 
  }, [fetchLeaves]);

  const pendingLeaves = leaves.filter(l => (l.status || 'pending').toLowerCase() === 'pending');
  const approvedLeaves = leaves.filter(l => (l.status || '').toLowerCase() === 'approved');
  const rejectedLeaves = leaves.filter(l => (l.status || '').toLowerCase() === 'rejected');

  return (
    <div className="max-w-full p-1 space-y-1 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText size={14} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase italic leading-none">LEAVE_PROTOCOL</h1>
            <p className="text-micro font-black text-slate-700 uppercase tracking-widest mt-0.5">
              {isAdmin ? 'REVIEW_AND_APPROVE_REQUESTS' : 'APPLY_AND_TRACK_ABSENCE'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
            <StandardButton
                variant="ghost"
                size="xs"
                onClick={fetchLeaves}
                icon={RefreshCw}
                className={loading ? 'animate-spin' : ''}
            />
            {!isAdmin && (
                <StandardButton
                    variant="primary"
                    size="xs"
                    onClick={() => setShowForm(f => !f)}
                    icon={Plus}
                >
                    APPLY_LEAVE
                </StandardButton>
            )}
        </div>
      </header>

      {/* Apply Form */}
      <AnimatePresence>
        {showForm && !isAdmin && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-micro font-black text-white uppercase italic tracking-widest">NEW_APPLICATION</h3>
                <StandardButton variant="ghost" size="xs" onClick={() => setShowForm(false)} icon={XCircle} />
              </div>
              <ApplyLeaveForm onSuccess={() => { setShowForm(false); fetchLeaves(); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
        {[
          { label: 'PENDING_REQUESTS', count: pendingLeaves.length, color: 'text-amber-500', bg: 'bg-amber-500/5' },
          { label: 'APPROVED_NODES', count: approvedLeaves.length, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
          { label: 'REJECTED_NODES', count: rejectedLeaves.length, color: 'text-rose-500', bg: 'bg-rose-500/5' },
        ].map(s => (
          <div key={s.label} className={`glass-card p-2 flex flex-col items-center border-white/5 ${s.bg}`}>
            <p className={`text-xl font-black ${s.color} italic`}>{s.count}</p>
            <p className="text-micro text-slate-700 font-black uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="pb-2">
        <SwitchButton 
          tabs={isAdmin ? [
            { id: 'queue', label: 'Pending Queue' },
            { id: 'all', label: 'All History' }
          ] : [
            { id: 'my', label: 'All Leaves' },
            { id: 'pending', label: 'Waitlisted' },
            { id: 'approved', label: 'Approved' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {loading && leaves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader size={32} className="animate-spin text-primary" />
          <p className="text-slate-500 text-sm animate-pulse">Fetching leave records...</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {isAdmin && activeTab === 'queue' && <LeaveList leaves={pendingLeaves} onRefresh={fetchLeaves} isAdmin />}
          {isAdmin && activeTab === 'all' && <LeaveList leaves={leaves} onRefresh={fetchLeaves} isAdmin />}
          {!isAdmin && activeTab === 'my' && <LeaveList leaves={leaves} onRefresh={fetchLeaves} />}
          {!isAdmin && activeTab === 'pending' && <LeaveList leaves={pendingLeaves} onRefresh={fetchLeaves} />}
          {!isAdmin && activeTab === 'approved' && <LeaveList leaves={approvedLeaves} onRefresh={fetchLeaves} />}
        </motion.div>
      )}
    </div>
  );
}
