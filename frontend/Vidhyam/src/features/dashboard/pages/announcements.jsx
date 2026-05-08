import React, { useState, useEffect, useCallback } from 'react';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion } from 'framer-motion';
import { Loader2, Megaphone } from 'lucide-react';

const getSchoolId = () => getSchoolIdFromStorage() || "";
const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

export default function AnnouncementsPage() {
  const schoolId = getSchoolId();
  const [notices, setNotices] = useState([]);
  const [isNoticesLoading, setIsNoticesLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => { 
    setToast({ type, msg }); 
    setTimeout(() => setToast(null), 3000); 
  };

  // Fetch Notices
  const fetchNotices = useCallback(async () => {
    if (!schoolId) return;
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
    fetchNotices();
  }, [fetchNotices]);

  return (
    <div className="max-w-full p-2 space-y-4 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
            <Megaphone size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase italic">SCHOOL_NOTICES</h1>
            <p className="text-micro font-black text-slate-700 uppercase tracking-widest">NETWORK_SYNC_ACTIVE</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
        {isNoticesLoading ? (
           <div className="col-span-full h-32 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={20} /></div>
        ) : notices.length === 0 ? (
           <div className="col-span-full h-24 glass-card border-dashed flex flex-col items-center justify-center opacity-30">
              <Megaphone size={24} className="mb-1" />
              <p className="font-black uppercase tracking-widest text-micro">NO_RECORDS</p>
           </div>
        ) : notices.map((n, i) => (
          <motion.div key={i} whileHover={{ y: -1 }} className="glass-card p-2 border-white/5 hover:border-primary/20 group transition-all bg-white/[0.01]" dense>
            <div className="flex justify-between items-start mb-1">
              <div className="p-1 rounded bg-primary/10 text-primary group-hover:scale-110 transition-transform"><Megaphone size={10} /></div>
              <span className="text-[7px] font-black text-slate-800 bg-white/5 px-1 rounded border border-white/5 uppercase">{n.date}</span>
            </div>
            <h3 className="text-[9px] font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight truncate italic leading-tight">{n.title}</h3>
            <p className="text-[8px] text-slate-700 font-bold leading-none line-clamp-2 italic mt-1">"{n.content}"</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
