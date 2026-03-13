import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Plus, ChevronDown, ChevronRight, Loader, Search,
  CheckCircle, AlertTriangle, X, RefreshCw, Trash2, Package, Upload, Users
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import BulkImportModal from '../../../components/ui/BulkImportModal';
import { 
  useGetSpacesQuery, 
  useGetSpaceCategoriesQuery, 
  useGetMaterialsQuery,
  useBulkImportSpacesMutation,
  useCreateSpaceCategoryMutation,
  useDeleteSpaceCategoryMutation,
  useGetSpaceDetailsQuery,
  useAssignSpaceMaterialsMutation,
  useAssignSpaceEmployeesMutation,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation
} from '../infrastructureApi';
import { useGetEmployeesQuery } from '../../employees/api/employeeApi';

const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
  return null;
};

export default function SpaceManagement() {
  const location = useLocation();
  const schoolId = getSchoolId();
  
  // RTK Query Hooks
  const { data: spacesData, isLoading: spacesLoading, isFetching: spacesFetching, refetch: refetchSpaces } = useGetSpacesQuery(schoolId);
  const { data: categoriesData, isFetching: categoriesFetching } = useGetSpaceCategoriesQuery(schoolId);
  const { data: materialsData } = useGetMaterialsQuery(schoolId);
  const { data: employeesData } = useGetEmployeesQuery(schoolId);

  const [createSpace] = useCreateSpaceMutation();
  const [updateSpace] = useUpdateSpaceMutation();
  const [deleteSpace] = useDeleteSpaceMutation();
  const [bulkImportSpaces] = useBulkImportSpacesMutation();
  const [createSpaceCategory] = useCreateSpaceCategoryMutation();
  const [deleteSpaceCategory] = useDeleteSpaceCategoryMutation();
  const [assignMaterials] = useAssignSpaceMaterialsMutation();
  const [assignEmployees] = useAssignSpaceEmployeesMutation();

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(new URLSearchParams(location.search).get('add') === '1');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') setShowAdd(true);
  }, [location.search]);

  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceCategory, setNewSpaceCategory] = useState('classroom');
  const [newSpaceCapacity, setNewSpaceCapacity] = useState('');
  
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deletingSpace, setDeletingSpace] = useState(null);

  const [showMaterialModal, setShowMaterialModal] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(null);
  
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQty, setMaterialQty] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const spaces = spacesData?.data || [];
  const categories = categoriesData?.data || [];
  const availableMaterials = materialsData?.data || [];
  const availableEmployees = employeesData?.data || [];

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    try {
      await createSpace({ 
        schoolId, 
        body: { 
          spaceName: newSpaceName.trim(), 
          spaceCategory: newSpaceCategory, 
          capacity: parseInt(newSpaceCapacity) || 0 
        } 
      }).unwrap();
      showToast('success', 'Space created');
      setNewSpaceName('');
      setShowAdd(false);
    } catch (e) { showToast('error', e.data?.message || 'Failed to create'); }
  };

  const handleUpdateSpace = async () => {
    if (!editingSpace) return;
    try {
      await updateSpace({ 
        schoolId, 
        spaceId: editingSpace.spaceId || editingSpace.id, 
        body: editingSpace 
      }).unwrap();
      showToast('success', 'Space updated');
      setEditingSpace(null);
    } catch (e) { showToast('error', e.data?.message || 'Failed to update'); }
  };

  const handleDeleteSpace = async () => {
    if (!deletingSpace) return;
    try {
      await deleteSpace({ schoolId, spaceId: deletingSpace.spaceId || deletingSpace.id }).unwrap();
      showToast('success', 'Space deleted');
      setDeletingSpace(null);
    } catch (e) { showToast('error', e.data?.message || 'Failed to delete'); }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createSpaceCategory({ schoolId, body: { name: newCategoryName.trim() } }).unwrap();
      showToast('success', 'Category added');
      setNewCategoryName('');
    } catch (e) { showToast('error', e.data?.message || 'Failed to add'); }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteSpaceCategory({ schoolId, categoryId: id }).unwrap();
      showToast('success', 'Category removed');
    } catch (e) { showToast('error', e.data?.message || 'Failed to remove'); }
  };

  const handleBulkSpacesImport = async (rows) => {
    try {
      await bulkImportSpaces({ schoolId, body: { spaces: rows } }).unwrap();
      showToast('success', 'Bulk import successful');
      setBulkModalOpen(false);
    } catch (e) { showToast('error', e.data?.message || 'Bulk import failed'); }
  };

  const assignMaterialHandler = async () => {
    if (!selectedMaterial || materialQty < 1) return;
    try {
      const mat = availableMaterials.find(m => m.id === selectedMaterial);
      if (!mat) return;
      
      const body = [{
        materialName: mat.materialName || mat.name,
        quantity: materialQty,
        unit: 'pcs'
      }];

      await assignMaterials({ schoolId, spaceId: showMaterialModal, body }).unwrap();
      showToast('success', 'Material assigned');
      setShowMaterialModal(null);
      setSelectedMaterial('');
      setMaterialQty(1);
    } catch (e) { showToast('error', e.data?.message || 'Failed to assign'); }
  };

  const assignEmployeeHandler = async () => {
    if (!selectedEmployee) return;
    try {
      await assignEmployees({ schoolId, spaceId: showEmployeeModal, body: [selectedEmployee] }).unwrap();
      showToast('success', 'Employee assigned');
      setShowEmployeeModal(null);
      setSelectedEmployee('');
    } catch (e) { showToast('error', e.data?.message || 'Failed to assign'); }
  };

  const filtered = spaces.filter(s =>
    (s.spaceName || s.space_name || s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
            <Box size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white uppercase tracking-tighter">Space & Facilities</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{spaces.length} ACTIVE MANIFESTS</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetchSpaces()} className={`btn-secondary p-2 ${spacesFetching ? 'animate-spin opacity-50' : ''}`}><RefreshCw size={14} /></button>
          <button onClick={() => setShowCategories(true)} className="btn-secondary flex items-center gap-2 group">
            <Package size={14} className="group-hover:text-violet-400 transition-colors" />
            <span className="text-xs font-bold">CATEGORIES</span>
          </button>
          <button onClick={() => setBulkModalOpen(true)} className="btn-secondary flex items-center gap-2 text-xs font-bold">
            <Upload size={14} /> BULK
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-2">
            <Plus size={16} /> 
            <span className="text-xs font-black uppercase italic">Provision New</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="relative group">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
          <input 
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all" 
            placeholder="FILTER BY SPACE NAME OR ID..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {spacesLoading ? (
          <div className="flex items-center justify-center py-24"><Loader size={32} className="animate-spin text-violet-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl border-dashed">
            <Box size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">NO CAPTURED INFRASTRUCTURE</p>
            <p className="text-slate-600 text-xs mt-1">Initialize your school layout to begin</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((space, i) => (
              <SpaceAccordionItem 
                key={space.id || space.spaceId || i}
                space={space} 
                index={i}
                schoolId={schoolId}
                isOpen={expanded === (space.id || space.spaceId)}
                onToggle={() => setExpanded(expanded === (space.id || space.spaceId) ? null : (space.id || space.spaceId))}
                onEdit={() => setEditingSpace(space)}
                onDelete={() => setDeletingSpace(space)}
                onAddMaterial={() => setShowMaterialModal(space.id || space.spaceId)}
                onAssignEmployee={() => setShowEmployeeModal(space.id || space.spaceId)}
                availableEmployees={availableEmployees}
                availableMaterials={availableMaterials}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white uppercase italic tracking-tighter">Initialize New Infrastructure</h3>
                <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="section-label">IDENTIFIER (Name)</label>
                  <input className="input-dark mt-1" placeholder="e.g. Science Lab B-12" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="section-label">CLASSIFICATION</label>
                    <select
                      className="input-dark mt-1 w-full"
                      value={newSpaceCategory}
                      onChange={e => setNewSpaceCategory(e.target.value)}
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>)}
                      {categories.length === 0 && <option value="classroom">CLASSROOM</option>}
                    </select>
                  </div>
                  <div>
                    <label className="section-label">NOMINAL CAPACITY</label>
                    <input type="number" className="input-dark mt-1" placeholder="0" value={newSpaceCapacity} onChange={e => setNewSpaceCapacity(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button onClick={() => setShowAdd(false)} className="btn-secondary px-6">CANCEL</button>
                <button onClick={handleCreateSpace} className="btn-primary px-8 py-2.5">
                  <span className="text-xs font-black uppercase italic">Provision Infrastructure</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSpace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setEditingSpace(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white uppercase italic tracking-tighter">Manifest Update</h3>
                <button onClick={() => setEditingSpace(null)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="section-label">IDENTIFIER</label>
                  <input className="input-dark mt-1" value={editingSpace.spaceName || editingSpace.name} onChange={e => setEditingSpace({ ...editingSpace, spaceName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="section-label">CLASSIFICATION</label>
                    <select
                      className="input-dark mt-1 w-full"
                      value={editingSpace.spaceCategory || 'classroom'}
                      onChange={e => setEditingSpace({ ...editingSpace, spaceCategory: e.target.value })}
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>)}
                      {categories.length === 0 && <option value="classroom">CLASSROOM</option>}
                    </select>
                  </div>
                  <div>
                    <label className="section-label">CAPACITY</label>
                    <input type="number" className="input-dark mt-1" value={editingSpace.capacity || 0} onChange={e => setEditingSpace({ ...editingSpace, capacity: parseInt(e.target.value) })} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button onClick={() => setEditingSpace(null)} className="btn-secondary px-6">CANCEL</button>
                <button onClick={handleUpdateSpace} className="btn-primary px-8">COMMIT CHANGES</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Modal */}
      <AnimatePresence>
        {showCategories && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowCategories(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white uppercase italic tracking-tighter">Space Classifications</h3>
                <button onClick={() => setShowCategories(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="flex gap-2 mb-6">
                <input className="input-dark py-2.5" placeholder="Define new classification..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button onClick={handleCreateCategory} className="btn-primary p-2.5 px-4"><Plus size={18} /></button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {categoriesFetching ? (
                  <div className="flex justify-center py-10"><Loader className="animate-spin text-violet-500" /></div>
                ) : categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                    <span className="text-xs font-bold text-slate-300 uppercase italic">{c.name} {c.isDefault && <span className="text-[10px] text-slate-500 ml-1">(SYSTEM DEFAULT)</span>}</span>
                    {!c.isDefault && (
                      <button onClick={() => handleDeleteCategory(c.id)} className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => setShowCategories(false)} className="btn-secondary px-6">CLOSE</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Material Modal */}
      <AnimatePresence>
        {showMaterialModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowMaterialModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white uppercase tracking-tighter italic">Inventory Assignment</h3>
                <button onClick={() => setShowMaterialModal(null)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="section-label">SELECT RESOURCE</label>
                  <select
                    className="input-dark mt-1 w-full"
                    value={selectedMaterial}
                    onChange={e => setSelectedMaterial(e.target.value)}
                  >
                    <option value="">-- SEARCH INVENTORY --</option>
                    {availableMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.materialName || m.name} (AVAIL: {m.quantity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="section-label">ALLOCATION QUANTITY</label>
                  <input type="number" min="1" className="input-dark mt-1 w-full" value={materialQty} onChange={e => setMaterialQty(parseInt(e.target.value) || 1)} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button onClick={() => setShowMaterialModal(null)} className="btn-secondary px-6">CANCEL</button>
                <button onClick={assignMaterialHandler} className="btn-primary px-8">ASSIGN ALLOCATION</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Employee Modal */}
      <AnimatePresence>
        {showEmployeeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowEmployeeModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white uppercase tracking-tighter italic">Personnel Assignment</h3>
                <button onClick={() => setShowEmployeeModal(null)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="section-label">SELECT OPERATIVE</label>
                  <select
                    className="input-dark mt-1 w-full"
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">-- SEARCH PERSONNEL --</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.employeeId} value={emp.employeeId}>{emp.name.toUpperCase()} [{emp.designation}]</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button onClick={() => setShowEmployeeModal(null)} className="btn-secondary px-6">CANCEL</button>
                <button onClick={assignEmployeeHandler} className="btn-primary px-8">SUBMIT ASSIGNMENT</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingSpace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setDeletingSpace(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <AlertTriangle className="text-rose-500" size={28} />
              </div>
              <h3 className="font-black text-white text-xl uppercase tracking-tighter italic">Decommission Space?</h3>
              <p className="text-slate-400 text-xs mt-3 mb-8 px-4 leading-relaxed font-bold uppercase tracking-wide">
                ARE YOU ABSOLUTELY SURE YOU WANT TO REMOVE <span className="text-rose-400">"{deletingSpace.spaceName || deletingSpace.name}"</span>? 
                THIS ACTION WILL PURGE THE MANIFEST IRREVERSIBLY.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDeletingSpace(null)} className="btn-secondary py-3 font-black text-[10px] tracking-widest">ABORT</button>
                <button onClick={handleDeleteSpace} className="btn-primary bg-rose-500 hover:bg-rose-600 border-rose-600 py-3 font-black text-[10px] tracking-widest">CONFIRM PURGE</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black tracking-widest shadow-2xl backdrop-blur-md border uppercase
              ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/20 border-rose-500/30 text-rose-400'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="BULK INFRASTRUCTURE PROVISIONING"
        expectedHeaders={['Space Name']}
        onImport={handleBulkSpacesImport}
      />
    </div>
  );
}

function SpaceAccordionItem({ 
  space, index, schoolId, isOpen, onToggle, onEdit, onDelete, 
  onAddMaterial, onAssignEmployee, availableEmployees, availableMaterials, showToast 
}) {
  const id = space.id || space.spaceId;
  const { data: detailsData, isFetching } = useGetSpaceDetailsQuery({ schoolId, spaceId: id }, { skip: !isOpen });
  const details = detailsData?.space || space;
  const items = details.materials || [];
  const employees = details.employees || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`glass-card overflow-hidden transition-all duration-300 ${isOpen ? 'ring-1 ring-violet-500/50 shadow-2xl shadow-violet-500/5' : ''}`}
    >
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.04] transition-colors ${isOpen ? 'bg-white/[0.04]' : ''}`} 
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-violet-400' : 'text-slate-600'}`}>
            <ChevronRight size={18} />
          </div>
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 group">
            <Box size={20} className="group-hover:scale-110 transition-transform" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-white text-sm uppercase italic tracking-tight">{space.spaceName || space.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{space.spaceCategory || 'UNCLASSIFIED'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-800" />
              <span className="text-[9px] font-mono text-slate-600">{id}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            {space.capacity > 0 && (
              <div className="px-2.5 py-1 rounded-full bg-blue-500/5 border border-blue-500/10 flex items-center gap-1.5">
                <Users size={10} className="text-blue-400" />
                <span className="text-[10px] font-black text-blue-400">{space.capacity}</span>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-full bg-violet-500/5 border border-violet-500/10 flex items-center gap-1.5">
              <Package size={10} className="text-violet-400" />
              <span className="text-[10px] font-black text-violet-400">{items.length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 border-l border-white/5 pl-2 ml-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="overflow-hidden border-t border-white/5 bg-black/20"
          >
            <div className="p-6 space-y-6">
              {isFetching && !detailsData ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <Loader size={24} className="animate-spin text-violet-500" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Hydrating Space Manifest...</p>
                </div>
              ) : (
                <>
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-violet-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Inventory & Materials</h4>
                      </div>
                      <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-all flex items-center gap-1.5" onClick={onAddMaterial}>
                        <Plus size={10} /> ADD ITEM
                      </button>
                    </div>
                    {items.length === 0 ? (
                      <div className="py-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl border-dashed">
                        <p className="text-slate-600 text-xs font-bold italic tracking-tight">No allocated inventory</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map((item, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center group hover:bg-white/[0.04] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-violet-400 transition-colors">
                                <Package size={14} />
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{item.materialName || item.itemName}</p>
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{item.id || 'GENERIC ITEM'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-white italic">{(item.quantity || 1)}</span>
                              <span className="text-[10px] text-slate-600 font-bold uppercase">{item.unit || 'pcs'}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-blue-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operational Personnel</h4>
                      </div>
                      <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1.5" onClick={onAssignEmployee}>
                        <Plus size={10} /> ASSIGN STAFF
                      </button>
                    </div>
                    {employees.length === 0 ? (
                      <div className="py-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl border-dashed">
                        <p className="text-slate-600 text-xs font-bold italic tracking-tight">Unattended facility</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {employees.map((empId, idx) => {
                          const emp = availableEmployees.find(e => e.employeeId === empId) || { name: empId, designation: 'Unknown' };
                          return (
                            <motion.div 
                              key={idx} 
                              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                              className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex justify-between items-center group hover:bg-white/[0.04] transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                  <Users size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white uppercase italic truncate max-w-[80px]">{emp.name}</p>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{emp.designation}</p>
                                </div>
                              </div>
                              <button className="text-slate-700 hover:text-rose-400 transition-colors p-1">
                                <X size={14} />
                              </button>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
