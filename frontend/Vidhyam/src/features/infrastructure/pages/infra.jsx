import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { 
  Box, Layers, Package, DollarSign, ListOrdered, History, Shield,
  ArrowUpRight, ArrowDownRight, CheckCircle, AlertTriangle, Briefcase,
  Zap, Activity, Building, FileText, Calendar, Users, Clock, Plus, UserPlus
} from 'lucide-react';

import NoConnection from '../../../components/ui/NoConnection.jsx';
import GlassCard from '../../../components/ui/GlassCard';
import FormWidget from '../../../components/ui/FormWidget';

import SpaceDetailModal from '../components/space/SpaceDetailModal';
import CloneSpaceModal from '../components/space/CloneSpaceModal';
import TransferMaterialModal from '../components/space/TransferMaterialModal';
import BulkImportModal from '../../../components/ui/BulkImportModal';

import {
  useGetSpacesQuery,
  useGetSpaceCategoriesQuery,
  useCreateSpaceCategoryMutation,
  useDeleteSpaceCategoryMutation,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useCloneSpaceMutation,
  useTransferMaterialMutation,
  useGetSpaceDistributionMetricsQuery,
  useGetMaterialsQuery,
  useAddMaterialMutation,
  useEditMaterialMutation,
  useDeleteMaterialMutation,
  useBuyMaterialMutation,
  useSellMaterialMutation,
  useGetResponsibilitiesQuery,
  useGetOverviewAnalyticsQuery,
  useDeleteResponsibilityMutation,
  useCreateResponsibilityMutation,
  useUpdateResponsibilityMutation,
  useGetMissingResponsibilityAlertsQuery
} from '../infrastructureApi';
import { useGetEmployeesQuery } from '../../employees/api/employeeApi';

// Presentation UI components
import {
  InfraHeader,
  InfraKPIs,
  InfraToolbar,
  SpaceListItem,
  SpaceListItemSkeleton,
  MaterialListItem,
  MaterialListItemSkeleton,
  InfraPagination,
  CategoryManagerModal,
  TransactionModal,
  ResponsibilityListItem,
  ResponsibilityListItemSkeleton
} from '../components/InfraUIComponents';

// Responsibility-specific sub-components
import ResponsibilityDetailView from '../components/responsibility/ResponsibilityDetailView';
import BulkAssignModal from '../components/responsibility/BulkAssignModal';
import CriticalAlertsBanner from '../components/responsibility/CriticalAlertsBanner';


const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { 
    const v = localStorage.getItem(k); 
    if (v && v !== 'undefined') return v; 
  }
  return null;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount || 0);
};

export default function SpaceManagement() {
  const navigate = useNavigate();
  const { tab } = useParams();
  const activeTab = tab || 'spaces';
  const schoolId = getSchoolId();

  const [portalTarget, setPortalTarget] = useState(null);
  useEffect(() => {
    setPortalTarget(document.getElementById("dashboard-content-wrapper"));
  }, []);

  // ──────────────────────────────────────────
  // 1. SHARED/COMMON QUERIES & MUTATIONS
  // ──────────────────────────────────────────
  const { 
    data: spacesData, 
    isLoading: spacesLoading, 
    isFetching: spacesFetching, 
    refetch: refetchSpaces, 
    error: spacesError 
  } = useGetSpacesQuery(schoolId);

  const { 
    data: categoriesData, 
    refetch: refetchCategories,
    error: categoriesError 
  } = useGetSpaceCategoriesQuery(schoolId);

  const { data: distributionData } = useGetSpaceDistributionMetricsQuery(schoolId, { 
    skip: !!spacesError 
  });

  const { data: employeesData } = useGetEmployeesQuery(schoolId, { 
    skip: !!spacesError 
  });

  // ──────────────────────────────────────────
  // 2. SPACE MANAGEMENT STATE & METHODS
  // ──────────────────────────────────────────
  const [createSpaceCategory] = useCreateSpaceCategoryMutation();
  const [deleteSpaceCategory] = useDeleteSpaceCategoryMutation();
  const [createSpace] = useCreateSpaceMutation();
  const [updateSpace] = useUpdateSpaceMutation();
  const [deleteSpace] = useDeleteSpaceMutation();
  const [cloneSpace] = useCloneSpaceMutation();
  const [transferMaterial] = useTransferMaterialMutation();

  const [spaceSearch, setSpaceSearch] = useState("");
  const [spaceCategoryFilter, setSpaceCategoryFilter] = useState("all");
  const [spaceStatusFilter, setSpaceStatusFilter] = useState("all");
  const [showCategoryView, setShowCategoryView] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [activeFormType, setActiveFormType] = useState(null); // 'space' | 'material' | 'responsibility'
  const [editingItem, setEditingItem] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [detailSpace, setDetailSpace] = useState(null);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [cloneSource, setCloneSource] = useState(null);

  const { control: spaceControl, handleSubmit: handleSpaceSubmit, reset: resetSpace } = useForm();
  const { control: materialControl, handleSubmit: handleMaterialSubmit, reset: resetMaterial } = useForm();
  const { control: transactionControl, handleSubmit: handleTransactionSubmit, watch: watchTransaction, setValue: setTransactionValue } = useForm();
  const { 
    control: responsibilityControl, 
    handleSubmit: handleResponsibilitySubmit, 
    reset: resetResponsibility 
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      employeeType: "teacher",
      priority: "medium",
      estimatedHoursPerWeek: 0,
      compensation: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
    }
  });

  const handleFormClose = useCallback(() => {
    setActiveFormType(null);
    setEditingItem(null);
    setShowNewCategoryInput(false);
    resetSpace();
    resetMaterial();
    resetResponsibility({
      name: "",
      description: "",
      employeeType: "teacher",
      priority: "medium",
      estimatedHoursPerWeek: 0,
      compensation: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
    });
  }, [resetSpace, resetMaterial, resetResponsibility]);

  const spacesList = useMemo(() => spacesData?.spaces || spacesData?.data || [], [spacesData]);
  
  const categoriesList = useMemo(() =>
    Array.from(new Set(categoriesData?.map(c => typeof c === "string" ? c : (c.name || "Unnamed")) || []))
  , [categoriesData]);

  const categoriesWithAll = useMemo(() => ['all', ...categoriesList], [categoriesList]);

  const SPACE_SCHEMA = useMemo(() => [
    {
      id: "general",
      label: "Space Details",
      icon: Box,
      fields: [
        {
          name: "categoryName",
          label: "Infrastructure Class",
          type: "select",
          options: categoriesList,
          required: true,
          labelIcon: Layers
        },
        { name: "spaceName", label: "Space Identifier", type: "text", required: true, labelIcon: Box, placeholder: "e.g. Physics Lab A" },
        { name: "description", label: "Operational Description", type: "textarea", placeholder: "Define intended use..." },
      ]
    }
  ], [categoriesList]);

  const spaceResponsibilityCount = useMemo(() => {
    const counts = {};
    const distList = distributionData?.spaces || [];
    for (const s of distList) {
      counts[s.spaceId] = s.responsibilityCount || 0;
    }
    return counts;
  }, [distributionData]);

  const getSpaceStatus = useCallback((space) => {
    const name = space.spaceId || space.name;
    const mats = []; // Lazy fetched, default to unset
    const deficits = mats.filter(m => m.status === 'deficit');
    const hasMaterials = mats.length > 0;
    if (deficits.length > 0) return 'deficient';
    if (hasMaterials) return 'full';
    return 'unset';
  }, []);

  const filteredSpaces = useMemo(() => {
    let result = spacesList;
    if (spaceSearch) {
      const q = spaceSearch.toLowerCase();
      result = result.filter(s => (s.spaceName || s.name || '').toLowerCase().includes(q));
    }
    if (spaceCategoryFilter !== 'all') {
      result = result.filter(s => (s.spaceCategory || 'Uncategorized') === spaceCategoryFilter);
    }
    if (spaceStatusFilter !== 'all') {
      result = result.filter(s => getSpaceStatus(s) === spaceStatusFilter);
    }
    return result;
  }, [spacesList, spaceSearch, spaceCategoryFilter, spaceStatusFilter, getSpaceStatus]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createSpaceCategory({ schoolId, body: { name: newCategoryName.trim() } }).unwrap();
      toast.success("Category created successfully");
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      refetchCategories();
    } catch (e) { toast.error(e?.data?.message || "Creation failure"); }
  };

  const handleCreateSpace = useCallback(async (data) => {
    try {
      const category = data.categoryName || categoriesList[0];
      await createSpace({ schoolId, category, body: data }).unwrap();
      toast.success("Sector Provisioned Successfully");
      handleFormClose();
    } catch (e) { toast.error(e?.data?.message || "Provisioning failure"); }
  }, [createSpace, schoolId, categoriesList, handleFormClose]);

  const handleUpdateSpace = useCallback(async (id, data) => {
    try {
      await updateSpace({ schoolId, spaceId: id, body: data }).unwrap();
      toast.success("Sector Protocol Updated");
      handleFormClose();
    } catch (e) { toast.error(e?.data?.message || "Update failure"); }
  }, [updateSpace, schoolId, handleFormClose]);

  const handleDeleteSpace = async (space) => {
    const name = space.spaceName || space.name;
    if (!window.confirm(`Decommission '${name}' permanently?`)) return;
    try {
      await deleteSpace({ schoolId, spaceId: name }).unwrap();
      toast.success("Sector Purged");
    } catch (e) { toast.error(e?.data?.message || "Decommission failure"); }
  };

  const handleCloneSpace = (space) => {
    setCloneSource(space);
    setCloneModalOpen(true);
  };

  const handleCloneSubmit = async (args) => {
    await cloneSpace(args).unwrap();
    refetchSpaces();
  };

  // ──────────────────────────────────────────
  // 3. MATERIAL MANAGEMENT STATE & METHODS
  // ──────────────────────────────────────────
  const [materialSearch, setMaterialSearch] = useState("");
  const [debouncedMaterialSearch, setDebouncedMaterialSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState("All Inventory");
  const [materialPage, setMaterialPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => { 
      setDebouncedMaterialSearch(materialSearch); 
      setMaterialPage(1); 
    }, 500);
    return () => clearTimeout(timer);
  }, [materialSearch]);

  const { 
    data: materialsData, 
    isLoading: materialsLoading,
    isFetching: materialsFetching, 
    refetch: refetchMaterials, 
    error: materialsError 
  } = useGetMaterialsQuery({ 
    schoolId, 
    search: debouncedMaterialSearch, 
    filter: materialFilter === "All Inventory" ? null : materialFilter, 
    page: materialPage, 
    limit,
  });

  const materialsList = useMemo(() => materialsData?.data || [], [materialsData]);
  const materialMetadata = useMemo(() => materialsData?.metadata || { totalCount: 0, totalPages: 1 }, [materialsData]);

  const [addMaterial] = useAddMaterialMutation();
  const [editMaterial] = useEditMaterialMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();
  const [buyMaterial] = useBuyMaterialMutation();
  const [sellMaterial] = useSellMaterialMutation();

  const [transactionType, setTransactionType] = useState("");
  const [transactionMaterial, setTransactionMaterial] = useState(null);

  // Form controls relocated to the top of component

  const transactionQty = watchTransaction("quantity") || 0;
  const transactionPriceInput = watchTransaction("unitPrice") || 0;

  const MATERIAL_SCHEMA = useMemo(() => [
    {
      id: "main",
      label: "Inventory Specs",
      icon: Package,
      fields: [
        { name: "materialName", label: "Material Name", type: "text", required: true, labelIcon: Package, placeholder: "e.g. Science Beakers" },
        { name: "unitPrice", label: "Unit Price (₹)", type: "number", required: true, labelIcon: DollarSign, placeholder: "0.00" },
        { name: "quantity", label: "Initial Quantity", type: "number", required: true, labelIcon: ListOrdered, placeholder: "0" },
      ],
    },
  ], []);

  const handleCreateMaterial = useCallback(async (data) => {
    try {
      await addMaterial({ schoolId, body: data }).unwrap();
      toast.success("Material Provisioned Successfully");
      handleFormClose();
    } catch (e) { toast.error("Provisioning failure"); }
  }, [addMaterial, schoolId, handleFormClose]);

  const handleUpdateMaterial = useCallback(async (id, data) => {
    try {
      await editMaterial({ schoolId, materialId: id, body: data }).unwrap();
      toast.success("Inventory Protocol Updated");
      handleFormClose();
    } catch (e) { toast.error("Update failure"); }
  }, [editMaterial, schoolId, handleFormClose]);

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Purge this resource from the manifest?")) return;
    try {
      await deleteMaterial({ schoolId, materialId: id }).unwrap();
      toast.success("Resource Purged");
    } catch (e) { toast.error("Purge failure"); }
  };

  const onTransactionSubmit = async (data) => {
    if (!transactionMaterial) return;
    try {
      const body = { 
        quantity: parseInt(data.quantity), 
        unitPrice: parseFloat(data.unitPrice), 
        notes: transactionType === "buy" ? "Procurement" : "Distribution" 
      };
      if (transactionType === "buy") {
        await buyMaterial({ schoolId, materialId: transactionMaterial.materialName, body }).unwrap();
        toast.success("Procurement Protocol Executed");
      } else {
        await sellMaterial({ schoolId, materialId: transactionMaterial.materialName, body }).unwrap();
        toast.success("Distribution Protocol Executed");
      }
      setTransactionType(""); setTransactionMaterial(null);
    } catch (e) { toast.error("Execution failure"); }
  };

  // ──────────────────────────────────────────
  // 4. RESPONSIBILITY MANAGEMENT STATE & METHODS
  // ──────────────────────────────────────────

  const [responsibilitySearch, setResponsibilitySearch] = useState("");
  const [respTypeFilter, setRespTypeFilter] = useState("all");
  const [selectedResponsibilityId, setSelectedResponsibilityId] = useState(null);
  const [bulkAssignTarget, setBulkAssignTarget] = useState(null);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({ start: "", end: "" });

  const {
    data: responsibilitiesData,
    isLoading: responsibilitiesLoading,
    isFetching: responsibilitiesFetching,
    refetch: refetchResponsibilities,
    error: responsibilitiesError
  } = useGetResponsibilitiesQuery({ schoolId });

  const {
    data: responsibilityAnalyticsData,
    isFetching: responsibilityAnalyticsFetching
  } = useGetOverviewAnalyticsQuery({ schoolId });

  const { data: alertsData, isLoading: alertsLoading } = useGetMissingResponsibilityAlertsQuery(schoolId, { skip: !schoolId });
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const alerts = useMemo(() => {
    const raw = alertsData?.data || [];
    return raw.filter((_, i) => !dismissedAlerts.includes(i));
  }, [alertsData, dismissedAlerts]);

  const [deleteResponsibility] = useDeleteResponsibilityMutation();
  const [createResponsibility, { isLoading: isCreatingResponsibility }] = useCreateResponsibilityMutation();
  const [updateResponsibility, { isLoading: isUpdatingResponsibility }] = useUpdateResponsibilityMutation();

  // Responsibility form control relocated to the top of component

  const responsibilitiesList = useMemo(() => responsibilitiesData?.data || [], [responsibilitiesData]);

  // handleFormClose relocated to the top of component

  const RESPONSIBILITY_SCHEMA = useMemo(() => [
    {
      id: 'definition',
      label: 'MANDATE DEFINITION',
      icon: Briefcase,
      description: 'Define core protocol parameters and mission scope.',
      fields: [
        {
          name: 'name',
          label: 'Protocol Name',
          type: 'text',
          required: true,
          labelIcon: Shield,
          placeholder: 'e.g., Department Coordinator'
        },
        {
          name: 'employeeType',
          label: 'Target Personnel Class',
          type: 'select',
          required: true,
          labelIcon: Users,
          options: [
            { label: 'Teaching', value: 'teacher' },
            { label: 'Administrative Staff', value: 'staff' },
            { label: 'Management', value: 'administrator' },
            { label: 'Operational', value: 'operational' }
          ]
        },
        {
          name: 'description',
          label: 'Operational Brief',
          type: 'textarea',
          labelIcon: Activity,
          placeholder: 'Detailed scope of work and standard operating procedures...',
          rows: 3
        }
      ]
    },
    {
      id: 'parameters',
      label: 'DUTY PARAMETERS',
      icon: Shield,
      description: 'Configure priority, workload, and temporal span.',
      fields: [
        {
          name: 'priority',
          label: 'Mandate Priority',
          type: 'select',
          required: true,
          labelIcon: Zap,
          options: [
            { label: 'Critical / High', value: 'high' },
            { label: 'Standard / Medium', value: 'medium' },
            { label: 'Elective / Low', value: 'low' }
          ]
        },
        {
          name: 'estimatedHoursPerWeek',
          label: 'Weekly Load (Hours)',
          type: 'number',
          labelIcon: Clock,
          placeholder: 'e.g., 5'
        },
        {
          name: 'compensation',
          label: 'Credit Compensation',
          type: 'number',
          labelIcon: DollarSign,
          placeholder: '0.00'
        },
        {
          name: 'startDate',
          label: 'Activation Date',
          type: 'date',
          labelIcon: Calendar
        },
        {
          name: 'endDate',
          label: 'Decommission Date',
          type: 'date',
          labelIcon: Calendar
        },
        {
          name: 'isActive',
          label: 'Protocol Status',
          type: 'checkbox',
          labelIcon: Activity
        }
      ]
    }
  ], []);

  // formConfig relocated to the bottom of hooks
  const filteredResponsibilities = useMemo(() => {
    let result = responsibilitiesList;
    if (responsibilitySearch) {
      const q = responsibilitySearch.toLowerCase();
      result = result.filter(r => 
        (r.name || '').toLowerCase().includes(q) || 
        (r.description || '').toLowerCase().includes(q)
      );
    }
    if (respTypeFilter !== 'all') {
      result = result.filter(r => r.employeeType === respTypeFilter);
    }
    return result;
  }, [responsibilitiesList, responsibilitySearch, respTypeFilter]);

  const handleAddResponsibility = useCallback(async (data) => {
    try {
      await createResponsibility({ schoolId, body: data }).unwrap();
      toast.success("New Protocol Authorized in Registry");
      handleFormClose();
    } catch (err) {
      toast.error(err.data?.message || "Authorization Failure");
    }
  }, [createResponsibility, schoolId, handleFormClose]);

  const handleEditResponsibility = useCallback(async (data) => {
    try {
      await updateResponsibility({
        schoolId,
        responsibilityId: editingItem?.responsibilityId || editingItem?.id,
        body: data,
      }).unwrap();
      toast.success("Protocol Parameters Re-calibrated");
      handleFormClose();
    } catch (err) {
      toast.error(err.data?.message || "Calibration Failure");
    }
  }, [updateResponsibility, schoolId, editingItem, handleFormClose]);

  const openEditResponsibility = useCallback((r) => {
    resetResponsibility({
      name: r.name,
      description: r.description,
      employeeType: r.employeeType,
      priority: r.priority,
      estimatedHoursPerWeek: r.estimatedHoursPerWeek,
      compensation: r.compensation,
      startDate: r.startDate || new Date().toISOString().split("T")[0],
      endDate: r.endDate || "",
      isActive: r.isActive !== undefined ? r.isActive : true,
    });
    setEditingItem(r);
    setActiveFormType('responsibility');
  }, [resetResponsibility]);

  const handleDeleteResponsibility = async (id) => {
    if (window.confirm("TERMINATE PROTOCOL PERMANENTLY? This action cannot be undone.")) {
      try {
        await deleteResponsibility({ schoolId, responsibilityId: id }).unwrap();
        toast.success("Protocol Decommissioned Successfully");
      } catch (err) {
        toast.error(err.data?.message || "Decommission Failure");
      }
    }
  };

  const handleExportCsv = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/responsibility/${schoolId}/export/csv`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `responsibilities_${schoolId}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Data Ledger Exported Successfully");
    } catch (err) {
      toast.error(err.message || "Export Failure");
    }
  }, [schoolId]);

  const handleExportPdf = useCallback(
    async (reportType) => {
      const { start, end } = reportDateRange;
      if (!start || !end) {
        toast.warning("Select date range first");
        return;
      }
      try {
        const response = await fetch(
          `/api/responsibility/${schoolId}/reports/${reportType}/${start}/${end}_pdf`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        if (!response.ok) throw new Error("PDF export failed");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}_report_${start}_${end}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`${reportType} Report Exported`);
        setShowReportMenu(false);
      } catch (err) {
        toast.error(err.message || "PDF Export Failure");
      }
    },
    [schoolId, reportDateRange]
  );

  const formConfig = useMemo(() => {
    if (!activeFormType) return null;

    if (activeFormType === 'space') {
      const SPACE_SECTIONS = SPACE_SCHEMA.map(s => ({
        ...s,
        customContent: (
          <div className="space-y-2">
            {!showNewCategoryInput ? (
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(true)}
                className="text-[9px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors"
              >
                + Create New Category
              </button>
            ) : (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
                    New Category Name
                  </label>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Science Labs"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-primary/40"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCategoryInput(false); setNewCategoryName(""); }}
                  className="px-3 py-1.5 text-[9px] font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
      }));
      return {
        title: editingItem ? "Modify Space" : "Add Space",
        description: editingItem ? "Update space details." : "Create a new school space.",
        sections: SPACE_SECTIONS,
        control: spaceControl,
        onSubmit: handleSpaceSubmit(editingItem 
          ? (data) => handleUpdateSpace(editingItem.spaceId || editingItem.id, data) 
          : handleCreateSpace),
        submitLabel: editingItem ? "Save Changes" : "Create Space",
        isLoading: false,
      };
    }

    if (activeFormType === 'material') {
      return {
        title: editingItem ? "Modify Asset" : "Provision Asset",
        description: editingItem ? "Update asset details." : "Initialize a new material resource.",
        sections: MATERIAL_SCHEMA,
        control: materialControl,
        onSubmit: handleMaterialSubmit(editingItem
          ? (data) => handleUpdateMaterial(editingItem.materialName || editingItem.id, data)
          : handleCreateMaterial),
        submitLabel: editingItem ? "Commit Changes" : "Initialize Resource",
        isLoading: false,
      };
    }

    if (activeFormType === 'responsibility') {
      return {
        title: editingItem ? "Re-calibrate Protocol" : "Authorize New Protocol",
        description: editingItem ? "Update the operational parameters of this existing mandate." : "Define a new institutional protocol for the mission registry.",
        sections: RESPONSIBILITY_SCHEMA,
        control: responsibilityControl,
        onSubmit: handleResponsibilitySubmit(
          editingItem ? handleEditResponsibility : handleAddResponsibility
        ),
        submitLabel: editingItem ? "Update Protocol" : "Authorize Protocol",
        isLoading: isCreatingResponsibility || isUpdatingResponsibility,
      };
    }

    return null;
  }, [
    activeFormType,
    editingItem,
    SPACE_SCHEMA,
    MATERIAL_SCHEMA,
    RESPONSIBILITY_SCHEMA,
    spaceControl,
    materialControl,
    responsibilityControl,
    handleSpaceSubmit,
    handleMaterialSubmit,
    handleResponsibilitySubmit,
    handleUpdateSpace,
    handleCreateSpace,
    handleUpdateMaterial,
    handleCreateMaterial,
    handleEditResponsibility,
    handleAddResponsibility,
    isCreatingResponsibility,
    isUpdatingResponsibility
  ]);

  // ──────────────────────────────────────────
  // 5. OFFLINE & CONTEXT COMPUTATIONS
  // ──────────────────────────────────────────
  const spacesOffline = spacesError?.status === "FETCH_ERROR" || categoriesError?.status === "FETCH_ERROR";
  const materialsOffline = materialsError?.status === "FETCH_ERROR" || materialsError?.status === 404;
  const responsibilitiesOffline = responsibilitiesError?.status === "FETCH_ERROR";
  const isOffline = activeTab === 'spaces' 
    ? spacesOffline 
    : activeTab === 'materials' 
      ? materialsOffline 
      : responsibilitiesOffline;

  const refetchAll = () => {
    refetchSpaces();
    refetchCategories();
    refetchMaterials();
    refetchResponsibilities();
  };

  const kpis = useMemo(() => {
    if (activeTab === 'spaces') {
      const totalSpaces = spacesList.length;
      const totalCategories = categoriesList.length;
      const distList = distributionData?.spaces || [];
      const assignedEmployees = distList.reduce((sum, s) => sum + (s.employeeCount || 0), 0);
      const vacantSpaces = distList.filter(s => (s.employeeCount || 0) === 0).length;

      return [
        { label: 'Total Spaces', value: totalSpaces, sub: 'Total Space Count', icon: Box, color: 'primary' },
        { label: 'Categories', value: totalCategories, sub: 'Active Categories', icon: Layers, color: 'accent' },
        { label: 'Assigned', value: assignedEmployees, sub: 'Assigned Staff', icon: Shield, color: 'success' },
        { label: 'Vacant', value: vacantSpaces, sub: 'Vacant Spaces', icon: vacantSpaces > 0 ? AlertTriangle : CheckCircle, color: vacantSpaces > 0 ? 'warning' : 'success' },
      ];
    } else if (activeTab === 'materials') {
      return [
        { label: 'Total Assets', value: materialMetadata.totalCount, sub: 'Resource Inventory', icon: Package, color: 'primary' },
        { label: 'Procurements', value: 'Active', sub: 'Supply Chain', icon: ArrowDownRight, color: 'success' },
        { label: 'Distributions', value: 'Logged', sub: 'Internal Release', icon: ArrowUpRight, color: 'accent' },
        { label: 'Registry Health', value: 'Secured', icon: Shield, color: 'warning' },
      ];
    } else {
      const stats = responsibilityAnalyticsData?.data || {};
      return [
        { label: 'Active Protocols', value: stats.activeResponsibilities || 0, sub: `Total ${stats.totalResponsibilities || 0} Registry Load`, icon: Shield, color: 'primary' },
        { label: 'Mission Pulse', value: stats.totalAssignments || 0, sub: `${stats.utilizationRate || 0}% Utilization`, icon: Activity, color: 'success' },
        { label: 'Jurisdiction', value: stats.totalEstimatedHoursPerWeek || 0, sub: 'Total Weekly Load', icon: Building, color: 'warning' },
        { label: 'Credit Stream', value: formatCurrency((stats.totalHoursEstimated || 0) * 10), sub: 'Projected Allocations', icon: DollarSign, color: 'accent' },
      ];
    }
  }, [activeTab, spacesList, categoriesList, distributionData, materialMetadata, responsibilityAnalyticsData]);

  // Tab path router transition
  const handleTabChange = (newTab) => {
    navigate(`/dashboard/infra/${newTab}`);
  };

  if (isOffline && (
    (activeTab === 'spaces' && !spacesList.length) || 
    (activeTab === 'materials' && !materialsList.length) ||
    (activeTab === 'responsibilities' && !responsibilitiesList.length)
  )) {
    return (
      <div className="max-w-full p-4 flex items-center justify-center">
        <NoConnection onRetry={refetchAll} />
      </div>
    );
  }

  return (
    <div className={`max-w-full px-3 py-1 flex flex-col h-[calc(100vh-1.5rem)] overflow-hidden space-y-3`}>
      
      {/* 1. Header */}
      <InfraHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAdd={
          activeTab === 'spaces'
            ? () => { resetSpace(); setActiveFormType('space'); }
            : activeTab === 'materials'
              ? () => { resetMaterial({}); setActiveFormType('material'); }
              : () => {
                  resetResponsibility({
                    name: "",
                    description: "",
                    employeeType: "teacher",
                    priority: "medium",
                    estimatedHoursPerWeek: 0,
                    compensation: 0,
                    startDate: new Date().toISOString().split("T")[0],
                    endDate: "",
                    isActive: true,
                  });
                  setActiveFormType('responsibility');
                }
        }
        onCategories={() => setShowCategoryView(true)}
        onBulkImport={() => setBulkModalOpen(true)}
      />

      {/* 2. KPIs */}
      <InfraKPIs
        kpis={kpis}
        isLoading={
          activeTab === 'spaces'
            ? spacesLoading
            : activeTab === 'materials'
              ? materialsLoading
              : responsibilitiesLoading || responsibilityAnalyticsFetching
        }
      />

      {/* 3. Main Data Card Container */}
      <GlassCard className="flex-1 flex flex-col overflow-hidden p-3 bg-slate-500/5 dark:bg-white/[0.01] border-slate-200 dark:border-white/5" glowColor="primary" dense>
        
        {/* Critical Alerts Banner (Only show on responsibilities tab) */}
        {activeTab === 'responsibilities' && alerts.length > 0 && (
          <div className="mb-3 flex-shrink-0">
            <CriticalAlertsBanner
              alerts={alerts}
              isLoading={alertsLoading}
              onDismiss={(i) => setDismissedAlerts(prev => [...prev, i])}
              onNavigate={(alert) => {
                toast.info(`Navigate to assign ${alert.responsibilityName} in ${alert.spaceName}`);
              }}
            />
          </div>
        )}

        {/* Toolbar */}
        <InfraToolbar
          search={
            activeTab === 'spaces'
              ? spaceSearch
              : activeTab === 'materials'
                ? materialSearch
                : responsibilitySearch
          }
          onSearchChange={
            activeTab === 'spaces'
              ? setSpaceSearch
              : activeTab === 'materials'
                ? setMaterialSearch
                : setResponsibilitySearch
          }
          searchPlaceholder={
            activeTab === 'spaces'
              ? "Search spaces..."
              : activeTab === 'materials'
                ? "Search materials..."
                : "Search responsibilities..."
          }
          isFetching={
            activeTab === 'spaces'
              ? spacesFetching
              : activeTab === 'materials'
                ? materialsFetching
                : responsibilitiesFetching || responsibilityAnalyticsFetching
          }
          onRefresh={refetchAll}
          showSpaceFilters={activeTab === 'spaces'}
          categoryFilter={spaceCategoryFilter}
          onCategoryFilterChange={setSpaceCategoryFilter}
          categories={categoriesWithAll}
          statusFilter={spaceStatusFilter}
          onStatusFilterChange={setSpaceStatusFilter}
          showMaterialFilters={activeTab === 'materials'}
          materialFilter={materialFilter}
          onMaterialFilterChange={(val) => { setMaterialFilter(val); setMaterialPage(1); }}
          showResponsibilityFilters={activeTab === 'responsibilities'}
          respTypeFilter={respTypeFilter}
          onRespTypeFilterChange={setRespTypeFilter}
          onExportCsv={handleExportCsv}
          showReportMenu={showReportMenu}
          setShowReportMenu={setShowReportMenu}
          reportDateRange={reportDateRange}
          onReportDateRangeChange={setReportDateRange}
          onExportPdf={handleExportPdf}
        />

        {/* Data List / Grid */}
        <div className="flex-1 overflow-y-auto py-3 no-scrollbar">
          {activeTab === 'spaces' ? (
            // Spaces View (List style)
            spacesLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SpaceListItemSkeleton key={i} />
                ))}
              </div>
            ) : filteredSpaces.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-60">
                <Box size={24} className="mb-2 text-slate-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Spaces Found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredSpaces.map((space, idx) => (
                  <SpaceListItem
                    key={space.spaceId || space.id || idx}
                    space={space}
                    status={getSpaceStatus(space)}
                    respCount={spaceResponsibilityCount[space.spaceId || space.spaceName] || 0}
                    onDetails={setDetailSpace}
                    onEdit={(s) => { setEditingItem(s); resetSpace(s); setActiveFormType('space'); }}
                    onDelete={handleDeleteSpace}
                    index={idx}
                  />
                ))}
              </div>
            )
          ) : activeTab === 'materials' ? (
            // Materials View (List style, matching Spaces layout)
            materialsLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <MaterialListItemSkeleton key={i} />
                ))}
              </div>
            ) : materialsList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-60">
                <Package size={24} className="mb-2 text-slate-555" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-450">No Materials Found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {materialsList.map((m, idx) => (
                  <MaterialListItem
                    key={m.materialName || idx}
                    material={m}
                    formatCurrency={formatCurrency}
                    onEdit={(mat) => { setEditingItem(mat); resetMaterial(mat); setActiveFormType('material'); }}
                    onDelete={handleDeleteMaterial}
                    onTransactionIn={() => { 
                      setTransactionType("buy"); 
                      setTransactionMaterial(m); 
                      setTransactionValue("quantity", 1); 
                      setTransactionValue("unitPrice", m.unitPrice); 
                    }}
                    onTransactionOut={() => { 
                      setTransactionType("sell"); 
                      setTransactionMaterial(m); 
                      setTransactionValue("quantity", 1); 
                      setTransactionValue("unitPrice", m.unitPrice); 
                    }}
                    index={idx}
                  />
                ))}
              </div>
            )
          ) : (
            // Responsibilities View (List style)
            responsibilitiesLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ResponsibilityListItemSkeleton key={i} />
                ))}
              </div>
            ) : filteredResponsibilities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-60">
                <Shield size={24} className="mb-2 text-slate-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Protocols Found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredResponsibilities.map((r, idx) => (
                  <ResponsibilityListItem
                    key={r.responsibilityId || r.id || idx}
                    responsibility={r}
                    onEdit={openEditResponsibility}
                    onDelete={handleDeleteResponsibility}
                    onViewDetails={(resp) => setSelectedResponsibilityId(resp.responsibilityId || resp.id)}
                    onBulkAssign={setBulkAssignTarget}
                    index={idx}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Pagination (contextual) */}
        {activeTab === 'materials' && materialMetadata.totalCount > limit && (
          <InfraPagination
            page={materialPage}
            totalPages={materialMetadata.totalPages}
            onPageChange={setMaterialPage}
          />
        )}
      </GlassCard>

      {/* 4. Modals and Forms */}
      {portalTarget && createPortal(
        <AnimatePresence>
          {/* Unified Dynamic Add/Edit Modal */}
          {activeFormType && formConfig && (
            <FormWidget
              layout="dialog"
              backdropPosition="absolute"
              title={formConfig.title}
              description={formConfig.description}
              sections={formConfig.sections}
              control={formConfig.control}
              onSubmit={formConfig.onSubmit}
              onCancel={handleFormClose}
              submitLabel={formConfig.submitLabel}
              isLoading={formConfig.isLoading}
              dense
            />
          )}

          {/* Material Form consolidated into unified FormWidget */}

          {/* Transaction Buy/Sell Modal */}
          <TransactionModal
            isOpen={!!(transactionMaterial && transactionType)}
            type={transactionType}
            material={transactionMaterial}
            onClose={() => { setTransactionType(""); setTransactionMaterial(null); }}
            control={transactionControl}
            onSubmit={handleTransactionSubmit(onTransactionSubmit)}
            submitLabel={transactionType === "buy" ? "Execute Procurement" : "Execute Distribution"}
            transactionQty={transactionQty}
            transactionPriceInput={transactionPriceInput}
          />

          {/* Category Manager Modal */}
          <CategoryManagerModal
            isOpen={showCategoryView}
            onClose={() => setShowCategoryView(false)}
            newCategoryName={newCategoryName}
            onCategoryNameChange={setNewCategoryName}
            onCreate={handleCreateCategory}
            categories={categoriesData}
            onDelete={deleteSpaceCategory}
            schoolId={schoolId}
          />

          {/* Space Detail Modal */}
          {detailSpace && (
            <SpaceDetailModal
              schoolId={schoolId}
              space={detailSpace}
              spaces={spacesList}
              allSpaces={spacesList}
              onClose={() => setDetailSpace(null)}
              onClone={handleCloneSpace}
            />
          )}

          {/* Clone Space Modal */}
          {cloneModalOpen && (
            <CloneSpaceModal
              schoolId={schoolId}
              spaces={spacesList}
              onClose={() => { setCloneModalOpen(false); setCloneSource(null); }}
              onClone={handleCloneSubmit}
            />
          )}

          {/* Transfer Material Modal */}
          {transferTarget && (
            <TransferMaterialModal
              schoolId={schoolId}
              spaces={spacesList}
              material={transferTarget.material}
              fromSpace={transferTarget.space}
              materials={transferTarget.materials}
              onClose={() => setTransferTarget(null)}
              onTransfer={async (args) => {
                try {
                  await transferMaterial(args).unwrap();
                  toast.success('Material transferred');
                  refetchSpaces();
                } catch (e) {
                  toast.error(e?.data?.message || 'Transfer failed');
                }
              }}
            />
          )}

          {/* Responsibility Form consolidated into unified FormWidget */}

          {/* Responsibility Detail View Modal */}
          {selectedResponsibilityId && (
            <ResponsibilityDetailView
              schoolId={schoolId}
              responsibilityId={selectedResponsibilityId}
              onClose={() => setSelectedResponsibilityId(null)}
            />
          )}

          {/* Bulk Assign Modal */}
          {bulkAssignTarget && (
            <BulkAssignModal
              schoolId={schoolId}
              responsibility={bulkAssignTarget}
              onClose={() => setBulkAssignTarget(null)}
              onSuccess={() => {}}
            />
          )}
        </AnimatePresence>,
        portalTarget
      )}
      {bulkModalOpen && (
        <BulkImportModal
          type="spaces"
          schoolId={schoolId}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => { toast.success("Bulk Import Synchronized"); refetchSpaces(); }}
        />
      )}
    </div>
  );
}