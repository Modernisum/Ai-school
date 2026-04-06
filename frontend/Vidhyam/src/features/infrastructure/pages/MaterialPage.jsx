import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, AlertTriangle, Package, RefreshCw, DollarSign,
  Info, Trash2, X, Loader, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  useGetMaterialsQuery,
  useAddMaterialMutation,
  useEditMaterialMutation,
  useDeleteMaterialMutation,
  useBuyMaterialMutation,
  useSellMaterialMutation,
  useGetMaterialHistoryQuery,
  useGetMaterialsDashboardQuery
} from '../infrastructureApi';

// Import components from the components directory
import MaterialsView from '../components/material/MaterialsView';
import MaterialCard from '../components/material/MaterialCard';
import MaterialFormModal from '../components/material/MaterialFormModal';
import TransactionModal from '../components/material/TransactionModal';
import MaterialHistoryModal from '../components/material/MaterialHistoryModal';
import NoConnection from '../../../components/ui/NoConnection.jsx';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

function MaterialPage({ schoolId, pollingInterval, showToast }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('All Inventory');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: materialsData, isFetching, refetch: refetchMaterials, error: materialsError } = useGetMaterialsQuery({ 
    schoolId, 
    search: debouncedSearch, 
    filter: filter === 'All Inventory' ? null : filter,
    page,
    limit
  }, { pollingInterval });

  const isOffline = materialsError?.status === 'FETCH_ERROR';
  const materials = materialsData?.data || [];
  const metadata = materialsData?.metadata || { totalCount: 0, totalPages: 1 };

  const [addMaterial] = useAddMaterialMutation();
  const [editMaterial] = useEditMaterialMutation();
  const [deleteMaterialMutation] = useDeleteMaterialMutation();
  const [buyMaterial] = useBuyMaterialMutation();
  const [sellMaterial] = useSellMaterialMutation();

  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [transactionMaterial, setTransactionMaterial] = useState(null);
  const [transactionQty, setTransactionQty] = useState(1);
  const [transactionPrice, setTransactionPrice] = useState(0);
  const [viewingHistory, setViewingHistory] = useState(null);

  const handleRetry = () => {
    refetchMaterials();
  };

  if (isOffline && !materials.length) {
    return <NoConnection onRetry={handleRetry} />;
  }

  const handleCreateMaterial = async (data) => {
    try {
      await addMaterial({ schoolId, body: data }).unwrap();
      showToast('success', 'Material added to inventory');
      setIsAddingMaterial(false);
    } catch (e) { showToast('error', e.data?.message || 'Failed to add material'); }
  };

  const handleUpdateMaterial = async (id, data) => {
    try {
      await editMaterial({ schoolId, materialId: id, body: data }).unwrap();
      showToast('success', 'Material updated');
      setEditingMaterial(null);
    } catch (e) { showToast('error', e.data?.message || 'Failed to update material'); }
  };

  const handleDeleteMaterial = async (id) => {
    try {
      await deleteMaterialMutation({ schoolId, materialId: id }).unwrap();
      showToast('success', 'Material purged from inventory');
    } catch (e) { showToast('error', e.data?.message || 'Failed to purge material'); }
  };

  const handleTransaction = async () => {
    if (!transactionMaterial || transactionQty < 1) return;
    try {
      const body = {
        quantity: parseInt(transactionQty),
        unitPrice: parseFloat(transactionPrice) || transactionMaterial.unitPrice,
        notes: transactionType === 'buy' ? "Inventory Purchase" : "Internal distribution"
      };
      if (transactionType === 'buy') {
        await buyMaterial({ schoolId, materialId: transactionMaterial.materialName, body }).unwrap();
        showToast('success', 'Procurement order executed');
      } else {
        await sellMaterial({ schoolId, materialId: transactionMaterial.materialName, body }).unwrap();
        showToast('success', 'Distribution protocol executed');
      }
      setTransactionType('');
      setTransactionMaterial(null);
      setTransactionQty(1);
      setTransactionPrice(0);
    } catch (e) { showToast('error', e.data?.message || 'Transaction failed'); }
  };

  return (
    <div className="space-y-8">
      {isOffline && (
        <div className="px-6">
          <NoConnection compact onRetry={handleRetry} />
        </div>
      )}
      <MaterialsView
        materials={materials}
        schoolId={schoolId}
        onAdd={() => setIsAddingMaterial(true)}
        onEdit={setEditingMaterial}
        onDelete={handleDeleteMaterial}
        onBuy={(m) => { setTransactionType('buy'); setTransactionMaterial(m); setTransactionPrice(m.unitPrice); }}
        onSell={(m) => { setTransactionType('sell'); setTransactionMaterial(m); setTransactionPrice(m.unitPrice); }}
        onViewHistory={setViewingHistory}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={(f) => { setFilter(f); setPage(1); }}
        isFetching={isFetching}
      />

      {/* Pagination Controls */}
      {metadata.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pb-12">
          <button 
            disabled={page === 1 || isFetching}
            onClick={() => setPage(p => p - 1)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
            Command Page {page} of {metadata.totalPages}
          </span>
          <button 
            disabled={page === metadata.totalPages || isFetching}
            onClick={() => setPage(p => p + 1)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Modals */}
      {isAddingMaterial && (
        <MaterialFormModal
          onClose={() => setIsAddingMaterial(false)}
          onSubmit={handleCreateMaterial}
        />
      )}
      {editingMaterial && (
        <MaterialFormModal
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSubmit={(data) => handleUpdateMaterial(editingMaterial.materialName, data)}
        />
      )}
      {transactionType && (
        <TransactionModal
          type={transactionType}
          material={transactionMaterial}
          qty={transactionQty}
          price={transactionPrice}
          setQty={setTransactionQty}
          setPrice={setTransactionPrice}
          onClose={() => { setTransactionType(''); setTransactionMaterial(null); setTransactionQty(1); setTransactionPrice(0); }}
          onSubmit={handleTransaction}
        />
      )}
      {viewingHistory && (
        <MaterialHistoryModal
          material={viewingHistory}
          schoolId={schoolId}
          onClose={() => setViewingHistory(null)}
        />
      )}
    </div>
  );
}

export default MaterialPage;