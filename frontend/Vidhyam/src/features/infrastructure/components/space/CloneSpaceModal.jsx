import React from 'react';
import { motion } from 'framer-motion';
import { Copy, X } from 'lucide-react';
import { toast } from 'react-toastify';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';

export default function CloneSpaceModal({ schoolId, spaces, onClose, onClone }) {
  const [sourceSpace, setSourceSpace] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleClone = async () => {
    if (!sourceSpace || !newName.trim()) {
      toast.error('Select source and enter new name');
      return;
    }
    setLoading(true);
    try {
      await onClone({ schoolId, spaceName: sourceSpace, body: { newSpaceName: newName.trim() } });
      toast.success(`Space cloned as '${newName}'`);
      onClose();
    } catch (e) {
      toast.error(e?.data?.message || 'Clone failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-lg">
        <GlassCard title="Clone Space" onClose={onClose} className="p-4" glowColor="accent" dense>
          <div className="space-y-3 mt-2">
            <div>
              <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Source Space</p>
              <select
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-micro text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 font-bold tracking-tight"
                value={sourceSpace}
                onChange={e => setSourceSpace(e.target.value)}
              >
                <option value="">Select source...</option>
                {(spaces || []).map(s => (
                  <option key={s.spaceId || s.name} value={s.spaceId || s.name}>
                    {s.spaceName || s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">New Space Name</p>
              <input
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-micro text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 font-bold tracking-tight placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="e.g. Class 1-C"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <p className="text-[8px] font-bold text-amber-600 dark:text-amber-400">Cloning copies material requirements and responsibility requirements. Employee assignments and actual material quantities are NOT copied.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <StandardButton label="Cancel" variant="ghost" size="xs" onClick={onClose} />
              <StandardButton label="Clone" icon={Copy} size="xs" onClick={handleClone} disabled={loading} />
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
