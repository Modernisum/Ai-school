import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';
import GlassCard from './GlassCard';

const KPITile = ({ label, value, sub, icon: Icon, color = "primary", trend = null }) => {
  const colorMap = {
    primary: "from-blue-500/20 to-blue-600/20 text-blue-400 border-blue-500/30",
    success: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    accent: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30",
    warning: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    purple: "from-blue-600/20 to-cyan-600/20 text-blue-400 border-blue-600/30",
  };

  return (
    <GlassCard className="p-3 group hover:-translate-y-0.5" glowColor={color} dense>
      <div className="flex justify-between items-center mb-2">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorMap[color]} border shadow-md group-hover:scale-105 transition-transform duration-300`}>
          <Icon size={16} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-micro font-black px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend > 0 ? <TrendingUp size={8} /> : <Activity size={8} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-micro font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <h3 className="text-lg font-black text-white tracking-tight">{value}</h3>
          <p className="text-micro font-bold text-slate-400 opacity-60 truncate">
             {sub}
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

export default KPITile;
