import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader, RefreshCw, CheckCircle, AlertTriangle, X, Clock, User } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
const getSchoolId = () => localStorage.getItem('schoolId') || "622079";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

export default function ComplainManagement() {
  const schoolId = getSchoolId();
  const [complains, setComplains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [viewComplain, setViewComplain] = useState(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const loadComplains = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/complains/${schoolId}`);
      const data = await res.json();
      setComplains(data.data || data.complains || []);
    } catch { showToast('error', 'Failed to load complaints'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadComplains(); }, [schoolId]);

  const statusBg = (s) => ({
    'pending': 'bg-amber-500/15 border-amber-500/25 text-amber-400',
    'resolved': 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
    'dismissed': 'bg-slate-500/15 border-slate-500/25 text-slate-400',
  }[s?.toLowerCase()] || 'bg-slate-500/15 border-slate-500/25 text-slate-400');

  return (
    <div className="min-h-full">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <AlertCircle size={18} className="text-rose-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Complaints</h1>
            <p className="text-xs text-slate-500">{complains.length} records</p>
          </div>
        </div>
        <button onClick={loadComplains} className="btn-secondary p-2"><RefreshCw size={15} /></button>
      </div>

      <div className="p-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader size={28} className="animate-spin text-indigo-400" /></div>
        ) : complains.length === 0 ? (
          <div className="text-center py-14">
            <AlertCircle size={36} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No complaints found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complains.map((c, i) => (
              <motion.div
                key={c.id || i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setViewComplain(c)}
                className="glass-card p-4 hover-card cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm truncate">{c.title || 'Untitled Complaint'}</h3>
                      <span className={`badge flex-shrink-0 ${statusBg(c.status)}`}>{c.status || 'Pending'}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.description || 'No description'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                      <span><User size={10} className="inline mr-1" />{c.studentId || c.student_id || 'N/A'}</span>
                      <span><Clock size={10} className="inline mr-1" />{fmtDate(c.createdAt || c.created_at)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {viewComplain && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setViewComplain(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="drawer-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white">Complaint Details</h2>
                <button onClick={() => setViewComplain(null)} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg"><X size={18} /></button>
              </div>
              <h3 className="font-bold text-white text-lg">{viewComplain.title}</h3>
              <span className={`badge ${statusBg(viewComplain.status)}`}>{viewComplain.status || 'Pending'}</span>
              <div className="space-y-2 mt-3">
                {[
                  ['Student ID', viewComplain.studentId || viewComplain.student_id],
                  ['Filed On', fmtDate(viewComplain.createdAt)],
                  ['Description', viewComplain.description],
                ].map(([k, v]) => v ? (
                  <div key={k} className="py-2 border-b border-white/5">
                    <p className="text-slate-500 text-xs mb-1">{k}</p>
                    <p className="text-white text-sm">{v}</p>
                  </div>
                ) : null)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl
              ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}>
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}