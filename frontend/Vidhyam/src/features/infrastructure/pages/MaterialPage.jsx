import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, AlertTriangle, Package, RefreshCw, DollarSign,
  Info, Trash2, X, Loader, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, ListOrdered, Edit3, Shield, Activity
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import FormWidget from '../../../components/ui/FormWidget';
import GlassCard from '../../../components/ui/GlassCard';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import StandardButton from '../../../components/ui/StandardButton';
import NoConnection from '../../../components/ui/NoConnection.jsx';

import {
  useGetMaterialsQuery,
  useAddMaterialMutation,
  useEditMaterialMutation,
  useDeleteMaterialMutation,
  useBuyMaterialMutation,
  useSellMaterialMutation,
  useGetMaterialsDashboardQuery
} from '../infrastructureApi';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(amount || 0);
};

function MaterialPage({ schoolId, pollingInterval }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('All Inventory');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: materialsData, isFetching, refetch: refetchMaterials, error: materialsError } = useGetMaterialsQuery({ 
    schoolId, search: debouncedSearch, filter: filter === 'All Inventory' ? null : filter, page, limit
  }, { pollingInterval });

  const isOffline = materialsError?.status === 'FETCH_ERROR' || materialsError?.status === 404;
  const materials = materialsData?.data || [];
  const metadata = materialsData?.metadata || { totalCount: 0, totalPages: 1 };

  const [addMaterial] = useAddMaterialMutation();
  const [editMaterial] = useEditMaterialMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();
  const [buyMaterial] = useBuyMaterialMutation();
  const [sellMaterial] = useSellMaterialMutation();

  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [transactionMaterial, setTransactionMaterial] = useState(null);

  const { control: materialControl, handleSubmit: handleMaterialSubmit, reset: resetMaterial } = useForm();
  const { control: transactionControl, handleSubmit: handleTransactionSubmit, watch: watchTransaction, setValue: setTransactionValue } = useForm();

  const transactionQty = watchTransaction('quantity') || 0;
  const transactionPriceInput = watchTransaction('unitPrice') || 0;

  const MATERIAL_SCHEMA = React.useMemo(() => [
    {
      id: 'main',
      label: 'Inventory Specs',
      icon: Package,
      fields: [
        { name: 'materialName', label: 'Material Name', type: 'text', required: true, labelIcon: Package, placeholder: 'e.g. Science Beakers' },
        { name: 'unitPrice', label: 'Unit Price (₹)', type: 'number', required: true, labelIcon: DollarSign, placeholder: '0.00' },
        { name: 'quantity', label: 'Initial Quantity', type: 'number', required: true, labelIcon: ListOrdered, placeholder: '0' },
      ]
    }
  ], []);

  const TRANSACTION_SCHEMA = React.useMemo(() => [
    {
      id: 'tx',
      label: 'Transaction Details',
      icon: RefreshCw,
      fields: [
        { name: 'quantity', label: 'Quantity', type: 'number', required: true, labelIcon: ListOrdered, placeholder: 'Enter amount...' },
        { name: 'unitPrice', label: 'Price per Unit (₹)', type: 'number', required: true, labelIcon: DollarSign, placeholder: 'Enter price...' },
        {
          name: 'total',
          label: 'Total Amount',
          type: 'custom',
          render: () => (
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
              <span className="text-micro font-black text-slate-700 uppercase tracking-widest leading-none">Calculated Total</span>
              <span className="text-sm font-black text-white italic transition-all">₹{(transactionQty * transactionPriceInput).toFixed(2)}</span>
            </div>
          )
        }
      ]
    }
  ], [transactionQty, transactionPriceInput]);

  const handleCreateMaterial = async (data) => {
    try {
      await addMaterial({ schoolId, body: data }).unwrap();
      toast.success('Material Provisioned Successfully');
      setIsAddingMaterial(false); resetMaterial();
    } catch (e) { toast.error('Provisioning failure'); }
  };

  const handleUpdateMaterial = async (id, data) => {
    try {
      await editMaterial({ schoolId, materialId: id, body: data }).unwrap();
      toast.success('Inventory Protocol Updated');
      setEditingMaterial(null);
    } catch (e) { toast.error('Update failure'); }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Purge this resource from the manifest?')) return;
    try {
      await deleteMaterial({ schoolId, materialId: id }).unwrap();
      toast.success('Resource Purged');
    } catch (e) { toast.error('Purge failure'); }
  };

  const onTransactionSubmit = async (data) => {
    if (!transactionMaterial) return;
    try {
      const body = {
        quantity: parseInt(data.quantity),
        unitPrice: parseFloat(data.unitPrice),
        notes: transactionType === 'buy' ? "Procurement" : "Distribution"
      };
      if (transactionType === 'buy') {
        await buyMaterial({ schoolId, materialId: transactionMaterial.materialName, body }).unwrap();
        toast.success('Procurement Protocol Executed');
      } else {
        await sellMaterial({ schoolId, materialId: transactionMaterial.materialName, body }).unwrap();
        toast.success('Distribution Protocol Executed');
      }
      setTransactionType(''); setTransactionMaterial(null);
    } catch (e) { toast.error('Execution failure'); }
  };

  return (
    <div className="max-w-full p-1 space-y-2">
      <KPIWidget columns={4} dense>
         <KPITile label="TOTAL_ASSETS" value={metadata.totalCount} sub="RESOURCE_INVENTORY" icon={Package} color="primary" />
         <KPITile label="PROCUREMENTS" value="ACTIVE" sub="SUPPLY_CHAIN" icon={ArrowDownRight} color="success" />
         <KPITile label="DISTRIBUTIONS" value="LOGGED" sub="INTERNAL_RELEASE" icon={ArrowUpRight} color="accent" />
         <KPITile label="REGISTRY_HEALTH" value="SECURED" icon={Shield} color="warning" />
      </KPIWidget>

      <div className="flex flex-col md:flex-row gap-1 items-center justify-between bg-white/[0.02] p-1 rounded-xl border border-white/5">
         <div className="relative group w-full md:w-80">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-primary transition-colors" />
            <input 
              className="w-full bg-slate-900 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-micro text-white focus:outline-none focus:border-primary/50 transition-all font-black uppercase tracking-tight placeholder:text-slate-800" 
              placeholder="SCAN_RESOURCE_LEDGER..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
         </div>
         <div className="flex items-center gap-1">
            <StandardButton label="ADD_ASSET" icon={Plus} size="xs" onClick={() => { setIsAddingMaterial(true); resetMaterial({}); }} />
            <StandardButton variant="ghost" icon={RefreshCw} size="xs" onClick={refetchMaterials} className={isFetching ? 'animate-spin' : ''} />
         </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
         {isFetching && page === 1 ? (
           <div className="col-span-full py-16 flex justify-center"><Loader size={14} className="animate-spin text-primary" /></div>
         ) : materials.length === 0 ? (
           <div className="col-span-full py-12 text-center glass-card border-dashed opacity-30">
              <Package size={24} className="mb-2 mx-auto" />
              <p className="text-micro font-black uppercase tracking-[0.4em]">NO_RECORDS</p>
           </div>
         ) : (
           materials.map((m, i) => (
              <GlassCard key={i} hover delay={i * 0.01} className="group flex flex-col h-full bg-white/[0.02]" glowColor="primary" dense>
                <div className="p-1 flex flex-col h-full">
                   <div className="flex items-start justify-between mb-1">
                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary transition-transform">
                      <Package size={10} />
                    </div>
                    <div className="flex gap-0.5">
                       <StandardButton variant="ghost" size="xs" icon={Edit3} onClick={() => { setEditingMaterial(m); resetMaterial(m); }} className="opacity-0 group-hover:opacity-100" />
                       <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => handleDeleteMaterial(m.materialName)} className="text-rose-500 opacity-0 group-hover:opacity-100" />
                    </div>
                   </div>
 
                   <div className="space-y-0 mb-1">
                      <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest leading-none">{m.unitPrice ? formatCurrency(m.unitPrice) : '—'}</span>
                      <h3 className="text-[9px] font-black text-white italic tracking-tighter uppercase truncate leading-tight">{m.materialName}</h3>
                   </div>
 
                   <div className="mt-auto pt-1 border-t border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                         <p className="text-[7px] font-black text-slate-800 uppercase tracking-widest leading-none">STOCK</p>
                         <span className={`text-[8px] font-black italic leading-none ${m.quantity < 10 ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`}>{m.quantity}U</span>
                      </div>
                      <div className="flex gap-1">
                         <StandardButton label="IN" size="xs" className="flex-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/10" onClick={() => { setTransactionType('buy'); setTransactionMaterial(m); setTransactionValue('quantity', 1); setTransactionValue('unitPrice', m.unitPrice); }} />
                         <StandardButton label="OUT" size="xs" className="flex-1 bg-amber-500/10 text-amber-500 border-amber-500/10" onClick={() => { setTransactionType('sell'); setTransactionMaterial(m); setTransactionValue('quantity', 1); setTransactionValue('unitPrice', m.unitPrice); }} />
                      </div>
                   </div>
                </div>
              </GlassCard>
            ))
         )}
      </div>

      {metadata.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <StandardButton icon={ChevronLeft} variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Page {page} / {metadata.totalPages}</span>
          <StandardButton icon={ChevronRight} variant="ghost" disabled={page === metadata.totalPages} onClick={() => setPage(p => p + 1)} />
        </div>
      )}

      <AnimatePresence>
        {(isAddingMaterial || editingMaterial) && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
               onClick={() => { setIsAddingMaterial(false); setEditingMaterial(null); }}
             />
             <motion.div 
               initial={{ x: 100, opacity: 0 }} 
               animate={{ x: 0, opacity: 1 }} 
               exit={{ x: 100, opacity: 0 }}
               className="relative w-full max-w-xl z-10 pointer-events-auto"
             >
                <FormWidget
                  title={editingMaterial ? "UPDATE_ASSET" : "PROVISION_ASSET"}
                  description={editingMaterial ? "Modify the record." : "Create a new entry."}
                  sections={MATERIAL_SCHEMA}
                  control={materialControl}
                  onSubmit={handleMaterialSubmit(editingMaterial ? (data) => handleUpdateMaterial(editingMaterial.materialName, data) : handleCreateMaterial)}
                  onCancel={() => { setIsAddingMaterial(false); setEditingMaterial(null); }}
                  submitLabel={editingMaterial ? "COMMIT_OVERRIDE" : "INITIALIZE_NODE"}
                  dense
                />
             </motion.div>
          </div>
        )}

        {transactionType && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
               onClick={() => setTransactionType('')}
             />
             <motion.div 
               initial={{ x: 100, opacity: 0 }} 
               animate={{ x: 0, opacity: 1 }} 
               exit={{ x: 100, opacity: 0 }}
               className="relative w-full max-w-xl z-10 pointer-events-auto"
             >
                <FormWidget
                  title={transactionType === 'buy' ? "PROCUREMENT_ORDER" : "DISTRIBUTION_PROTOCOL"}
                  description={`Node: ${transactionMaterial?.materialName}`}
                  sections={TRANSACTION_SCHEMA}
                  control={transactionControl}
                  onSubmit={handleTransactionSubmit(onTransactionSubmit)}
                  onCancel={() => setTransactionType('')}
                  submitLabel="EXECUTE_TRANSACTION"
                  dense
                />
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MaterialPage;