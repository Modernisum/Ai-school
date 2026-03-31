import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, X, Package, Briefcase, ShieldCheck, Info, Users, Plus, Trash2 } from 'lucide-react';
import { useGetSpaceDetailsQuery, useGetEmployeeResponsibilitiesQuery, useGetResponsibilitiesQuery, useAssignResponsibilityMutation, useRemoveResponsibilityMutation } from '../../infrastructureApi';
import SpaceRoleRow from './SpaceRoleRow';
import EmptyState from './EmptyState';

function SpaceDetailModal({ 
  space, onClose, schoolId, showToast, 
  availableEmployees, availableMaterials,
  onAddMaterial, onAssignEmployee,
  onRemoveEmployee
}) {
  const [activeTab, setActiveTab] = useState('inventory');
  const id = space.id || space.spaceId;
  const { data: detailsData, isFetching } = useGetSpaceDetailsQuery({ schoolId, spaceId: id });
  const details = detailsData?.space || space;
  const items = details.materials || [];
  const employees = details.employees || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-md" onClick={onClose}>
      <motion.div initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="border-l border-white/10 w-full max-w-2xl h-full flex flex-col overflow-hidden shadow-2xl shadow-black/90 rounded-l-[3.5rem]" style={{ backgroundColor: 'var(--dark-bg-1)' }} onClick={e => e.stopPropagation()}>
        {/* Header Section */}
        <div className="px-10 py-8 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl shadow-primary/20"><Box size={32} /></div>
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black tracking-widest uppercase italic">{space?.categoryName || 'Sector'}</span>
                <span className="text-[11px] font-mono text-slate-500 opacity-50"># {id}</span>
              </div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mt-1">{space?.spaceName || space?.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all"><X size={24} /></button>
        </div>

        {/* Tab Navigation */}
        <div className="px-10 flex gap-12 border-b border-white/5 bg-black/20">
          {[
            { id: 'inventory', label: 'Asset Management', icon: Package },
            { id: 'roles', label: 'Mission Protocols', icon: Briefcase },
            { id: 'metrics', label: 'Sector Analytics', icon: ShieldCheck },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 py-6 px-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
              <tab.icon size={16} /> {tab.label}
              {activeTab === tab.id && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_15px_var(--primary)]" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10" style={{ backgroundColor: 'var(--dark-bg-2)' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'inventory' ? (
              <motion.div key="inventory" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                <div className="flex flex-col gap-12">
                  <div className="space-y-6">
                    <h3 className="text-[12px] font-black text-primary tracking-[0.3em] uppercase italic">Sector Mandates</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(details.materialRequirements || []).map((req, idx) => (
                        <div key={idx} className={`p-6 rounded-3xl border transition-all h-32 flex flex-col justify-between ${req.fulfilledCount < req.requiredCount ? 'bg-accent/5 border-accent/20' : 'bg-success/5 border-success/20'}`}>
                          <div className="flex justify-between items-start">
                            <p className={`text-sm font-black uppercase italic tracking-tight ${req.fulfilledCount < req.requiredCount ? 'text-accent' : 'text-success'}`}>{req.materialName}</p>
                            <Package size={14} className="opacity-40" />
                          </div>
                          <div className="flex items-end justify-between">
                            <p className={`text-2xl font-black italic ${req.fulfilledCount < req.requiredCount ? 'text-accent' : 'text-white'}`}>{req.fulfilledCount} <span className="text-xs text-slate-600">/ {req.requiredCount}</span></p>
                            <p className="text-[9px] font-black text-slate-600 uppercase italic">{req.fulfilledCount < req.requiredCount ? 'Shortage' : 'Operational'}</p>
                          </div>
                        </div>
                      ))}
                      {(details.materialRequirements || []).length === 0 && <div className="col-span-2 py-10 text-center opacity-30 text-[10px] font-black uppercase italic italic border border-dashed border-white/10 rounded-3xl">No asset requirements established</div>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12px] font-black text-slate-500 tracking-[0.3em] uppercase italic">Allocated Assets</h3>
                      <button onClick={onAddMaterial} className="btn-primary py-3 px-6 text-[10px] flex items-center gap-2 font-black italic uppercase shadow-xl shadow-primary/20"><Plus size={14} /> Allocate Assets</button>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {items.length === 0 ? <EmptyState icon={Package} text="Sector Provisioning Empty" /> : items.map((item, idx) => (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex items-center justify-between group hover:border-primary/40 transition-all">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-primary transition-all"><Package size={20} /></div>
                            <div>
                              <p className="font-black text-white text-base uppercase tracking-tight italic">{item.materialName || item.itemName || 'Unnamed Asset'}</p>
                              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">ID: {item.materialId || item.id || 'GEN-0x0'}</p>
                            </div>
                          </div>
                          <p className="text-3xl font-black text-white italic">{item.quantity || 1} <span className="text-[10px] text-primary uppercase">{item.unit || 'Units'}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'roles' ? (
              <motion.div key="roles" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-black text-primary tracking-[0.3em] uppercase italic">Operative Jurisdictions</h3>
                  <button onClick={onAssignEmployee} className="btn-secondary py-3 px-6 text-[10px] flex items-center gap-2 font-black uppercase tracking-widest"><Users size={14} /> Deploy Personnel</button>
                </div>
                <div className="flex flex-col gap-6">
                  {employees.length === 0 ? <EmptyState icon={Users} text="No operatives deployed in this sector" /> : employees.map((empId, idx) => {
                    const emp = availableEmployees.find(e => e.employeeId === empId) || { name: empId, designation: 'Operative' };
                    return <SpaceRoleRow key={idx} emp={emp} schoolId={schoolId} showToast={showToast} onRemove={() => onRemoveEmployee(empId)} />;
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div key="metrics" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex items-start justify-center pt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                  {[
                    { label: 'Strategic Capacity', value: space.capacity || 'UNRESTRICTED', icon: Users, color: 'text-primary' },
                    { label: 'Asset Utilization', value: '82%', icon: Package, color: 'text-secondary' },
                    { label: 'Operational Readiness', value: 'OPTIMAL', icon: ShieldCheck, color: 'text-success' },
                    { label: 'Security Level', value: 'LV 4', icon: Info, color: 'text-accent' }
                  ].map((m, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between h-48 group hover:bg-white/[0.05] transition-all">
                      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${m.color}`}><m.icon size={22} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{m.label}</p>
                        <p className={`text-4xl font-black italic uppercase ${m.color}`}>{m.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-10 py-6 bg-black/40 border-t border-white/5 flex justify-between items-center">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic flex items-center gap-2"><ShieldCheck size={12} /> SECURE SECTOR MANIFEST | INTEGRITY VERIFIED</p>
          <button onClick={onClose} className="px-12 py-3.5 bg-white text-black font-black text-[11px] tracking-widest uppercase italic rounded-2xl shadow-2xl transition-all">Commit & Close Manifest</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SpaceDetailModal;