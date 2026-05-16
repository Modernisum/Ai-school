import React from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, CheckCircle, Plus, ArrowRight, IndianRupee } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';
import BudgetIndicator from './BudgetIndicator';

export default function SpaceMaterialTab({
  materials,
  summary,
  isLoading,
  onTransfer,
  onAddMaterial,
}) {
  if (isLoading) {
    return <div className="space-y-1">{[1, 2, 3].map(i => <SkeletonLoader key={i} variant="card" className="h-10" />)}</div>;
  }

  if (!materials || materials.length === 0) {
    return (
      <div className="py-8 text-center flex flex-col items-center gap-2 opacity-40">
        <Package size={20} />
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">NO_MATERIALS_ASSIGNED</p>
        <StandardButton label="ADD_MATERIAL" icon={Plus} size="xs" onClick={onAddMaterial} />
      </div>
    );
  }

  const totalValue = summary?.totalValue || materials.reduce((sum, m) => sum + (m.unitPrice || 0) * (m.quantity || 0), 0);
  const deficitValue = summary?.deficitValue || 0;
  const deficitCount = summary?.deficitCount || materials.filter(m => m.status === 'deficit').length;
  const budget = summary?.budget;

  return (
    <div className="space-y-1.5">
      <GlassCard dense className="bg-white/[0.03] border-white/5">
        <div className="p-1.5 flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <IndianRupee size={10} className="text-green-400" />
              <span className="text-[9px] font-black text-green-400">
                ₹{totalValue.toLocaleString()}
              </span>
              <span className="text-[7px] font-black text-slate-700 uppercase tracking-wider">TOTAL VALUE</span>
            </div>
            {deficitCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle size={10} className="text-red-400" />
                <span className="text-[9px] font-black text-red-400">
                  ₹{deficitValue.toLocaleString()}
                </span>
                <span className="text-[7px] font-black text-slate-700 uppercase tracking-wider">SHORTFALL</span>
              </div>
            )}
          </div>
          {budget !== undefined && budget !== null && (
            <BudgetIndicator totalValue={totalValue} budget={budget} />
          )}
        </div>
      </GlassCard>

      {materials.map((mat, i) => {
        const required = mat.requiredCount || 0;
        const available = mat.quantity || 0;
        const pct = required > 0 ? Math.round((available / required) * 100) : 100;
        const isDeficit = mat.status === 'deficit';
        const barColor = pct >= 100 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
        const Icon = pct >= 100 ? CheckCircle : pct >= 50 ? AlertTriangle : AlertTriangle;
        const iconColor = pct >= 100 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
        return (
          <GlassCard key={mat.materialName || i} dense className="bg-white/[0.02]" hover>
            <div className="p-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon size={10} className={iconColor} />
                  <span className="text-[9px] font-black text-white uppercase tracking-tight">{mat.materialName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[8px] font-black ${isDeficit ? 'text-red-400' : 'text-green-400'}`}>
                    {available}/{required}
                  </span>
                  {isDeficit && (
                    <StandardButton variant="ghost" size="xs" icon={ArrowRight}
                      onClick={() => onTransfer(mat)} title="Transfer" />
                  )}
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className={`h-full rounded-full ${barColor}`}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest">{mat.unit || 'pcs'}</span>
                <span className="text-[7px] font-black text-slate-700">{pct}%</span>
              </div>
              {mat.unitPrice && (
                <p className="text-[7px] font-black text-slate-700 mt-0.5 tracking-wider">
                  ₹{mat.unitPrice}/unit · ₹{(mat.unitPrice * available).toLocaleString()} total
                </p>
              )}
            </div>
          </GlassCard>
        );
      })}
      <div className="pt-1">
        <StandardButton label="ADD_MATERIAL" icon={Plus} size="xs" onClick={onAddMaterial} />
      </div>
    </div>
  );
}
