import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';
import GlassCard from './GlassCard';

const KPITile = ({ label, value, sub, icon: Icon, color = "primary", trend = null }) => {
  const colorMap = {
    primary: "from-primary/10 to-primary/20 text-primary border-primary/20",
    success: "from-success/10 to-success/20 text-success border-success/20",
    accent: "from-accent/10 to-accent/20 text-accent border-accent/20",
    warning: "from-warning/10 to-warning/20 text-warning border-warning/20",
    purple: "from-primary/10 to-accent/20 text-primary border-primary/20",
  };

  return (
    <GlassCard className="p-3 group hover:-translate-y-0.5" glowColor={color} dense>
      <div className="flex justify-between items-center mb-2">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.primary} border shadow-md group-hover:scale-105 transition-transform duration-300`}>
          <Icon size={16} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-micro font-semibold px-1.5 py-0.5 rounded-md bg-slate-500/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend > 0 ? <TrendingUp size={8} /> : <Activity size={8} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-micro font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">{value}</h3>
          <p className="text-micro font-medium text-[var(--text-muted)] opacity-70 truncate">
             {sub}
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

export default KPITile;
