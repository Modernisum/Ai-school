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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-lg">
        <GlassCard title="CLONE_SPACE" onClose={onClose} className="p-4" glowColor="accent" dense>
          <div className="space-y-3 mt-2">
            <div>
              <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1">SOURCE_SPACE</p>
              <select
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-micro text-white focus:outline-none focus:border-primary/50 font-bold uppercase tracking-tight"
                value={sourceSpace}
                onChange={e => setSourceSpace(e.target.value)}
              >
                <option value="">SELECT_SOURCE...</option>
                {(spaces || []).map(s => (
                  <option key={s.spaceId || s.name} value={s.spaceId || s.name}>
                    {s.spaceName || s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1">NEW_SPACE_NAME</p>
              <input
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-micro text-white focus:outline-none focus:border-primary/50 font-bold uppercase tracking-tight placeholder:text-slate-800"
                placeholder="e.g. Class 1-C"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[8px] font-bold text-amber-400/80">Cloning copies material requirements and responsibility requirements. Employee assignments and actual material quantities are NOT copied.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <StandardButton label="CANCEL" variant="ghost" size="xs" onClick={onClose} />
              <StandardButton label="CLONE" icon={Copy} size="xs" onClick={handleClone} disabled={loading} />
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
