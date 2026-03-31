import React from 'react';
import { motion } from 'framer-motion';
import { Box, RefreshCw, Trash2, Users, Package, ExternalLink } from 'lucide-react';

function SpaceCard({ space, onEdit, onDelete, onManage }) {
  const id = space.id || space.spaceId;
  const category = (space.categoryName || space.category_name || space.category || space.spaceCategory || 'UNCLASSIFIED').toUpperCase();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card group hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer flex flex-col h-full"
      onClick={onManage}
    >
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
            <Box size={24} />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-primary/60 tracking-widest">{category}</span>
               <span className="w-1 h-1 rounded-full bg-white/10" />
               <span className="text-[10px] font-mono text-slate-600">{id}</span>
             </div>
             {(space.requirements || []).some(r => r.fulfilledCount < r.requiredCount) && (
               <span className="px-2 py-0.5 rounded-md bg-accent/20 border border-accent/30 text-accent text-[8px] font-black animate-pulse">
                 VACANCY
               </span>
             )}
             {(space.materialRequirements || []).some(m => m.fulfilledCount < m.requiredCount) && (
               <span className="px-2 py-0.5 rounded-md bg-secondary/20 border border-secondary/30 text-secondary text-[8px] font-black animate-pulse ml-1">
                 SHORTAGE
               </span>
             )}
          </div>
          <h3 className="text-lg font-black text-white italic tracking-tight uppercase group-hover:text-primary transition-colors line-clamp-1">
            {space.spaceName || space.name}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5">
          <div className="space-y-1">
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Capacity</p>
             <div className="flex items-center gap-2">
               <Users size={12} className="text-secondary" />
               <span className="text-xs font-black text-slate-300">{space.capacity || '—'}</span>
             </div>
          </div>
          <div className="space-y-1">
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assets</p>
             <div className="flex items-center gap-2">
               <Package size={12} className="text-primary" />
               <span className="text-xs font-black text-slate-300">
                 {(space.materialRequirements || []).length > 0 
                   ? `${(space.materialRequirements || []).reduce((acc, r) => acc + (r.fulfilledCount || 0), 0)} / ${(space.materialRequirements || []).reduce((acc, r) => acc + (r.requiredCount || 0), 0)}`
                   : (space.materialCount || 0)}
               </span>
             </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
        <div className="flex flex-wrap gap-1 max-w-[70%]">
          {(space.requirements || []).map((req, idx) => (
            <div key={idx} className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter border ${req.fulfilledCount < req.requiredCount ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-success/10 border-success/20 text-success'}`}>
              {req.roleName}
            </div>
          ))}
          {(space.requirements || []).length === 0 && (
            <div className="flex -space-x-2">
               {[1, 2, 3].map(i => (
                 <div key={i} className="w-6 h-6 rounded-full border-2 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-500" style={{ borderColor: 'var(--dark-bg-3)' }}>
                    {i}
                 </div>
               ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-primary opacity-60 group-hover:opacity-100 transition-all font-black text-xs">
           <span className="uppercase tracking-tighter italic">Manage</span>
           <ExternalLink size={12} />
        </div>
      </div>
    </motion.div>
  );
}

export default SpaceCard;