import React from 'react';
import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center bg-slate-500/5 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-xl opacity-60 w-full col-span-full min-h-[200px]">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ delay: 0.1 }}
      >
        {Icon && <Icon size={32} className="mb-3 text-slate-500 dark:text-slate-400 mx-auto opacity-70" />}
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-800 dark:text-white mb-1">{title}</h3>
        {subtitle && <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 max-w-md mx-auto tracking-widest leading-relaxed uppercase">{subtitle}</p>}
      </motion.div>
    </div>
  );
}
