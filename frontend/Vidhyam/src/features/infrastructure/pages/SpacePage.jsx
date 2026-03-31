import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Plus, ChevronDown, ChevronRight, Loader, Search,
  CheckCircle, AlertTriangle, X, RefreshCw, Trash2, Package, Upload, Users, Briefcase,
  ExternalLink, MoreVertical, LayoutGrid, Info, ShieldCheck, DollarSign
} from 'lucide-react';
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
import BulkImportModal from '../../../components/ui/BulkImportModal';
import SpaceCard from '../components/space/SpaceCard';
import AddSpaceCard from '../components/space/AddSpaceCard';
import SpaceDetailModal from '../components/space/SpaceDetailModal';
import SpaceRoleRow from '../components/space/SpaceRoleRow';
import EmptyState from '../components/space/EmptyState';

function SpacePage({ schoolId, pollingInterval }) {
  const { data: spacesData, isLoading: spacesLoading, isFetching: spacesFetching, refetch: refetchSpaces } = useGetSpacesQuery(schoolId, { pollingInterval });
  const { data: categoriesData, isFetching: categoriesFetching } = useGetSpaceCategoriesQuery(schoolId, { pollingInterval });
  const { data: responsibilitiesData } = useGetResponsibilitiesQuery(schoolId, { pollingInterval });
  const { data: employeesData } = useGetEmployeesQuery(schoolId, { pollingInterval });

  const [createSpaceCategory] = useCreateSpaceCategoryMutation();
  const [deleteSpaceCategory] = useDeleteSpaceCategoryMutation();
  const [createSpace] = useCreateSpaceMutation();
  const [updateSpace] = useUpdateSpaceMutation();
  const [deleteSpace] = useDeleteSpaceMutation();
  const [createResponsibility] = useCreateResponsibilityMutation();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryView, setShowCategoryView] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [deletingSpace, setDeletingSpace] = useState(null);
  const [showSpaceDetail, setShowSpaceDetail] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const spaces = spacesData?.spaces || [];
  const categories = categoriesData?.categories || [];
  const availableEmployees = employeesData?.employees || [];

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createSpaceCategory({ schoolId, body: { name: newCategoryName.trim() } }).unwrap();
      showToast('success', 'Category provisioned');
      setNewCategoryName('');
    } catch (e) { showToast('error', e.data?.message || 'Failed to create category'); }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteSpaceCategory({ schoolId, categoryId: id }).unwrap();
      showToast('success', 'Category removed');
    } catch (e) { showToast('error', e.data?.message || 'Failed to remove'); }
  };

  const handleCreateSpace = async (data) => {
    try {
      await createSpace({ schoolId, body: data }).unwrap();
      showToast('success', 'Space provisioned');
      setIsAddingSpace(false);
    } catch (e) { showToast('error', e.data?.message || 'Failed to provision space'); }
  };

  const handleUpdateSpace = async (id, data) => {
    try {
      await updateSpace({ schoolId, spaceId: id, body: data }).unwrap();
      showToast('success', 'Space updated');
      setEditingSpace(null);
    } catch (e) { showToast('error', e.data?.message || 'Failed to update space'); }
  };

  const handleDeleteSpace = async () => {
    if (!deletingSpace) return;
    try {
      await deleteSpace({ schoolId, spaceId: deletingSpace.spaceId || deletingSpace.id }).unwrap();
      showToast('success', 'Space deleted');
      setDeletingSpace(null);
    } catch (e) { showToast('error', e.data?.message || 'Failed to delete space'); }
  };

  const showToast = (type, message) => {
    // This would typically use a toast notification library
    console.log(`${type}: ${message}`);
  };

  const filtered = spaces.filter(s => {
    const name = s.spaceName || s.space_name || s.name || '';
    const cat = s.categoryName || s.category_name || s.category || s.spaceCategory || '';
    
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || cat.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categoriesList = categories?.map(c => c.name || 'Unnamed');

  return (
    <div className="space-y-6">
      {/* Category Scroller */}
      <div className="px-6 py-2 bg-white/[0.02] border-b border-white/5 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2">
        {categoriesList?.map(cat => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setShowCategoryView(false); }}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
              selectedCategory === cat && !showCategoryView
                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setShowCategoryView(true)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
            showCategoryView ? 'text-primary' : 'text-slate-500 hover:text-primary'
          }`}
        >
          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
            showCategoryView ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-white/10 group-hover:border-primary/30'
          }`}>
            <Plus size={10} />
          </div>
          ADD CATEGORY
        </button>

        <div className="w-px h-4 bg-white/10 mx-2 flex-shrink-0" />

        <button 
          onClick={() => setBulkModalOpen(true)} 
          className="whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <Upload size={13} /> BULK IMPORT
        </button>

        <button 
          onClick={() => refetchSpaces()} 
          className={`whitespace-nowrap p-1.5 rounded-xl text-slate-500 hover:text-primary transition-colors ${spacesFetching ? 'animate-spin opacity-50' : ''}`}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {showCategoryView ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8 py-4">
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Category Architecture</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Manage infrastructure classifications</p>
                </div>
                <button onClick={() => setShowCategoryView(false)} className="btn-secondary px-6 text-[10px]">BACK TO MANIFEST</button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4">
                   <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Provision New Class</p>
                      <input 
                        className="input-dark py-3 text-xs" 
                        placeholder="e.g. Laboratory, Workshop..." 
                        value={newCategoryName} 
                        onChange={e => setNewCategoryName(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                      />
                      <button onClick={handleCreateCategory} className="btn-primary w-full mt-4 py-3 text-[10px] font-black uppercase tracking-widest italic">Initialize Class</button>
                   </div>
                   
                   <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                      <Info size={20} className="text-primary mb-3" />
                      <p className="text-[10px] text-primary font-bold uppercase tracking-wide leading-relaxed">
                        Categories define the operational nature of your spaces. Use clear, distinct names for better infrastructure mapping.
                      </p>
                   </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Classifications</p>
                   {categoriesFetching ? (
                     <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32} /></div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories?.map(c => (
                          <div key={c.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all">
                             <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                <span className="text-xs font-black text-white uppercase italic tracking-tight">{c.name}</span>
                                {c.isDefault && <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">System</span>}
                             </div>
                             {!c.isDefault && (
                               <button onClick={() => handleDeleteCategory(c.id)} className="p-2 text-slate-700 hover:text-accent transition-colors">
                                 <Trash2 size={14} />
                               </button>
                             )}
                          </div>
                        ))}
                     </div>
                   )}
                </div>
             </div>
          </motion.div>
        ) : (
          <>
            <div className="relative group">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input 
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-primary/5 transition-all shadow-inner" 
                placeholder="FILTER BY SPACE NAME OR IDENTIFIER..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>

            {spacesLoading ? (
              <div className="flex items-center justify-center py-24"><Loader size={32} className="animate-spin text-primary" /></div>
            ) : (!selectedCategory && filtered.length === 0) ? (
              <div className="text-center py-32 bg-white/[0.01] border border-white/5 rounded-3xl border-dashed">
                <LayoutGrid size={48} className="text-slate-800 mx-auto mb-4 opacity-50" />
                <p className="text-slate-500 font-black text-xs uppercase tracking-widest">No matching infrastructure</p>
                <p className="text-slate-600 text-[10px] uppercase mt-2 opacity-60 italic tracking-tighter">— Adjust filters or provision new —</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AddSpaceCard 
                  selectedCategory={selectedCategory}
                  categories={categories}
                  responsibilities={responsibilitiesData?.data || []}
                  availableMaterials={[]}
                  spaces={spaces}
                  onCreateResponsibility={async (name) => {
                    const res = await createResponsibility({ schoolId, body: { name } }).unwrap();
                    return res?.data;
                  }}
                  onProvision={(data) => {
                    handleCreateSpace({
                      spaceName: undefined,
                      categoryId: data.categoryId,
                      capacity: data.capacity,
                      requirements: data.requirements,
                      materialRequirements: data.materialRequirements,
                      materials: data.materials
                    });
                  }}
                  isExpanded={isAddingSpace}
                  setIsExpanded={setIsAddingSpace}
                />
                {filtered?.map((space, i) => (
                  <SpaceCard 
                    key={space.id || space.spaceId || i}
                    space={space} 
                    onEdit={() => setEditingSpace(space)}
                    onDelete={() => setDeletingSpace(space)}
                    onManage={() => setShowSpaceDetail(space)}
                  />
                ))}
                {filtered.length === 0 && !selectedCategory && (
                   <p className="col-span-full py-20 text-center text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em]">No records found</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {bulkModalOpen && (
        <BulkImportModal
          type="spaces"
          schoolId={schoolId}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => {
            showToast('success', 'Bulk import completed');
            refetchSpaces();
          }}
        />
      )}

      {editingSpace && (
        <div className="modal-overlay" onClick={() => setEditingSpace(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="border border-white/10 rounded-[3rem] p-12 w-full max-w-lg shadow-2xl shadow-black/80" style={{ backgroundColor: 'var(--dark-bg-1)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Update Space</h3>
              <button onClick={() => setEditingSpace(null)} className="p-3 text-slate-500 hover:text-white bg-white/5 rounded-2xl"><X size={24} /></button>
            </div>
            <div className="space-y-8">
              <div><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block italic">Space Name</label><input className="input-dark py-5 text-base uppercase font-black italic shadow-inner" placeholder="e.g. MAIN HALL..." defaultValue={editingSpace.spaceName || editingSpace.name} /></div>
              <div><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block italic">Category</label><select className="input-dark py-5 text-base uppercase font-black italic"><option>{editingSpace.categoryName || editingSpace.category}</option></select></div>
              <button onClick={() => handleUpdateSpace(editingSpace.id || editingSpace.spaceId, {})} className="btn-primary w-full py-6 text-[12px] font-black uppercase tracking-[0.3em] italic mt-4 shadow-2xl shadow-primary/30">COMMIT UPDATE</button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {deletingSpace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setDeletingSpace(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="border border-white/10 rounded-[3rem] p-12 w-full max-w-lg shadow-2xl shadow-black/80" style={{ backgroundColor: 'var(--dark-bg-1)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                <h3 className="text-3xl font-black text-accent italic uppercase tracking-tighter">Purge Infrastructure</h3>
                <button onClick={() => setDeletingSpace(null)} className="p-3 text-slate-500 hover:text-white bg-white/5 rounded-2xl"><X size={24} /></button>
              </div>
              <div className="space-y-8">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                  This will permanently delete <span className="text-accent font-black">{deletingSpace.spaceName || deletingSpace.name}</span> and all associated data. This action cannot be undone.
                </p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setDeletingSpace(null)} className="btn-secondary flex-1 py-4 text-[10px] font-black uppercase tracking-widest">ABORT</button>
                  <button onClick={handleDeleteSpace} className="btn-primary bg-accent hover:brightness-110 border-accent/40 py-4 flex-1 font-black text-[10px] tracking-widest">CONFIRM PURGE</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showSpaceDetail && (
        <SpaceDetailModal
          space={showSpaceDetail}
          schoolId={schoolId}
          onClose={() => setShowSpaceDetail(null)}
          showToast={showToast}
          availableEmployees={availableEmployees}
          availableMaterials={[]}
          onAddMaterial={() => {}}
          onAssignEmployee={() => {}}
          onRemoveEmployee={(empId) => {
            // This would need to be implemented with the appropriate mutation
            console.log('Remove employee:', empId);
          }}
        />
      )}
    </div>
  );
}

export default SpacePage;