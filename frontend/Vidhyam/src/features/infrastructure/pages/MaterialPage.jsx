import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, AlertTriangle, Package, RefreshCw, DollarSign,
  Info, Trash2, X, Loader
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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

function MaterialPage({ schoolId, pollingInterval }) {
  const { data: materialsData } = useGetMaterialsQuery(schoolId, { pollingInterval });
  const materials = materialsData?.materials || [];

  const [addMaterial] = useAddMaterialMutation();
  const [editMaterial] = useEditMaterialMutation();
  const [deleteMaterialMutation] = useDeleteMaterialMutation();
  const [buyMaterial] = useBuyMaterialMutation();
  const [sellMaterial] = useSellMaterialMutation();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Inventory');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [transactionMaterial, setTransactionMaterial] = useState(null);
  const [transactionQty, setTransactionQty] = useState(1);
  const [transactionPrice, setTransactionPrice] = useState(0);
  const [viewingHistory, setViewingHistory] = useState(null);

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
        unitPrice: parseFloat(transactionPrice) || transactionMaterial.unitPrice
      };
      if (transactionType === 'buy') {
        await buyMaterial({ schoolId, materialId: transactionMaterial.id, body }).unwrap();
        showToast('success', 'Procurement order executed');
      } else {
        await sellMaterial({ schoolId, materialId: transactionMaterial.id, body }).unwrap();
        showToast('success', 'Distribution protocol executed');
      }
      setTransactionType('');
      setTransactionMaterial(null);
      setTransactionQty(1);
      setTransactionPrice(0);
    } catch (e) { showToast('error', e.data?.message || 'Transaction failed'); }
  };

  const showToast = (type, message) => {
    // This would typically use a toast notification library
    console.log(`${type}: ${message}`);
  };

  return (
    <div className="space-y-8">
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
        setFilter={setFilter}
      />

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
          onSubmit={(data) => handleUpdateMaterial(editingMaterial.id, data)}
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