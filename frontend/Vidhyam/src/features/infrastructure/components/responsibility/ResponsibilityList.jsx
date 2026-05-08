import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Edit3, Trash2, Users, Clock, 
  DollarSign, MoreVertical, Zap, Activity,
  ExternalLink, UserPlus
} from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';

const PriorityBadge = ({ priority }) => {
  const styles = {
    high: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  };

  return (
    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${styles[priority] || styles.low}`}>
      {priority}
    </span>
  );
};

const ResponsibilityList = ({ 
  responsibilities = [], 
  onEdit, 
  onDelete, 
  onViewDetails, 
  onBulkAssign 
}) => {
  if (responsibilities.length === 0) {
    return (
      <div className="py-24 text-center glass-card border-dashed flex flex-col items-center justify-center opacity-40">
        <Shield size={48} className="mb-4 text-slate-500" />
        <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">NO ACTIVE PROTOCOLS</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
      {responsibilities.map((r, i) => (
        <motion.div
           key={r.responsibilityId || r.id}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: i * 0.02 }}
        >
          <GlassCard 
            hover 
            className="group h-full flex flex-col" 
            glowColor={r.priority === 'high' ? 'warning' : 'primary'}
            dense
          >
            <div className="p-2 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <PriorityBadge priority={r.priority} />
                <div className="flex gap-1">
                  <StandardButton 
                    variant="ghost" 
                    size="xs" 
                    icon={Edit3} 
                    onClick={() => onEdit(r)} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <StandardButton 
                    variant="ghost" 
                    size="xs" 
                    icon={Trash2} 
                    onClick={() => onDelete(r.responsibilityId || r.id)} 
                    className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>

              {/* Body */}
              <h3 className="text-xxs font-black text-white mb-1 group-hover:text-primary transition-colors tracking-tighter uppercase italic truncate">
                {r.name}
              </h3>
              <p className="text-micro text-slate-600 font-bold uppercase tracking-tighter line-clamp-1 mb-2">
                {r.description || 'System standard protocol execution.'}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="space-y-0.5">
                  <p className="text-micro font-black text-slate-700 uppercase tracking-widest">CLASS</p>
                  <div className="flex items-center gap-1 text-micro font-bold text-slate-400 uppercase italic">
                    <Users size={10} className="text-primary/60" />
                    {r.employeeType}
                  </div>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-micro font-black text-slate-700 uppercase tracking-widest">LOAD</p>
                  <div className="flex items-center justify-end gap-1 text-micro font-bold text-slate-400 uppercase italic">
                    <Clock size={10} className="text-accent/60" />
                    {r.estimatedHoursPerWeek || 0}H
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-auto pt-2 border-t border-white/5 flex gap-1">
                <StandardButton 
                  variant="primary" 
                  size="xs" 
                  icon={UserPlus} 
                  className="flex-1"
                  onClick={() => onBulkAssign(r)}
                >
                  ASSIGN
                </StandardButton>
                <StandardButton 
                  variant="secondary" 
                  size="xs" 
                  icon={ExternalLink} 
                  onClick={() => onViewDetails(r)}
                >
                  INFO
                </StandardButton>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default ResponsibilityList;
