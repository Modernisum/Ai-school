import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';

export default function SpaceAlertBanner({ alerts, onDismiss }) {
  const critical = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  if (!critical.length && !warnings.length) return null;

  return (
    <AnimatePresence>
      {critical.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <GlassCard className="border-red-500/30 bg-red-500/5 p-2" dense>
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">CRITICAL ALERTS</p>
                {critical.map((a, i) => (
                  <p key={i} className="text-[8px] text-red-300/80 font-bold mt-0.5">{a.message}</p>
                ))}
              </div>
              {onDismiss && (
                <button onClick={onDismiss} className="text-red-400/50 hover:text-red-400"><X size={12} /></button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}
      {warnings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <GlassCard className="border-amber-500/30 bg-amber-500/5 p-2" dense>
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">WARNINGS</p>
                {warnings.map((a, i) => (
                  <p key={i} className="text-[8px] text-amber-300/80 font-bold mt-0.5">{a.message}</p>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
