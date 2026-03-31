import React from 'react';

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="py-12 text-center bg-white/[0.01] border border-white/5 rounded-3xl border-dashed">
      <Icon size={32} className="text-slate-800 mx-auto mb-3 opacity-30" />
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">{text}</p>
    </div>
  );
}

export default EmptyState;