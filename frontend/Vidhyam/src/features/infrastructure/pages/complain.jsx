import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { selectPollingInterval } from '../../settings/settingsSlice';
import { 
  AlertCircle, Loader, RefreshCw, CheckCircle, AlertTriangle, 
  X, Clock, User, Eye, Download, FileText 
} from 'lucide-react';
import { useGetComplaintsQuery } from '../infrastructureApi';
import { useWebSockets } from '../../../hooks/useWebSockets';

const getSchoolId = () => localStorage.getItem('schoolId') || "";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

export default function ComplainManagement() {
  const schoolId = getSchoolId();
  const pollingInterval = useSelector(selectPollingInterval);
  const { data: complainsData, isLoading, isFetching, refetch } = useGetComplaintsQuery(schoolId, { pollingInterval });
  const { messages } = useWebSockets(schoolId);
  
  const [toast, setToast] = useState(null);
  const [viewComplain, setViewComplain] = useState(null);

  const complains = complainsData?.data || [];

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  // Refetch when a new message arrives via WebSockets
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.type === 'complaint' || lastMsg.category === 'complaint') {
        refetch();
        showToast('success', 'New complaint received!');
      }
    }
  }, [messages, refetch]);

  const statusBg = (s) => ({
    'pending': 'bg-amber-500/15 border-amber-500/25 text-amber-400',
    'resolved': 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
    'dismissed': 'bg-slate-500/15 border-slate-500/25 text-slate-400',
  }[s?.toLowerCase()] || 'bg-slate-500/15 border-slate-500/25 text-slate-400');

  return (
    <div className="min-h-full">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <AlertCircle size={16} className="text-rose-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Complaints</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{complains.length} records</p>
          </div>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isFetching}
          className={`btn-secondary p-1.5 ${isFetching ? 'animate-spin opacity-50' : ''}`}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="p-6 space-y-3">
        {isLoading ? (
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
                className="glass-card p-4 hover-card cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm truncate">{c.title || 'Untitled Complaint'}</h3>
                      <span className={`badge flex-shrink-0 ${statusBg(c.status)}`}>{c.status || 'Pending'}</span>
                      {c.attachmentUrl && (
                        <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                          <Download size={10} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.description || 'No description'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                      <span><User size={10} className="inline mr-1" />{c.studentId || c.student_id || 'N/A'}</span>
                      <span><Clock size={10} className="inline mr-1" />{fmtDate(c.createdAt || c.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors mt-1" />
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
              
              <div className="space-y-1">
                <h3 className="font-bold text-white text-lg">{viewComplain.title}</h3>
                <span className={`badge ${statusBg(viewComplain.status)}`}>{viewComplain.status || 'Pending'}</span>
              </div>

              {/* GCS Attachment Action */}
              {viewComplain.attachmentUrl && (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Attachment</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Image/PDF Document</p>
                    </div>
                  </div>
                  <a 
                    href={viewComplain.attachmentUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Eye size={18} />
                  </a>
                </div>
              )}

              <div className="space-y-4 pt-2">
                {[
                  ['Student ID', viewComplain.studentId || viewComplain.student_id],
                  ['Filed On', fmtDate(viewComplain.createdAt || viewComplain.created_at)],
                  ['Priority', viewComplain.priority || 'Normal'],
                  ['Category', viewComplain.category || 'General'],
                  ['Description', viewComplain.description],
                ].map(([k, v]) => v ? (
                  <div key={k} className="space-y-1.5">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">{k}</p>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-slate-200">
                      {v}
                    </div>
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

const ChevronRight = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

