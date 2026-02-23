// MaterialManagementPage.jsx - Complete Material Management System
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, Save, X, Loader, CheckCircle, AlertTriangle,
  Package, ShoppingCart, TrendingUp, TrendingDown, History, DollarSign,
  Settings, ArrowLeft, Home, Eye, Search, Filter, Calendar, Clock,
  Layers, Box, BarChart3, PieChart, Activity, RefreshCw, Download
} from 'lucide-react';

// --- API Configuration ---
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ;
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
      } catch (e) {}
    }
    return null;
  } catch (error) {
    console.error('Error reading School ID from localStorage:', error);
    return null;
  }
};

const DEFAULT_SCHOOL_ID = "622079";

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
    if (isOutOfStock) return 'text-red-600 bg-red-100';
    if (isLowStock) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Material Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Package className="text-blue-600" size={24} />
              {isOutOfStock && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.01"
                  placeholder="Unit Price"
                />
                <div className="flex items-center space-x-1">
                  <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded">
                    <Save size={14} />
                  </button>
                  <button onClick={() => setIsEditing(false)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{material.materialName}</h3>
                <p className="text-sm text-gray-500">ID: {material.id}</p>
                <p className="text-sm font-medium text-green-600">{formatCurrency(material.unitPrice)}/unit</p>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStockStatusColor()}`}>
              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
            </div>
            <p className="text-lg font-bold text-gray-800 mt-1">
              {material.extraUnit} / {material.quantity}
            </p>
            <p className="text-xs text-gray-500">Available / Total</p>
          </div>
        </div>

        {/* Stock Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.max(stockPercentage, 2)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stockPercentage.toFixed(1)}% available • {material.needUnit} allocated
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg text-sm"
              title="Edit Material"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg text-sm"
              title="Delete Material"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => onViewHistory(material.id)}
              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg text-sm"
              title="View History"
            >
              <History size={14} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onBuy(material.id, material.materialName)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
            >
              <ShoppingCart size={12} className="mr-1" />
              Buy
            </button>
            <button
              onClick={() => onSell(material.id, material.materialName)}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
              disabled={material.extraUnit <= 0}
            >
              <TrendingDown size={12} className="mr-1" />
              Sell
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          <span>Created: {formatTimestamp(material.createdAt)}</span>
          {material.updatedAt && (
            <>
              <span className="mx-2">•</span>
              <span>Updated: {formatTimestamp(material.updatedAt)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// History Modal Component
const HistoryModal = ({ isOpen, onClose, materialId, materialName, schoolId }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && materialId) {
      loadHistory();
    }
  }, [isOpen, materialId]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callApiWithBackoff(`${API_BASE_URL}/materials/${schoolId}/${materialId}/history`);
      if (result.success) {
        setHistory(result.data || []);
      }
    } catch (error) {
      setError(`Failed to load history: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'bg-blue-100 text-blue-800';
      case 'buy': return 'bg-green-100 text-green-800';
      case 'sell': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <History className="mr-2" size={20} />
            Transaction History - {materialName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="animate-spin mr-2" size={20} />
              Loading history...
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-8">{error}</div>
          ) : history.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No transaction history found</div>
          ) : (
            <div className="space-y-3">
              {history.map((record, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getActionColor(record.action)}`}>
                        {getActionIcon(record.action)}
                        <span className="ml-1 capitalize">{record.action}</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(record.timestamp)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      Qty: {record.quantity}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Stock:</span>
                      <span className="ml-1">{record.oldQuantity} → {record.newQuantity}</span>
                    </div>
                    <div>
                      <span className="font-medium">Available:</span>
                      <span className="ml-1">{record.oldExtra} → {record.newExtra}</span>
                    </div>
                    <div>
                      <span className="font-medium">Allocated:</span>
                      <span className="ml-1">{record.oldNeed} → {record.newNeed}</span>
                    </div>
                    {(record.oldUnitPrice || record.newUnitPrice) && (
                      <div>
                        <span className="font-medium">Price:</span>
                        <span className="ml-1">
                          {formatCurrency(record.oldUnitPrice)} → {formatCurrency(record.newUnitPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {record.spaceName && (
                    <div className="mt-2 text-xs text-blue-600">
                      <span className="font-medium">Space:</span> {record.spaceName}
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
  
  // State Management
  const [schoolId, setSchoolId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);

  // Modal States
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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

  // Load materials when school ID is available
  useEffect(() => {
    if (schoolId) {
      loadAllMaterials();
    }
  }, [schoolId]);

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
  const loadAllMaterials = async () => {
    if (!schoolId) return;
    
    setIsLoading(true);
    setApiError(null);
    
    try {
      const result = await callApiWithBackoff(`${API_BASE_URL}/materials/${schoolId}`);
      if (result.success) {
        setMaterials(result.data || []);
        setApiSuccess(`Loaded ${result.data?.length || 0} materials successfully`);
      }
    } catch (error) {
      setApiError(`Failed to load materials: ${error.message}`);
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addMaterial = async () => {
    if (!newMaterial.materialName.trim() || !newMaterial.quantity || !newMaterial.unitPrice) {
      setApiError('All fields are required');
      return;
    }

    setIsAddingMaterial(true);
    try {
      const result = await callApiWithBackoff(`${API_BASE_URL}/materials/${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialName: newMaterial.materialName.trim(),
          quantity: parseInt(newMaterial.quantity),
          unitPrice: parseFloat(newMaterial.unitPrice)
        })
      });

      if (result.success) {
        setApiSuccess(`Material "${newMaterial.materialName}" added successfully`);
        setNewMaterial({ materialName: '', quantity: '', unitPrice: '' });
        setShowAddMaterialModal(false);
        loadAllMaterials();
      }
    } catch (error) {
      setApiError(`Failed to add material: ${error.message}`);
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
      const result = await callApiWithBackoff(`${API_BASE_URL}/materials/${schoolId}/${transactionData.materialId}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(transactionData.quantity),
          unitPrice: parseFloat(transactionData.unitPrice)
        })
      });

      if (result.success) {
        setApiSuccess(`Successfully purchased ${transactionData.quantity} units of ${transactionData.materialName}`);
        setShowBuyModal(false);
        loadAllMaterials();
      }
    } catch (error) {
      setApiError(`Failed to purchase material: ${error.message}`);
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
      const result = await callApiWithBackoff(`${API_BASE_URL}/materials/${schoolId}/${transactionData.materialId}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(transactionData.quantity)
        })
      });

      if (result.success) {
        setApiSuccess(`Successfully sold ${transactionData.quantity} units of ${transactionData.materialName}`);
        setShowSellModal(false);
        loadAllMaterials();
      }
    } catch (error) {
      setApiError(`Failed to sell material: ${error.message}`);
    } finally {
      setIsSelling(false);
    }
  };

  const editMaterial = async (materialId, updates) => {
    try {
      const result = await callApiWithBackoff(`${API_BASE_URL}/materials/${schoolId}/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (result.success) {
        setApiSuccess('Material updated successfully');
        loadAllMaterials();
      }
    } catch (error) {
      setApiError(`Failed to update material: ${error.message}`);
    }
  };

  const deleteMaterial = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await callApiWithBackoff(`${API_BASE_URL}/materials/${schoolId}/${materialId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        setApiSuccess('Material deleted successfully');
        loadAllMaterials();
      }
    } catch (error) {
      setApiError(`Failed to delete material: ${error.message}`);
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

  // Navigation
  const handleBack = () => {
    navigate('/dashboard/home');
  };

  // Notification Components
  const ErrorDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100] p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-[90%] max-w-md border-4 border-red-500">
        <div className="flex items-center mb-4">
          <AlertTriangle size={24} className="text-red-600 mr-3" />
          <h2 className="text-lg font-bold text-red-700">Error</h2>
        </div>
        <p className="text-gray-700 mb-6 text-sm">{apiError}</p>
        <button 
          onClick={() => setApiError(null)} 
          className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
        >
          Close
        </button>
      </div>
    </div>
  );

  const SuccessNotification = () => (
    <div className="fixed top-4 right-4 z-[100] p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg shadow-lg flex items-center max-w-sm">
      <CheckCircle size={20} className="mr-3" />
      <p className="font-medium text-sm">{apiSuccess}</p>
      <button onClick={() => setApiSuccess(null)} className="ml-4 text-green-500 hover:text-green-700">
        <X size={16} />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-purple-50 to-pink-100">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-800">Loading materials...</p>
          <p className="text-sm text-gray-600 mt-1">School ID: {schoolId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-100 p-4">
      {apiError && <ErrorDialog />}
      {apiSuccess && <SuccessNotification />}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <Package className="mr-3 text-purple-600" size={32} />
                Material Management
              </h1>
              <p className="text-gray-600 mt-1">Manage inventory, purchases, and sales</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadAllMaterials}
              className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <RefreshCw className="mr-2" size={16} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddMaterialModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Plus className="mr-2" size={16} />
              Add Material
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Materials</p>
                <p className="text-2xl font-bold text-gray-800">{totalMaterials}</p>
              </div>
              <Box className="text-blue-600" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Value</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalValue)}</p>
              </div>
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              </div>
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
              <X className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="Search materials..."
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Materials</option>
            <option value="inStock">In Stock</option>
            <option value="lowStock">Low Stock</option>
            <option value="outOfStock">Out of Stock</option>
          </select>
        </div>

        <div className="mt-4 text-xs text-gray-500 bg-white px-3 py-2 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <span>School ID: <span className="font-bold text-purple-600">{schoolId}</span></span>
            <span className="mx-2">•</span>
            <span className="text-green-600">✓ Material Management System</span>
            <span className="mx-2">•</span>
            <span>{filteredMaterials.length} materials displayed</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-16">
            <Package size={64} className="text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-600 mb-4">
              {materials.length === 0 ? 'No Materials Found' : 'No Materials Match Your Filters'}
            </h2>
            <p className="text-gray-500 mb-8">
              {materials.length === 0 
                ? 'Add your first material to get started with inventory management'
                : 'Try adjusting your search term or filter settings'
              }
            </p>
            {materials.length === 0 && (
              <button
                onClick={() => setShowAddMaterialModal(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center mx-auto"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add New Material</h2>
              <button onClick={() => setShowAddMaterialModal(false)} className="text-gray-500 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material Name</label>
                <input
                  type="text"
                  value={newMaterial.materialName}
                  onChange={(e) => setNewMaterial({...newMaterial, materialName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter material name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Quantity</label>
                <input
                  type="number"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial({...newMaterial, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter quantity"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (₹)</label>
                <input
                  type="number"
                  value={newMaterial.unitPrice}
                  onChange={(e) => setNewMaterial({...newMaterial, unitPrice: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter unit price"
                  step="0.01"
                  min="0.01"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={addMaterial}
                  disabled={isAddingMaterial || !newMaterial.materialName.trim() || !newMaterial.quantity || !newMaterial.unitPrice}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center"
                >
                  {isAddingMaterial ? (
                    <>
                      <Loader className="mr-2 animate-spin" size={16} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2" size={16} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Purchase Material</h2>
              <button onClick={() => setShowBuyModal(false)} className="text-gray-500 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  Purchasing: <strong>{transactionData.materialName}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({...transactionData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  placeholder="Enter quantity to buy"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (₹)</label>
                <input
                  type="number"
                  value={transactionData.unitPrice}
                  onChange={(e) => setTransactionData({...transactionData, unitPrice: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  placeholder="Enter unit price"
                  step="0.01"
                  min="0.01"
                />
              </div>

              {transactionData.quantity && transactionData.unitPrice && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Total Cost: <strong>{formatCurrency(transactionData.quantity * transactionData.unitPrice)}</strong>
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={buyMaterial}
                  disabled={isBuying || !transactionData.quantity || !transactionData.unitPrice}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
                >
                  {isBuying ? (
                    <>
                      <Loader className="mr-2 animate-spin" size={16} />
                      Purchasing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2" size={16} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Sell Material</h2>
              <button onClick={() => setShowSellModal(false)} className="text-gray-500 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-red-800">
                  Selling: <strong>{transactionData.materialName}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({...transactionData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="Enter quantity to sell"
                  min="1"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSellModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={sellMaterial}
                  disabled={isSelling || !transactionData.quantity}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center"
                >
                  {isSelling ? (
                    <>
                      <Loader className="mr-2 animate-spin" size={16} />
                      Selling...
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mr-2" size={16} />
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
    </div>
  );
}