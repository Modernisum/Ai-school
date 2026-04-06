import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Plus, X, Users, Package, Trash2 } from 'lucide-react';
import EmptyState from './EmptyState';

function AddSpaceCard({ selectedCategory, categories, responsibilities, availableMaterials, spaces, onCreateResponsibility, onProvision, isExpanded, setIsExpanded }) {
  const [catId, setCatId] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [materialRequirements, setMaterialRequirements] = useState([]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [selectedMatName, setSelectedMatName] = useState('');
  const [selectedMatQty, setSelectedMatQty] = useState(1);

  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const cat = categories.find(c => {
        const name = typeof c === 'string' ? c : (c.name || '');
        return name === selectedCategory;
      });
      if (cat) {
        const id = typeof cat === 'string' ? cat : (cat.id || cat.name);
        setCatId(id);
      }
    }
  }, [selectedCategory, categories]);

  const handleQuickAddRole = async () => {
    if (!newRoleName.trim()) return;
    setIsCreating(true);
    try {
      const newRole = await onCreateResponsibility(newRoleName.trim());
      if (newRole) {
        setRequirements([...requirements, { 
          roleId: newRole.responsibilityId || newRole.id, 
          roleName: newRole.name, 
          count: 1 
        }]);
      }
      setIsCreatingRole(false);
      setNewRoleName('');
    } catch (err) {
      console.error("Failed to create role:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleProvision = () => {
    onProvision({ 
      categoryId: catId, 
      capacity: 0, 
      requirements, 
      materialRequirements,
      materials: [] 
    });
    setRequirements([]);
    setMaterialRequirements([]);
    setIsExpanded(false);
  };

  const filteredSpacesForAutoIndex = spaces?.filter(s => (s.categoryName || s.category_name || s.category)?.toLowerCase() === selectedCategory?.toLowerCase()) || [];
  const nextIndex = filteredSpacesForAutoIndex.length + 1;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => !isExpanded && setIsExpanded(true)}
      className={`glass-card group transition-all flex flex-col p-5 overflow-hidden ${isExpanded ? 'col-span-1 sm:col-span-2 lg:col-span-2 border-primary/50 ring-2 ring-primary/20 bg-primary/[0.03]' : 'cursor-pointer hover:ring-2 hover:ring-primary/40 border-dashed border-primary/30 bg-primary/[0.02]'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <motion.div layout className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          {isExpanded ? <Box size={24} /> : <Plus size={24} />}
        </motion.div>
        {isExpanded && (
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-2 text-slate-500 hover:text-white rounded-xl transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {!isExpanded ? (
        <div className="space-y-1">
          <p className="text-[10px] font-black text-primary/60 tracking-widest uppercase italic">Provision Infrastructure</p>
          <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">
            {selectedCategory ? `+ ADD ${selectedCategory}` : '+ INITIALIZE SECTOR'}
          </h3>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="col-span-full border-b border-white/5 pb-8 mb-4">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                   <div className="px-6 py-2 rounded-full bg-primary/20 border border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] animate-pulse">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">Auto-Indexing Active</p>
                   </div>
                   <div className="space-y-1">
                      <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter shadow-sm">{selectedCategory || 'Sector'} #{nextIndex}</h2>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest italic opacity-60">Manifest Identifier Priority Alpha-{nextIndex}</p>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-secondary tracking-[0.2em] uppercase">Personnel Mandates</p>
                  <button onClick={() => setShowRoleSelector(true)} className="p-2 bg-secondary/10 text-secondary rounded-xl hover:bg-secondary/20 transition-all"><Plus size={16} /></button>
                </div>
                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                   {requirements?.map((req, idx) => (
                     <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-secondary/30 transition-all">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_var(--secondary)]" />
                           <span className="text-[11px] font-black text-white uppercase italic tracking-tight">{req.roleName} x{req.count}</span>
                        </div>
                        <button onClick={() => setRequirements(requirements.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-accent transition-colors"><Trash2 size={14} /></button>
                     </div>
                   ))}
                   {isCreatingRole ? (
                     <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                        <input className="input-dark py-3 text-[11px]" placeholder="Protocol Name..." value={newRoleName} onChange={e => setNewRoleName(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleQuickAddRole()} />
                        <div className="flex gap-2">
                           <button onClick={() => setIsCreatingRole(false)} className="flex-1 py-2 text-[9px] font-black text-slate-600 uppercase">Abort</button>
                           <button onClick={handleQuickAddRole} className="flex-1 py-2 bg-primary/20 text-primary text-[9px] font-black uppercase rounded-xl">Commit</button>
                        </div>
                     </div>
                   ) : showRoleSelector ? (
                      <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20 space-y-3">
                        <select className="input-dark text-[11px]" defaultValue="" onChange={(e) => {
                           if (e.target.value === 'NEW') { setIsCreatingRole(true); setShowRoleSelector(false); return; }
                           const role = responsibilities.find(r => r.responsibilityId === e.target.value);
                           if (role) { setRequirements([...requirements, { roleId: role.responsibilityId, roleName: role.name, count: 1 }]); setShowRoleSelector(false); }
                        }}>
                           <option value="" disabled>Select Protocol...</option>
                           {responsibilities?.map(r => <option key={r.responsibilityId} value={r.responsibilityId}>{(r.name || '').toUpperCase()}</option>)}
                           <option value="NEW" className="text-primary font-black">+ AUTHORIZE NEW ROLE</option>
                        </select>
                        <button onClick={() => setShowRoleSelector(false)} className="w-full py-1.5 text-[9px] font-black text-slate-600 uppercase">Cancel</button>
                      </div>
                   ) : requirements.length === 0 && <EmptyState icon={Users} text="No personnel mandates" />}
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-accent tracking-[0.2em] uppercase">Asset Mandates</p>
                  <button onClick={() => setShowMaterialSelector(true)} className="p-2 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-all"><Plus size={16} /></button>
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic opacity-60">
                   Note: Default materials for {selectedCategory || 'this category'} will be auto-provisioned.
                </p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                   {materialRequirements?.map((req, idx) => (
                     <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-accent/30 transition-all">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
                           <span className="text-[11px] font-black text-white uppercase italic tracking-tight">{req.materialName} x{req.requiredCount}</span>
                        </div>
                        <button onClick={() => setMaterialRequirements(materialRequirements.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-accent transition-colors"><Trash2 size={14} /></button>
                     </div>
                   ))}
                   {showMaterialSelector && (
                      <div className="p-5 rounded-2xl bg-accent/5 border border-accent/20 space-y-4">
                        <select className="input-dark text-[11px]" value={selectedMatName} onChange={(e) => setSelectedMatName(e.target.value)}>
                           <option value="">Choose Material...</option>
                           {availableMaterials?.map(m => (<option key={m.id} value={m.name}>{(m.name || '').toUpperCase()}</option>))}
                        </select>
                        <div className="flex items-center gap-3">
                           <input type="number" min="1" className="input-dark py-3 text-[11px]" value={selectedMatQty} onChange={e => setSelectedMatQty(parseInt(e.target.value) || 1)} />
                           <button onClick={() => {
                              if (!selectedMatName) return;
                              setMaterialRequirements([...materialRequirements, { materialName: selectedMatName, requiredCount: selectedMatQty }]);
                              setShowMaterialSelector(false); setSelectedMatName(''); setSelectedMatQty(1);
                           }} className="px-6 py-3 bg-accent text-[10px] font-black text-white uppercase rounded-2xl">Add</button>
                        </div>
                      </div>
                   )}
                   {materialRequirements.length === 0 && !showMaterialSelector && <EmptyState icon={Package} text="No asset mandates" />}
                </div>
             </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex items-center justify-end gap-4">
             <button onClick={() => setIsExpanded(false)} className="btn-secondary px-8 py-3 text-[11px] font-black uppercase tracking-widest">Abort Infrastructure Initialization</button>
             <button onClick={handleProvision} className="btn-primary px-12 py-4 text-[11px] font-black uppercase tracking-[0.2em] italic shadow-2xl shadow-primary/40">Authorize Provisioning Sequence</button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default AddSpaceCard;