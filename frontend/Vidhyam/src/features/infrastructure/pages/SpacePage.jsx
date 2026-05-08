import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Plus, ChevronDown, ChevronRight, Loader, Search,
  CheckCircle, AlertTriangle, X, RefreshCw, Trash2, Package, Upload, Users, Briefcase,
  ExternalLink, MoreVertical, LayoutGrid, Info, ShieldCheck, DollarSign,
  Maximize2, Ruler, Layout, Activity, Edit3, Layers
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import FormWidget from '../../../components/ui/FormWidget';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import StandardButton from '../../../components/ui/StandardButton';
import SkeletonLoader from '../../../components/ui/SkeletonLoader';
import NoConnection from '../../../components/ui/NoConnection.jsx';
import BulkImportModal from '../../../components/ui/BulkImportModal';

import {
  useGetSpacesQuery,
  useGetSpaceCategoriesQuery,
  useCreateSpaceCategoryMutation,
  useDeleteSpaceCategoryMutation,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useGetResponsibilitiesQuery,
  useCreateResponsibilityMutation
} from '../infrastructureApi';
import { useGetEmployeesQuery } from '../../employees/api/employeeApi';

function SpacePage({ schoolId, pollingInterval }) {
  const { data: spacesData, isLoading: spacesLoading, isFetching: spacesFetching, refetch: refetchSpaces, error: spacesError } = useGetSpacesQuery(schoolId, { pollingInterval });
  const { data: categoriesData, isFetching: categoriesFetching, refetch: refetchCategories, error: categoriesError } = useGetSpaceCategoriesQuery(schoolId, { pollingInterval });
  
  const isOffline = spacesError?.status === 'FETCH_ERROR' || categoriesError?.status === 'FETCH_ERROR';

  const { data: responsibilitiesData } = useGetResponsibilitiesQuery(schoolId, { pollingInterval, skip: isOffline });
  const { data: employeesData } = useGetEmployeesQuery(schoolId, { pollingInterval, skip: isOffline });

  const [createSpaceCategory] = useCreateSpaceCategoryMutation();
  const [deleteSpaceCategory] = useDeleteSpaceCategoryMutation();
  const [createSpace] = useCreateSpaceMutation();
  const [updateSpace] = useUpdateSpaceMutation();
  const [deleteSpace] = useDeleteSpaceMutation();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryView, setShowCategoryView] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const { control, handleSubmit, reset } = useForm();

  const categoriesList = React.useMemo(() => 
    Array.from(new Set(categoriesData?.map(c => typeof c === 'string' ? c : (c.name || 'Unnamed')) || []))
  , [categoriesData]);

  const SPACE_SCHEMA = React.useMemo(() => [
    {
      id: 'general',
      label: 'Sector Definition',
      icon: Box,
      fields: [
        { name: 'spaceName', label: 'Space Identifier', type: 'text', required: true, labelIcon: Box, placeholder: 'e.g. Physics Lab A' },
        { 
          name: 'categoryName', 
          label: 'Infrastucture Class', 
          type: 'select', 
          options: categoriesList,
          required: true,
          labelIcon: Layout
        },
        { name: 'roomSize', label: 'Sector Dimensions', type: 'text', labelIcon: Ruler, placeholder: 'e.g. 40x60 sqft' },
        { name: 'description', label: 'Operational Description', type: 'textarea', placeholder: 'Define intended use...' },
      ]
    }
  ], [categoriesList]);

  const spaces = spacesData?.spaces || spacesData?.data || [];

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createSpaceCategory({ schoolId, body: { name: newCategoryName.trim() } }).unwrap();
      toast.success('Category provisioned');
      setNewCategoryName('');
    } catch (e) { toast.error('Creation failure'); }
  };

  const handleCreateSpace = async (data) => {
    try {
      await createSpace({ schoolId, body: data }).unwrap();
      toast.success('Sector Provisioned Successfully');
      setShowAddForm(false); reset();
    } catch (e) { toast.error('Provisioning failure'); }
  };

  const handleUpdateSpace = async (id, data) => {
    try {
      await updateSpace({ schoolId, spaceId: id, body: data }).unwrap();
      toast.success('Sector Protocol Updated');
      setEditingSpace(null); reset();
    } catch (e) { toast.error('Update failure'); }
  };

  const handleDeleteSpace = async (id) => {
    if (!window.confirm('Decommission this sector permanently?')) return;
    try {
      await deleteSpace({ schoolId, spaceId: id }).unwrap();
      toast.success('Sector Purged');
    } catch (e) { toast.error('Decommission failure'); }
  };

  const filtered = spaces.filter(s => {
    const name = s.spaceName || s.name || '';
    const cat = s.categoryName || s.category || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || cat.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (isOffline && !spaces.length) {
    return <NoConnection onRetry={refetchSpaces} />;
  }

  return (
    <div className="max-w-full p-1 space-y-2">
      <KPIWidget 
        columns={4} 
        gap="gap-2"
        kpis={[
          { label: "TOTAL_SECTORS", value: spaces.length, sub: "INFRA_NODES", icon: Layout, color: "primary" },
          { label: "ACTIVE_CLASSES", value: categoriesData?.length || 0, sub: "INFRA_TYPES", icon: Layers, color: "accent" },
          { label: "OPERATIONAL_LOAD", value: "OPTIMAL", sub: "NEURAL_HEALTH", icon: Activity, color: "success" },
          { label: "SYNC_STATUS", value: "ONLINE", sub: "HUB_CONNECTED", icon: ShieldCheck, color: "warning" }
        ]}
      />

      <div className="flex flex-col md:flex-row gap-2 items-center justify-between bg-white/5 p-1.5 rounded-xl border border-white/10">
         <div className="relative group w-full md:w-80">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-primary transition-colors" />
            <input 
              className="w-full bg-slate-900 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-micro text-white focus:outline-none focus:border-primary/50 transition-all font-black uppercase tracking-tight placeholder:text-slate-800" 
              placeholder="SCAN_SECTOR_IDENTIFIER..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
         </div>
         <div className="flex items-center gap-1">
            <StandardButton label="ADD_SECTOR" icon={Plus} size="xs" onClick={() => setShowAddForm(true)} />
            <StandardButton label="ARCHITECT" variant="ghost" icon={Layers} size="xs" onClick={() => setShowCategoryView(true)} />
            <StandardButton label="SYNC" variant="ghost" icon={Upload} size="xs" onClick={() => setBulkModalOpen(true)} />
         </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
         {spacesLoading ? (
            <div className="col-span-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
               {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonLoader key={i} variant="card" className="h-24" />)}
            </div>
         ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center glass-card border-dashed flex flex-col items-center justify-center opacity-30">
               <Box size={24} className="mb-2" />
               <p className="text-micro font-black uppercase tracking-[0.4em]">NO_RECORDS</p>
            </div>
         ) : (
           filtered.map((s, i) => (
             <GlassCard key={s.id || s.spaceId || i} hover delay={i * 0.01} className="group overflow-hidden flex flex-col h-full bg-white/[0.02]" glowColor="primary" dense>
                <div className="p-1 flex flex-col h-full">
                   <div className="flex items-start justify-between mb-1">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary transition-transform">
                      <Box size={12} />
                    </div>
                    <div className="flex gap-0.5">
                       <StandardButton variant="ghost" size="xs" icon={Edit3} onClick={() => setEditingSpace(s)} className="opacity-0 group-hover:opacity-100" />
                       <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => handleDeleteSpace(s.spaceId || s.id)} className="text-rose-500 opacity-0 group-hover:opacity-100" />
                    </div>
                   </div>
                   
                   <div className="space-y-0 mb-1">
                      <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest leading-none">{s.categoryName || 'GENERAL'}</span>
                      <h3 className="text-[9px] font-black text-white italic tracking-tighter uppercase truncate group-hover:text-primary transition-colors leading-tight">{s.spaceName || s.name}</h3>
                   </div>
 
                   <div className="mt-auto pt-1 border-t border-white/5 grid grid-cols-2 gap-1">
                      <div>
                         <p className="text-[7px] font-black text-slate-800 uppercase tracking-widest leading-none">CAP</p>
                         <div className="flex items-center gap-0.5 text-[8px] font-black text-slate-700 mt-0.5">
                            <Users size={6} className="text-primary/40" />
                            {s.capacity || '0'}U
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[7px] font-black text-slate-800 uppercase tracking-widest leading-none">DIM</p>
                         <div className="flex items-center justify-end gap-0.5 text-[8px] font-black text-slate-700 mt-0.5">
                            <Ruler size={6} className="text-accent/40" />
                            {s.roomSize || 'DEF'}
                         </div>
                      </div>
                   </div>
                </div>
             </GlassCard>
           ))
         )}
      </div>

      <AnimatePresence>
        {(showAddForm || editingSpace) && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
               onClick={() => { setShowAddForm(false); setEditingSpace(null); reset(); }}
             />
             <motion.div 
               initial={{ x: 100, opacity: 0 }} 
               animate={{ x: 0, opacity: 1 }} 
               exit={{ x: 100, opacity: 0 }} 
               className="relative w-full max-w-xl z-10 pointer-events-auto"
             >
                <FormWidget
                  title={editingSpace ? "MODIFY_SECTOR" : "PROVISION_SECTOR"}
                  description={editingSpace ? "Update internal parameters." : "Provision a new node."}
                  sections={SPACE_SCHEMA}
                  control={control}
                  onSubmit={handleSubmit(editingSpace ? (data) => handleUpdateSpace(editingSpace.id || editingSpace.spaceId, data) : handleCreateSpace)}
                  onCancel={() => { setShowAddForm(false); setEditingSpace(null); reset(); }}
                  submitLabel={editingSpace ? "COMMIT_NODE" : "INITIALIZE_PROVISION"}
                  dense
                />
             </motion.div>
          </div>
        )}

        {showCategoryView && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60">
               <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-2xl">
                 <GlassCard title="ARCHITECTURE_MANAGER" onClose={() => setShowCategoryView(false)} className="p-4" glowColor="accent" dense>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                       <div className="space-y-4">
                          <div>
                             <p className="text-micro font-black text-slate-800 uppercase tracking-widest mb-2">PROVISION_NEW_CLASS</p>
                             <div className="flex gap-2">
                                <input 
                                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-micro text-white focus:outline-none focus:border-primary/50 font-bold uppercase tracking-tight placeholder:text-slate-800" 
                                  placeholder="e.g. LABORATORY..." 
                                  value={newCategoryName} 
                                  onChange={e => setNewCategoryName(e.target.value)} 
                                />
                                <StandardButton icon={Plus} size="xs" onClick={handleCreateCategory} />
                             </div>
                          </div>
                          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                             <p className="text-micro text-primary font-black uppercase tracking-widest opacity-80 leading-relaxed">Infrastructure classes define the operational nature of sectors.</p>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <p className="text-micro font-black text-slate-800 uppercase tracking-widest">ACTIVE_CLASS_REGISTRY</p>
                          <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                             {categoriesData?.map((c, i) => (
                               <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                                  <span className="text-micro font-black text-white uppercase tracking-tighter italic">{typeof c === 'string' ? c : c.name}</span>
                                  <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => deleteSpaceCategory({ schoolId, categoryId: c.id || c })} className="text-rose-500 opacity-0 group-hover:opacity-100" />
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </GlassCard>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {bulkModalOpen && (
        <BulkImportModal
          type="spaces"
          schoolId={schoolId}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => { toast.success('Bulk Import Synchronized'); refetchSpaces(); }}
        />
      )}
    </div>
  );
}

export default SpacePage;