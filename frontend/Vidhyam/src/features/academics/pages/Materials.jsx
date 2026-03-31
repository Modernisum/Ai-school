import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { selectPollingInterval } from '../../settings/settingsSlice';
import {
  Plus, Edit3, Trash2, Save, X, Loader, CheckCircle, AlertTriangle,
  Package, ShoppingCart, TrendingUp, TrendingDown, History, DollarSign,
  Settings, ArrowLeft, Home, Eye, Search, Filter, Calendar, Clock,
  Layers, Box, BarChart3, PieChart, Activity, RefreshCw, Download, Upload
} from 'lucide-react';
import BulkImportModal from '../../../components/ui/BulkImportModal';
import {
  useGetMaterialsQuery,
  useAddMaterialMutation,
  useEditMaterialMutation,
  useDeleteMaterialMutation,
  useBuyMaterialMutation,
  useSellMaterialMutation,
  useBulkImportMaterialsMutation,
  useGetMaterialHistoryQuery,
} from '../api/academicApi';

// --- API Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAX_RETRIES = 3;

// **AUTO School ID Management**
const getSchoolIdFromStorage = () => {
  try {
    const possibleKeys = [
      'schoolId', 'school_id', 'currentSchoolId', 'selectedSchoolId', 'userSchoolId', 'SCHOOL_ID'
    ];
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
        return value.trim();
      }
    }
    const userData = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.schoolId) return parsed.schoolId;
        if (parsed.school_id) return parsed.school_id;
      } catch (e) { }
    }
    return null;
  } catch (error) {
    console.error('Error reading School ID from localStorage:', error);
    return null;
  }
};

const DEFAULT_SCHOOL_ID = "";

// Helper Functions
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date)) return 'Invalid Date';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const callApiWithBackoff = async (apiUrl, options = {}) => {
  let lastError = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      if (i > 0) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(apiUrl, options);
      const responseClone = response.clone();

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || `HTTP Error ${response.status}`;
        } catch {
          errorText = await responseClone.text();
        }
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (i === MAX_RETRIES - 1) {
        throw new Error(`${lastError.message}`);
      }
    }
  }
};

// Material Card Component
const MaterialCard = ({ material, onEdit, onDelete, onBuy, onSell, onViewHistory }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(material.materialName);
  const [editPrice, setEditPrice] = useState(material.unitPrice);

  const stockPercentage = material.quantity > 0 ? (material.extraUnit / material.quantity) * 100 : 0;
  const isLowStock = stockPercentage < 20;
  const isOutOfStock = material.extraUnit <= 0;

  const handleSave = () => {
    onEdit(material.id, {
      newMaterialName: editName,
      unitPrice: parseFloat(editPrice)
    });
    setIsEditing(false);
  };

  const getStockStatusColor = () => {
    if (isOutOfStock) return 'text-accent bg-accent/20 border-accent/30';
    if (isLowStock) return 'text-warning bg-warning/20 border-warning/30';
    return 'text-success bg-success/20 border-success/30';
  };

  return (
    <div className="glass-card p-0 border border-white/5 bg-slate-900/40 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group hover:border-white/10 relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />
      {/* Material Header */}
      <div className="p-5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                <Package size={24} />
              </div>
              {isOutOfStock && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent border-2 border-slate-900 rounded-full"></div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950/50 border border-white/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-white outline-none w-full"
                />
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950/50 border border-white/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-white outline-none w-full"
                  step="0.01"
                  placeholder="Unit Price"
                />
                <div className="flex items-center space-x-2 mt-2">
                  <button onClick={handleSave} className="flex-1 py-1.5 flex justify-center items-center text-success bg-success/10 hover:bg-success/20 border border-success/20 rounded-lg transition-colors">
                    <Save size={16} />
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-1.5 flex justify-center items-center text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{material.materialName}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">ID: {material.id}</p>
                <p className="text-sm font-bold text-success mt-1">{formatCurrency(material.unitPrice)}<span className="text-xs font-medium text-slate-500">/unit</span></p>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getStockStatusColor()}`}>
              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
            </div>
            <p className="text-xl font-black text-white mt-2 leading-none">
              {material.extraUnit} <span className="text-sm text-slate-500 font-medium">/ {material.quantity}</span>
            </p>
            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1 tracking-wider">Available</p>
          </div>
        </div>

        {/* Stock Progress Bar */}
        <div className="mt-5">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isOutOfStock ? 'bg-accent' : isLowStock ? 'bg-warning' : 'bg-success'
                }`}
              style={{ width: `${Math.max(stockPercentage, 2)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[10px] font-bold text-slate-400">
              {stockPercentage.toFixed(1)}% AVAILABLE
            </p>
            <p className="text-[10px] font-bold text-slate-500">
              {material.needUnit} ALLOCATED
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-900/20">
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl transition-colors"
              title="Edit Material"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => onViewHistory(material.id)}
              className="p-2 text-secondary bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 rounded-xl transition-colors"
              title="View History"
            >
              <History size={16} />
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="p-2 text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl transition-colors"
              title="Delete Material"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onBuy(material.id, material.materialName)}
              className="px-4 py-2 bg-success/20 border border-success/30 text-success font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-success/30 transition-colors flex items-center shadow-lg shadow-success/10"
            >
              <ShoppingCart size={14} className="mr-1.5" />
              Buy
            </button>
            <button
              onClick={() => onSell(material.id, material.materialName)}
              className="px-4 py-2 bg-accent/20 border border-accent/30 text-accent font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-accent/30 transition-colors flex items-center shadow-lg shadow-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={material.extraUnit <= 0}
            >
              <TrendingDown size={14} className="mr-1.5" />
              Sell
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-slate-500 uppercase tracking-widest border-t border-white/5 pt-3">
          <span>Created: {formatTimestamp(material.createdAt)}</span>
          {material.updatedAt && (
            <span>Updated: {formatTimestamp(material.updatedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// History Modal Component
const HistoryModal = ({ isOpen, onClose, materialId, materialName, schoolId }) => {
  const { data: history = [], isLoading, error } = useGetMaterialHistoryQuery(
    { schoolId, materialId },
    { skip: !isOpen || !materialId || !schoolId }
  );

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'bg-primary/20 text-primary border-primary/30';
      case 'buy': return 'bg-success/20 text-success border-success/30';
      case 'sell': return 'bg-accent/20 text-accent border-accent/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create': return <Plus size={14} />;
      case 'buy': return <TrendingUp size={14} />;
      case 'sell': return <TrendingDown size={14} />;
      default: return <Activity size={14} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="glass-card bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
          <h2 className="text-xl font-black text-white flex items-center tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 mr-4">
              <History size={20} />
            </div>
            Transaction History <span className="text-slate-500 font-medium ml-2">| {materialName}</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-12 text-slate-400">
              <Loader className="animate-spin mb-4 text-primary" size={32} />
              <p className="font-medium tracking-widest uppercase text-xs">Loading records...</p>
            </div>
          ) : error ? (
            <div className="text-accent bg-accent/10 border border-accent/20 p-4 rounded-xl text-center py-8 font-medium">{error}</div>
          ) : history.length === 0 ? (
            <div className="text-slate-500 text-center py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center">
              <History size={48} className="opacity-20 mb-4" />
              <p className="font-bold text-lg text-slate-400">No Transaction History</p>
              <p className="text-sm mt-1">There are no records found for this material yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => (
                <div key={index} className="bg-slate-900/50 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                  <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center ${getActionColor(record.action)}`}>
                        {getActionIcon(record.action)}
                        <span className="ml-1.5">{record.action}</span>
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {formatTimestamp(record.timestamp)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                      Qty: {record.quantity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Stock</span>
                      <span className="text-sm font-medium text-slate-300">{record.oldQuantity} <span className="text-slate-600 mx-1">→</span> <span className="text-white font-bold">{record.newQuantity}</span></span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Available</span>
                      <span className="text-sm font-medium text-slate-300">{record.oldExtra} <span className="text-slate-600 mx-1">→</span> <span className="text-white font-bold">{record.newExtra}</span></span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Allocated</span>
                      <span className="text-sm font-medium text-slate-300">{record.oldNeed} <span className="text-slate-600 mx-1">→</span> <span className="text-white font-bold">{record.newNeed}</span></span>
                    </div>
                    {(record.oldUnitPrice || record.newUnitPrice) && (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit Price</span>
                        <span className="text-sm font-medium text-slate-300">
                          {formatCurrency(record.oldUnitPrice)} <span className="text-slate-600 mx-1">→</span> <span className="text-success font-bold">{formatCurrency(record.newUnitPrice)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {record.spaceName && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-primary font-medium bg-primary/5 p-2 rounded-lg border border-primary/10 w-fit">
                      <Box size={14} />
                      <span>Space: {record.spaceName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Material Management Component
export default function MaterialManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // State Management
  const [schoolId, setSchoolId] = useState("");
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);

  // RTK Query Hooks
  const pollingInterval = useSelector(selectPollingInterval);
  const { data: materials = [], isLoading, refetch: loadAllMaterials } = useGetMaterialsQuery(schoolId, {
    skip: !schoolId,
    pollingInterval
  });
  const [addMaterialApi] = useAddMaterialMutation();
  const [editMaterialApi] = useEditMaterialMutation();
  const [deleteMaterialApi] = useDeleteMaterialMutation();
  const [buyMaterialApi] = useBuyMaterialMutation();
  const [sellMaterialApi] = useSellMaterialMutation();
  const [bulkImportMaterialsApi] = useBulkImportMaterialsMutation();

  // Modal States
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(new URLSearchParams(location.search).get('add') === '1');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Sync showAddMaterialModal with URL search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') {
      setShowAddMaterialModal(true);
    } else if (params.get('add') === null && showAddMaterialModal && !params.toString().includes('add=')) {
      setShowAddMaterialModal(false);
    }
  }, [location.search]);

  // Form States
  const [newMaterial, setNewMaterial] = useState({
    materialName: '',
    quantity: '',
    unitPrice: ''
  });

  const [transactionData, setTransactionData] = useState({
    materialId: '',
    materialName: '',
    quantity: '',
    unitPrice: ''
  });

  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState({
    id: '',
    name: ''
  });

  // Loading States
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, inStock, lowStock, outOfStock

  // Initialize School ID
  useEffect(() => {
    const initializeSchoolId = () => {
      const foundSchoolId = getSchoolIdFromStorage();
      setSchoolId(foundSchoolId || DEFAULT_SCHOOL_ID);
    };
    initializeSchoolId();
  }, []);

  // Auto dismiss messages
  useEffect(() => {
    if (apiSuccess) {
      const timer = setTimeout(() => setApiSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [apiSuccess]);

  useEffect(() => {
    if (apiError) {
      const timer = setTimeout(() => setApiError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [apiError]);

  // Filter materials based on search and status
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.materialName.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = true;
    if (filterStatus === 'inStock') {
      matchesFilter = material.extraUnit > 0 && (material.extraUnit / material.quantity) >= 0.2;
    } else if (filterStatus === 'lowStock') {
      matchesFilter = material.extraUnit > 0 && (material.extraUnit / material.quantity) < 0.2;
    } else if (filterStatus === 'outOfStock') {
      matchesFilter = material.extraUnit <= 0;
    }

    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const totalMaterials = materials.length;
  const totalValue = materials.reduce((sum, material) => sum + (material.quantity * material.unitPrice), 0);
  const lowStockCount = materials.filter(m => m.extraUnit > 0 && (m.extraUnit / m.quantity) < 0.2).length;
  const outOfStockCount = materials.filter(m => m.extraUnit <= 0).length;

  // API Functions
  const addMaterial = async () => {
    if (!newMaterial.materialName.trim() || !newMaterial.quantity || !newMaterial.unitPrice) {
      setApiError('All fields are required');
      return;
    }

    setIsAddingMaterial(true);
    try {
      await addMaterialApi({
        schoolId, 
        body: {
          materialName: newMaterial.materialName.trim(),
          quantity: parseInt(newMaterial.quantity),
          unitPrice: parseFloat(newMaterial.unitPrice)
        }
      }).unwrap();

      setApiSuccess(`Material "${newMaterial.materialName}" added successfully`);
      setNewMaterial({ materialName: '', quantity: '', unitPrice: '' });
      setShowAddMaterialModal(false);
    } catch (error) {
      setApiError(`Failed to add material: ${error.data?.message || error.message}`);
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const buyMaterial = async () => {
    if (!transactionData.quantity || !transactionData.unitPrice) {
      setApiError('Quantity and unit price are required');
      return;
    }

    setIsBuying(true);
    try {
      await buyMaterialApi({
        schoolId, 
        materialId: transactionData.materialId, 
        body: {
          quantity: parseInt(transactionData.quantity),
          unitPrice: parseFloat(transactionData.unitPrice)
        }
      }).unwrap();

      setApiSuccess(`Successfully purchased ${transactionData.quantity} units of ${transactionData.materialName}`);
      setShowBuyModal(false);
    } catch (error) {
      setApiError(`Failed to purchase material: ${error.data?.message || error.message}`);
    } finally {
      setIsBuying(false);
    }
  };

  const sellMaterial = async () => {
    if (!transactionData.quantity) {
      setApiError('Quantity is required');
      return;
    }

    setIsSelling(true);
    try {
      await sellMaterialApi({
        schoolId, 
        materialId: transactionData.materialId, 
        body: {
          quantity: parseInt(transactionData.quantity)
        }
      }).unwrap();

      setApiSuccess(`Successfully sold ${transactionData.quantity} units of ${transactionData.materialName}`);
      setShowSellModal(false);
    } catch (error) {
      setApiError(`Failed to sell material: ${error.data?.message || error.message}`);
    } finally {
      setIsSelling(false);
    }
  };

  const editMaterial = async (materialId, updates) => {
    try {
      await editMaterialApi({ schoolId, materialId, body: updates }).unwrap();
      setApiSuccess('Material updated successfully');
    } catch (error) {
      setApiError(`Failed to update material: ${error.data?.message || error.message}`);
    }
  };

  const deleteMaterial = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMaterialApi({ schoolId, materialId }).unwrap();
      setApiSuccess('Material deleted successfully');
    } catch (error) {
      setApiError(`Failed to delete material: ${error.data?.message || error.message}`);
    }
  };

  // Event Handlers
  const handleBuy = (materialId, materialName) => {
    setTransactionData({
      materialId,
      materialName,
      quantity: '',
      unitPrice: ''
    });
    setShowBuyModal(true);
  };

  const handleSell = (materialId, materialName) => {
    setTransactionData({
      materialId,
      materialName,
      quantity: '',
      unitPrice: ''
    });
    setShowSellModal(true);
  };

  const handleViewHistory = (materialId, materialName) => {
    setSelectedMaterialForHistory({ id: materialId, name: materialName });
    setShowHistoryModal(true);
  };

  const handleBulkMaterialsImport = async (rows) => {
    try {
      await bulkImportMaterialsApi({ schoolId, materials: rows }).unwrap();
      setApiSuccess('Bulk materials imported successfully');
    } catch (error) {
      throw new Error(error.data?.message || error.message || 'Bulk import failed');
    }
  };

  // Navigation
  const handleBack = () => {
    navigate('/dashboard/home');
  };

  // Notification Components
  const ErrorDialog = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="glass-card bg-slate-900 border-2 border-accent/50 p-6 rounded-2xl shadow-2xl w-[90%] max-w-md">
        <div className="flex items-center mb-4">
          <AlertTriangle size={24} className="text-accent flex-shrink-0 mr-3" />
          <h2 className="text-lg font-bold text-white">Error</h2>
        </div>
        <p className="text-slate-300 mb-6 text-sm">{apiError}</p>
        <button
          onClick={() => setApiError(null)}
          className="w-full px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  );

  const SuccessNotification = () => (
    <div className="fixed top-4 right-4 z-[100] p-4 bg-success/20 border-l-4 border-success text-success rounded-lg shadow-lg flex items-center max-w-sm backdrop-blur-md">
      <CheckCircle size={20} className="mr-3 flex-shrink-0" />
      <p className="font-medium text-sm">{apiSuccess}</p>
      <button onClick={() => setApiSuccess(null)} className="ml-4 text-success/70 hover:text-success transition-colors">
        <X size={16} />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-white">Loading materials...</p>
          <p className="text-sm text-slate-500 mt-1">School ID: {schoolId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-full">
      {apiError && <ErrorDialog />}
      {apiSuccess && <SuccessNotification />}

      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300"
              title="Back to Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <Package size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Material Management</h1>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em] mt-1">Manage inventory, purchases, and sales</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadAllMaterials}
              className="flex items-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/10 transition-colors font-medium text-sm"
            >
              <RefreshCw className="mr-2" size={16} />
              Refresh
            </button>
            <button
              onClick={() => setBulkModalOpen(true)}
              className="flex items-center px-4 py-2.5 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-xl border border-secondary/30 transition-colors font-bold text-sm"
            >
              <Upload className="mr-2" size={16} />
              Bulk Import
            </button>
            <button
              onClick={() => setShowAddMaterialModal(true)}
              className="flex items-center px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl border border-primary/30 transition-colors font-bold text-sm"
            >
              <Plus className="mr-2" size={16} />
              Add Material
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="glass-card p-6 border border-white/5 bg-slate-900/40 relative overflow-hidden rounded-2xl group hover:border-white/10 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary/50 transition-colors" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Materials</p>
                <p className="text-3xl font-black text-white">{totalMaterials}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Box size={24} />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border border-white/5 bg-slate-900/40 relative overflow-hidden rounded-2xl group hover:border-white/10 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-success/30 group-hover:bg-success/50 transition-colors" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Value</p>
                <p className="text-3xl font-black text-success">{formatCurrency(totalValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success border border-success/20">
                <DollarSign size={24} />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border border-white/5 bg-slate-900/40 relative overflow-hidden rounded-2xl group hover:border-white/10 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-warning/30 group-hover:bg-warning/50 transition-colors" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Low Stock</p>
                <p className="text-3xl font-black text-warning">{lowStockCount}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning border border-warning/20">
                <AlertTriangle size={24} />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border border-white/5 bg-slate-900/40 relative overflow-hidden rounded-2xl group hover:border-white/10 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent/30 group-hover:bg-accent/50 transition-colors" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Out of Stock</p>
                <p className="text-3xl font-black text-accent">{outOfStockCount}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                <X size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4 mt-8 bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white outline-none transition-all placeholder-slate-500"
              placeholder="Search materials..."
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-12 pr-10 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white outline-none transition-all appearance-none cursor-pointer w-48 font-medium"
            >
              <option value="all">All Materials</option>
              <option value="inStock">In Stock</option>
              <option value="lowStock">Low Stock</option>
              <option value="outOfStock">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center text-xs text-slate-500 px-2 font-medium">
          <span>School ID: <span className="text-primary tracking-wider">{schoolId}</span></span>
          <span className="mx-3 opacity-30">•</span>
          <span className="text-success flex items-center"><CheckCircle size={12} className="mr-1" /> System Active</span>
          <span className="mx-3 opacity-30">•</span>
          <span className="text-slate-400">{filteredMaterials.length} results found</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-6 max-w-[1600px]">
        {filteredMaterials.length === 0 ? (
          <div className="glass-card flex flex-col justify-center items-center py-20 bg-slate-900/40 border border-white/5 rounded-2xl">
            <Package size={64} className="text-slate-600 mx-auto mb-6 opacity-50" />
            <h2 className="text-2xl font-bold text-slate-300 mb-4 tracking-tight">
              {materials.length === 0 ? 'No Materials Found' : 'No Materials Match Your Filters'}
            </h2>
            <p className="text-slate-500 mb-8 max-w-md text-center">
              {materials.length === 0
                ? 'Add your first material to get started with inventory management'
                : 'Try adjusting your search term or filter settings'
              }
            </p>
            {materials.length === 0 && (
              <button
                onClick={() => setShowAddMaterialModal(true)}
                className="px-6 py-3 bg-primary/20 text-primary border border-primary/30 rounded-xl hover:bg-primary/30 transition-colors font-bold flex items-center mx-auto"
              >
                <Plus className="mr-2" size={20} />
                Add First Material
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onEdit={editMaterial}
                onDelete={deleteMaterial}
                onBuy={handleBuy}
                onSell={handleSell}
                onViewHistory={handleViewHistory}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Material Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="glass-card bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Plus size={20} />
                </div>
                Add New Material
              </h2>
              <button onClick={() => setShowAddMaterialModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Material Name</label>
                <input
                  type="text"
                  value={newMaterial.materialName}
                  onChange={(e) => setNewMaterial({ ...newMaterial, materialName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white outline-none transition-all placeholder-slate-500"
                  placeholder="Enter material name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Initial Quantity</label>
                <input
                  type="number"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white outline-none transition-all placeholder-slate-500"
                  placeholder="Enter quantity"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Unit Price (₹)</label>
                <input
                  type="number"
                  value={newMaterial.unitPrice}
                  onChange={(e) => setNewMaterial({ ...newMaterial, unitPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white outline-none transition-all placeholder-slate-500"
                  placeholder="Enter unit price"
                  step="0.01"
                  min="0.01"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/5 mt-6">
                <button
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2.5 text-slate-400 hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addMaterial}
                  disabled={isAddingMaterial || !newMaterial.materialName.trim() || !newMaterial.quantity || !newMaterial.unitPrice}
                  className="px-6 py-2.5 bg-primary/20 text-primary border border-primary/30 rounded-xl hover:bg-primary/30 transition-colors font-bold disabled:opacity-50 flex items-center"
                >
                  {isAddingMaterial ? (
                    <>
                      <Loader className="mr-2 animate-spin" size={18} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2" size={18} />
                      Add Material
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy Material Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="glass-card bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success border border-success/20">
                  <ShoppingCart size={20} />
                </div>
                Purchase Material
              </h2>
              <button onClick={() => setShowBuyModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-success/10 border border-success/20 p-4 rounded-xl flex items-center">
                <ShoppingCart className="text-success mr-3" size={20} />
                <p className="text-sm text-slate-300">
                  Purchasing: <strong className="text-white">{transactionData.materialName}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                <input
                  type="number"
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({ ...transactionData, quantity: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-success focus:ring-1 focus:ring-success text-white outline-none transition-all placeholder-slate-500"
                  placeholder="Enter quantity to buy"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Unit Price (₹)</label>
                <input
                  type="number"
                  value={transactionData.unitPrice}
                  onChange={(e) => setTransactionData({ ...transactionData, unitPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-success focus:ring-1 focus:ring-success text-white outline-none transition-all placeholder-slate-500"
                  placeholder="Enter unit price"
                  step="0.01"
                  min="0.01"
                />
              </div>

              {transactionData.quantity && transactionData.unitPrice && (
                <div className="bg-slate-950/50 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cost</span>
                  <span className="text-lg font-black text-success">
                    {formatCurrency(transactionData.quantity * transactionData.unitPrice)}
                  </span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/5 mt-6">
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="px-4 py-2.5 text-slate-400 hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={buyMaterial}
                  disabled={isBuying || !transactionData.quantity || !transactionData.unitPrice}
                  className="px-6 py-2.5 bg-success/20 text-success border border-success/30 rounded-xl hover:bg-success/30 transition-colors font-bold disabled:opacity-50 flex items-center shadow-lg shadow-success/10"
                >
                  {isBuying ? (
                    <>
                      <Loader className="mr-2 animate-spin" size={18} />
                      Purchasing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2" size={18} />
                      Purchase
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell Material Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="glass-card bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                  <TrendingDown size={20} />
                </div>
                Sell Material
              </h2>
              <button onClick={() => setShowSellModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent/20 p-4 rounded-xl flex items-center">
                <TrendingDown className="text-accent mr-3" size={20} />
                <p className="text-sm text-slate-300">
                  Selling: <strong className="text-white">{transactionData.materialName}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                <input
                  type="number"
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({ ...transactionData, quantity: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-white outline-none transition-all placeholder-slate-500"
                  placeholder="Enter quantity to sell"
                  min="1"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/5 mt-6">
                <button
                  onClick={() => setShowSellModal(false)}
                  className="px-4 py-2.5 text-slate-400 hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sellMaterial}
                  disabled={isSelling || !transactionData.quantity}
                  className="px-6 py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-xl hover:bg-accent/30 transition-colors font-bold disabled:opacity-50 flex items-center shadow-lg shadow-accent/10"
                >
                  {isSelling ? (
                    <>
                      <Loader className="mr-2 animate-spin" size={18} />
                      Selling...
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mr-2" size={18} />
                      Sell
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        materialId={selectedMaterialForHistory.id}
        materialName={selectedMaterialForHistory.name}
        schoolId={schoolId}
      />

      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Import Materials"
        expectedHeaders={['Material Name', 'Quantity', 'Unit Price']}
        onImport={handleBulkMaterialsImport}
      />
    </div>
  );
}
