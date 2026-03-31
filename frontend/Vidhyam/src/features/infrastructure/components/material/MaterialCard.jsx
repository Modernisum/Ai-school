import React from 'react';
import { motion } from 'framer-motion';
import { Package, Info, Trash2, RefreshCw } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

function MaterialCard({ material, onEdit, onDelete, onBuy, onSell, onViewHistory }) {
  const stockPercentage = material.quantity > 0 ? (material.extraUnit / material.quantity) * 100 : 0;
  const isLowStock = stockPercentage < 20 && material.extraUnit > 0;
  const isOutOfStock = material.extraUnit <= 0;
  const hasShortage = material.needUnit > 0;

  return (
    <div className="group bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-primary/40 hover:bg-primary/[0.02] transition-all relative overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-primary/20 group-hover:text-primary transition-all shadow-lg"><Package size={28} /></div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"><Info size={16} /></button>
          <button onClick={onDelete} className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-accent transition-all"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{material.materialName || material.name}</h3>
        {hasShortage && (
          <span className="px-2 py-0.5 rounded-md bg-accent/20 border border-accent/40 text-accent text-[8px] font-black animate-pulse">SHORTAGE: {material.needUnit}</span>
        )}
      </div>
      <p className="text-[11px] text-primary font-black italic tracking-widest">{formatCurrency(material.unitPrice)} / Unit Price</p>
      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
          <span className="text-slate-600 italic">Inventory Stock</span>
          <span className={`${isOutOfStock ? 'text-accent' : isLowStock ? 'text-yellow-500' : 'text-success'} shadow-[0_0_10px_rgba(var(--success-rgb),0.5)]`}>
            {material.extraUnit} / {material.quantity}
          </span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, stockPercentage)}%` }} className={`h-full transition-all duration-1000 ${isOutOfStock ? 'bg-accent shadow-[0_0_15px_var(--accent)]' : isLowStock ? 'bg-yellow-500 shadow-[0_0_15px_var(--yellow-color)]' : 'bg-success shadow-[0_0_15px_var(--success)]'}`} /></div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3">
        <button onClick={onBuy} className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-success/20 hover:text-success hover:border-success/30 transition-all italic">Procure</button>
        <button onClick={onSell} className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-accent/20 hover:text-accent hover:border-accent/30 transition-all italic">Distribute</button>
        <button onClick={onViewHistory} className="col-span-2 py-3 rounded-2xl bg-white/2 border border-white/5 text-slate-600 hover:text-white flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all"><RefreshCw size={12} /> Transaction Log</button>
      </div>
    </div>
  );
}

export default MaterialCard;