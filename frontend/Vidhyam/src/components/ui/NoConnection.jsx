import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const NoConnection = ({ onRetry, title = "Connection Offline", description = "We're having trouble reaching the command center. Check your network or server status.", compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/20 text-accent">
        <WifiOff size={18} className="animate-pulse" />
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{title}</p>
          <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter mt-0.5">Offline Mode Active</p>
        </div>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <WifiOff size={48} className="animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
          <AlertCircle size={20} className="text-accent" />
        </div>
      </div>
      
      <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-3">
        {title}
      </h2>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-sm leading-relaxed mb-8 opacity-80">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        {onRetry && (
          <button 
            onClick={onRetry}
            className="btn-primary px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Re-establish Link
          </button>
        )}
        <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Monitoring Signal...</span>
        </div>
      </div>
    </motion.div>
  );
};

export default NoConnection;
