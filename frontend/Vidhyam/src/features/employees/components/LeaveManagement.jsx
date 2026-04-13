import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage, API_BASE_URL } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Calendar, CheckCircle, XCircle, Clock, AlertTriangle,
  User, Loader, ChevronDown, ChevronUp, MessageSquare, Shield, RefreshCw
} from 'lucide-react';

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
  const [form, setForm] = useState({
    type: 'casual',
    from_date: '',
    to_date: '',
    reason: '',
    contact_during_leave: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.from_date || !form.to_date || !form.reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...form,
          leaveType: form.type,
          fromDate: form.from_date,
          toDate: form.to_date,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        onSuccess?.();
      } else {
        setError(data.message || 'Failed to apply for leave');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Leave Type */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">Leave Type *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {LEAVE_TYPES.map(type => (
            <button key={type.id} type="button" onClick={() => set('type', type.id)}
              className={`text-left p-3 rounded-xl border text-sm transition-all ${form.type === type.id ? 'bg-primary/20 border-primary/40 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
              <p className="font-semibold">{type.label}</p>
              <p className="text-[11px] opacity-70 mt-0.5">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">From Date *</label>
          <input type="date" className="input-dark w-full" value={form.from_date}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => set('from_date', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">To Date *</label>
          <input type="date" className="input-dark w-full" value={form.to_date}
            min={form.from_date || new Date().toISOString().split('T')[0]}
            onChange={e => set('to_date', e.target.value)} required />
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="text-xs text-slate-400 mb-1.5 block">Reason *</label>
        <textarea className="input-dark w-full resize-none" rows={3}
          placeholder="Please explain the reason for your leave..."
          value={form.reason} onChange={e => set('reason', e.target.value)} required />
      </div>

      {/* Contact */}
      <div>
        <label className="text-xs text-slate-400 mb-1.5 block">Contact During Leave (optional)</label>
        <input className="input-dark w-full" placeholder="Phone number or alternate contact..."
          value={form.contact_during_leave} onChange={e => set('contact_during_leave', e.target.value)} />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={14} />{error}
        </div>
      )}

      <button type="submit" disabled={saving}
        className="btn-primary w-full justify-center">
        {saving ? <Loader size={14} className="animate-spin" /> : <FileText size={14} />}
        {saving ? 'Submitting…' : 'Submit Leave Application'}
      </button>
    </form>
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
    <div className="space-y-5 p-4 md:p-6 min-h-screen bg-[#0a0a0c]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Leave Management</h2>
            <p className="text-sm text-slate-500">
              {isAdmin ? 'Review and approved leave requests' : 'Apply and track your leaves'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={fetchLeaves} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            {!isAdmin && (
                <button onClick={() => setShowForm(f => !f)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-slate-900 font-bold hover:brightness-110 transition-all">
                    <Plus size={16} /> Apply Leave
                </button>
            )}
        </div>
      </div>

      {/* Apply Form */}
      <AnimatePresence>
        {showForm && !isAdmin && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="glass-card p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white">New Leave Application</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                    <XCircle size={18} />
                </button>
              </div>
              <ApplyLeaveForm onSuccess={() => { setShowForm(false); fetchLeaves(); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Pending Requests', count: pendingLeaves.length, color: 'border-amber-500 text-amber-400' },
          { label: 'Approved', count: approvedLeaves.length, color: 'border-green-500 text-green-400' },
          { label: 'Rejected', count: rejectedLeaves.length, color: 'border-rose-500 text-rose-400' },
        ].map(s => (
          <div key={s.label} className={`glass-card p-4 border-l-4 ${s.color.split(' ')[0]}`}>
            <p className={`text-3xl font-black ${s.color.split(' ')[1]}`}>{s.count}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
        {isAdmin ? (
          [['queue', 'Pending Queue', pendingLeaves.length], ['all', 'All History', leaves.length]].map(([id, label, cnt]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === id ? 'text-accent border-b-2 border-accent' : 'text-slate-500 hover:text-slate-300'}`}>
              {label}
              {cnt > 0 && <span className="bg-accent/20 text-accent text-[10px] px-1.5 py-0.5 rounded-full font-bold">{cnt}</span>}
            </button>
          ))
        ) : (
          [['my', 'All Leaves'], ['pending', 'Waitlisted'], ['approved', 'Approved']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === id ? 'text-accent border-b-2 border-accent' : 'text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))
        )}
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
