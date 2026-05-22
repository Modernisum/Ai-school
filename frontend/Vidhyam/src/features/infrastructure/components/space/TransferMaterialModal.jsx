import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, X, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';

export default function TransferMaterialModal({ schoolId, spaces, material, fromSpace, materials, onClose, onTransfer }) {
  const [toSpace, setToSpace] = React.useState('');
  const [selectedMaterial, setSelectedMaterial] = React.useState(material);
  const [quantity, setQuantity] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState(material ? 'transfer' : 'select');

  const sourceMats = materials || [];
  const maxQuantity = selectedMaterial?.quantity || 0;
  const otherSpaces = (spaces || []).filter(s => (s.spaceId || s.name) !== (fromSpace?.spaceId || fromSpace?.name));

  const handleSelectMaterial = (mat) => {
    setSelectedMaterial(mat);
    setQuantity(1);
    setStep('transfer');
  };

  const handleTransfer = async () => {
    if (!toSpace) { toast.error('Select target space'); return; }
    if (!selectedMaterial) { toast.error('Select a material'); return; }
    if (quantity < 1 || quantity > maxQuantity) { toast.error(`Quantity must be 1-${maxQuantity}`); return; }
    setLoading(true);
    try {
      await onTransfer({
        schoolId,
        fromSpace: fromSpace?.spaceId || fromSpace?.name,
        materialName: selectedMaterial.materialName,
        body: { to_space: toSpace, quantity },
      });
      toast.success(`Transferred ${quantity} x ${selectedMaterial.materialName}`);
      onClose();
    } catch (e) {
      toast.error(e?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-lg">
        <GlassCard title={step === 'select' ? 'Select Material to Transfer' : 'Transfer Material'} onClose={onClose} className="p-4" glowColor="primary" dense>
          {step === 'select' ? (
            <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
              <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Materials in {fromSpace?.spaceName || fromSpace?.name}</p>
              {sourceMats.length === 0 ? (
                <p className="text-[9px] text-slate-500 italic">No materials in this space</p>
              ) : (
                sourceMats.map((mat, i) => (
                  <button key={i} onClick={() => handleSelectMaterial(mat)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Package size={10} className="text-primary" />
                      <span className="text-[9px] font-black text-slate-800 dark:text-white uppercase">{mat.materialName}</span>
                    </div>
                    <span className="text-[8px] font-black text-slate-650">Qty: {mat.quantity}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="flex-1">
                  <p className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">From</p>
                  <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{fromSpace?.spaceName || fromSpace?.name}</p>
                </div>
                <ArrowRight size={14} className="text-primary" />
                <div className="flex-1">
                  <p className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Material</p>
                  <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedMaterial?.materialName}</p>
                </div>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Target Space</p>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-micro text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 font-bold tracking-tight"
                  value={toSpace}
                  onChange={e => setToSpace(e.target.value)}
                >
                  <option value="">Select target...</option>
                  {otherSpaces.map(s => (
                    <option key={s.spaceId || s.name} value={s.spaceId || s.name}>
                      {s.spaceName || s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Quantity (max: {maxQuantity})</p>
                <input
                  type="number"
                  min={1}
                  max={maxQuantity}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-micro text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 font-bold tracking-tight"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <StandardButton label="Cancel" variant="ghost" size="xs" onClick={onClose} />
                <StandardButton label="Transfer" icon={ArrowRight} size="xs" onClick={handleTransfer} disabled={loading} />
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
