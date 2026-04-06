import { Briefcase, LayoutGrid, Edit2, Trash2 } from 'lucide-react';

function ResponsibilityCard({ responsibility, spaces, onClick, onEdit, onDelete }) {
  const assignedSpaces = spaces?.filter(s => responsibility.spaceIds?.includes(s.id || s.spaceId));

  return (
    <div 
      className="group flex flex-col p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/40 hover:bg-primary/[0.02] transition-all relative overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 flex items-center gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
        >
          <Edit2 size={12} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-primary/20 group-hover:text-primary transition-all">
            <Briefcase size={18} />
          </div>
          <div>
            <span className="text-sm font-black text-white uppercase italic tracking-tight">{responsibility.name}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-primary italic leading-none">₹{responsibility.workAmount || 0}</p>
          <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{responsibility.workPeriod || 'Monthly'}</p>
        </div>
      </div>
      
      {responsibility.description && (
        <p className="text-[10px] text-slate-400 font-medium mb-4 line-clamp-2 leading-relaxed">
          {responsibility.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
        <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-tighter">
          {responsibility.employeeType || 'General'}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-tighter">
          {responsibility.workLevel || 'Junior'}
        </span>
        {assignedSpaces && assignedSpaces.length > 0 ? (
          <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-[8px] font-black uppercase tracking-tighter border border-white/10 flex items-center gap-1">
            <LayoutGrid size={8} /> {assignedSpaces.length} Sectors
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-500 text-[8px] font-black uppercase tracking-tighter italic">
            Global Protocol
          </span>
        )}
      </div>
    </div>
  );
}

export default ResponsibilityCard;