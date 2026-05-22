import React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Edit3, Trash2, Eye, AlertTriangle, CheckCircle, Box, 
  Layers, Plus, Upload, RefreshCw, X, Package, Shield, 
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Minimize2, Briefcase,
  Users, Clock, UserPlus, ExternalLink, Zap, FileText, Download, Building, Activity
} from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';
import StandardButton from '../../../components/ui/StandardButton';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import FormWidget from '../../../components/ui/FormWidget';

// ── Unified Header ──
export function InfraHeader({ activeTab, onTabChange, onAdd, onCategories, onBulkImport }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 py-1 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
          <Box size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">Infrastructure Hub</h1>
          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Manage school sectors, rooms, material assets and responsibilities</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => onTabChange('spaces')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'spaces'
              ? 'bg-primary text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Sectors &amp; Spaces
        </button>
        <button
          onClick={() => onTabChange('materials')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'materials'
              ? 'bg-primary text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Material Assets
        </button>
        <button
          onClick={() => onTabChange('responsibilities')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'responsibilities'
              ? 'bg-primary text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Responsibilities
        </button>
      </div>

      {/* Contextual Actions */}
      <div className="flex items-center gap-1.5">
        {activeTab === 'spaces' ? (
          <>
            <StandardButton label="Add Space" icon={Plus} size="xs" onClick={onAdd} />
            <StandardButton label="Categories" variant="ghost" icon={Layers} size="xs" onClick={onCategories} />
            <StandardButton label="Import Bulk" variant="ghost" icon={Upload} size="xs" onClick={onBulkImport} />
          </>
        ) : activeTab === 'materials' ? (
          <StandardButton label="Add Asset" icon={Plus} size="xs" onClick={onAdd} />
        ) : activeTab === 'responsibilities' ? (
          <StandardButton label="Add Protocol" icon={Plus} size="xs" onClick={onAdd} />
        ) : null}
      </div>
    </div>
  );
}

// ── Unified KPI Widget ──
export function InfraKPIs({ kpis, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-xl bg-white/5 border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex-shrink-0">
      <KPIWidget columns={4} dense>
        {kpis.map((k, idx) => (
          <KPITile 
            key={idx}
            label={k.label}
            value={k.value}
            sub={k.sub}
            icon={k.icon}
            color={k.color}
          />
        ))}
      </KPIWidget>
    </div>
  );
}

// ── Unified Search Toolbar ──
export function InfraToolbar({ 
  search, 
  onSearchChange, 
  searchPlaceholder, 
  isFetching, 
  onRefresh,
  // Space filters
  showSpaceFilters,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  statusFilter,
  onStatusFilterChange,
  // Material filters
  showMaterialFilters,
  materialFilter,
  onMaterialFilterChange,
  // Responsibility filters
  showResponsibilityFilters,
  respTypeFilter,
  onRespTypeFilterChange,
  onExportCsv,
  showReportMenu,
  setShowReportMenu,
  reportDateRange,
  onReportDateRangeChange,
  onExportPdf,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-2 items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
      <div className="relative group w-full md:w-80">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
        <input
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-850 dark:text-white focus:outline-none focus:border-primary/50 transition-all font-semibold tracking-wide placeholder:text-slate-400 dark:placeholder:text-slate-600"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1.5 relative">
        {/* Space Filters */}
        {showSpaceFilters && (
          <>
            <select
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary/50"
              value={categoryFilter}
              onChange={e => onCategoryFilterChange(e.target.value)}
            >
              {(categories || []).map(c => (
                <option key={c} value={c} className="bg-slate-900 text-white">{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
            <select
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary/50"
              value={statusFilter}
              onChange={e => onStatusFilterChange(e.target.value)}
            >
              <option value="all" className="bg-slate-900 text-white">All Statuses</option>
              <option value="full" className="bg-slate-900 text-white">Full</option>
              <option value="deficient" className="bg-slate-900 text-white">Deficient</option>
              <option value="unset" className="bg-slate-900 text-white">Unset</option>
            </select>
          </>
        )}

        {/* Material Filters */}
        {showMaterialFilters && (
          <select
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary/50"
            value={materialFilter}
            onChange={e => onMaterialFilterChange(e.target.value)}
          >
            <option value="All Inventory" className="bg-slate-900 text-white">All Inventory</option>
            <option value="Shortage" className="bg-slate-900 text-white">Shortage</option>
            <option value="Low Stock" className="bg-slate-900 text-white">Low Stock</option>
            <option value="Out of Stock" className="bg-slate-900 text-white">Out of Stock</option>
          </select>
        )}

        {/* Responsibility Filters & Reports */}
        {showResponsibilityFilters && (
          <>
            <select
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary/50"
              value={respTypeFilter}
              onChange={e => onRespTypeFilterChange(e.target.value)}
            >
              <option value="all" className="bg-slate-900 text-white">All Types</option>
              <option value="teacher" className="bg-slate-900 text-white">Teaching</option>
              <option value="staff" className="bg-slate-900 text-white">Staff</option>
              <option value="administrator" className="bg-slate-900 text-white">Management</option>
              <option value="operational" className="bg-slate-900 text-white">Operational</option>
            </select>

            <StandardButton 
              variant="ghost" 
              icon={Download} 
              size="xs" 
              label="CSV"
              onClick={onExportCsv} 
            />

            <div className="relative">
              <StandardButton
                icon={FileText}
                label="REPORTS"
                variant="ghost"
                size="xs"
                onClick={() => setShowReportMenu(!showReportMenu)}
              />
              {showReportMenu && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Date Range Selection</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={reportDateRange.start}
                      onChange={(e) => onReportDateRangeChange({ ...reportDateRange, start: e.target.value })}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                    />
                    <input
                      type="date"
                      value={reportDateRange.end}
                      onChange={(e) => onReportDateRangeChange({ ...reportDateRange, end: e.target.value })}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <StandardButton
                      icon={Activity}
                      label="UTILIZATION"
                      variant="ghost"
                      size="xs"
                      onClick={() => onExportPdf("utilization")}
                    />
                    <StandardButton
                      icon={Clock}
                      label="WORKLOAD"
                      variant="ghost"
                      size="xs"
                      onClick={() => onExportPdf("workload")}
                    />
                    <StandardButton
                      icon={Layers}
                      label="SPACES"
                      variant="ghost"
                      size="xs"
                      onClick={() => onExportPdf("space-distribution")}
                    />
                    <StandardButton
                      icon={Building}
                      label="REVENUE"
                      variant="ghost"
                      size="xs"
                      onClick={() => onExportPdf("revenue")}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <StandardButton 
          variant="ghost" 
          icon={RefreshCw} 
          size="xs" 
          onClick={onRefresh} 
          className={isFetching ? "animate-spin" : ""} 
        />
      </div>
    </div>
  );
}

// ── Space Row Item ──
export function SpaceListItem({ space, status, respCount, onDetails, onEdit, onDelete, index }) {
  const name = space.spaceName || space.name || '';
  const statusIcon = status === 'full' ? CheckCircle : status === 'deficient' ? AlertTriangle : Box;
  const statusColor = status === 'full' ? 'text-green-500 dark:text-green-400' : status === 'deficient' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-650';

  return (
    <GlassCard hover delay={index * 0.005} dense className="bg-white/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Box size={12} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-white tracking-tight truncate">{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-semibold text-primary/60 dark:text-primary/40 uppercase tracking-wider">{space.spaceCategory || 'General'}</span>
              <statusIcon size={8} className={statusColor} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{respCount} Assigned Staff</p>
          </div>
          <StandardButton variant="ghost" size="xs" icon={Eye} onClick={() => onDetails(space)} />
          <StandardButton variant="ghost" size="xs" icon={Edit3} onClick={() => onEdit(space)} />
          <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => onDelete(space)} className="text-rose-500" />
        </div>
      </div>
    </GlassCard>
  );
}

// ── Material Grid Item ──
export function MaterialCardGridItem({ material: m, onEdit, onDelete, onTransactionIn, onTransactionOut, formatCurrency }) {
  return (
    <GlassCard hover delay={0} className="group flex flex-col h-full bg-slate-500/5 dark:bg-white/[0.01]" glowColor="primary" dense>
      <div className="p-2.5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-1.5">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-transform">
            <Package size={12} />
          </div>
          <div className="flex gap-0.5">
            <StandardButton variant="ghost" size="xs" icon={Edit3} onClick={() => onEdit(m)} className="opacity-0 group-hover:opacity-100" />
            <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => onDelete(m.materialName)} className="text-rose-500 opacity-0 group-hover:opacity-100" />
          </div>
        </div>

        <div className="space-y-0.5 mb-2">
          <span className="text-[10px] font-black text-primary/60 dark:text-primary/40 uppercase tracking-widest leading-none">{m.unitPrice ? formatCurrency(m.unitPrice) : "—"}</span>
          <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-tight truncate leading-tight">{m.materialName}</h3>
        </div>

        <div className="mt-auto pt-2 border-t border-slate-200 dark:border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">Stock</p>
            <span className={`text-[10px] font-bold leading-none ${m.quantity < 10 ? "text-rose-500 animate-pulse" : "text-slate-650 dark:text-slate-400"}`}>{m.quantity} Units</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">Spaces</p>
            <span className="text-[9px] font-bold text-primary/60 leading-none flex items-center gap-1">
              <Layers size={8} />
              {m.space_count || m.assignedSpaces || "0"}
            </span>
          </div>
          <div className="flex gap-1.5 pt-1">
            <StandardButton size="xs" className="flex-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/10 font-bold" onClick={onTransactionIn}>IN</StandardButton>
            <StandardButton size="xs" className="flex-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/10 font-bold" onClick={onTransactionOut}>OUT</StandardButton>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Unified Pagination ──
export function InfraPagination({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <StandardButton icon={ChevronLeft} size="xs" variant="ghost" onClick={() => onPageChange(page - 1)} disabled={page === 1} />
        <span className="px-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-8">Page {page} of {totalPages}</span>
        <StandardButton icon={ChevronRight} size="xs" variant="ghost" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} />
      </div>
    </div>
  );
}

// ── Category Manager Modal ──
export function CategoryManagerModal({ isOpen, onClose, newCategoryName, onCategoryNameChange, onCreate, categories, onDelete, schoolId }) {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/60">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-2xl">
        <GlassCard title="Category Manager" onClose={onClose} className="p-4" glowColor="accent" dense>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Add New Category</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 font-bold placeholder:text-slate-550 dark:placeholder:text-slate-600"
                    placeholder="e.g. Laboratory..."
                    value={newCategoryName}
                    onChange={e => onCategoryNameChange(e.target.value)}
                  />
                  <StandardButton icon={Plus} size="xs" onClick={onCreate} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Categories</p>
              <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {categories?.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                    <span className="text-xs font-semibold text-slate-800 dark:text-white">{typeof c === "string" ? c : c.name}</span>
                    <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => onDelete({ schoolId, categoryId: c.id || c })} className="text-rose-500 opacity-0 group-hover:opacity-100 animate-in fade-in" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

// ── Transaction Buy/Sell Modal ──
export function TransactionModal({ isOpen, type, material, onClose, control, onSubmit, submitLabel, transactionQty, transactionPriceInput }) {
  if (!isOpen || !material) return null;
  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="relative w-full max-w-md z-10 pointer-events-auto">
        <GlassCard dense glowColor={type === "buy" ? "success" : "warning"} className="p-4 bg-white dark:bg-slate-950 border border-white/10 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              {type === "buy" ? "Procure" : "Distribute"} — {material.materialName}
            </h3>
            <button onClick={onClose} className="text-slate-505 hover:text-slate-800 dark:hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <FormWidget
            sections={[
              {
                id: "tx",
                label: "Transaction Details",
                icon: RefreshCw,
                fields: [
                  { name: "quantity", label: "Quantity", type: "number", required: true, labelIcon: ChevronRight, placeholder: "Enter amount..." },
                  { name: "unitPrice", label: "Price per Unit (₹)", type: "number", required: true, labelIcon: ChevronRight, placeholder: "Enter price..." },
                  {
                    name: "total",
                    label: "Total Amount",
                    type: "custom",
                    render: () => (
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Calculated Total</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white italic">₹{(transactionQty * transactionPriceInput).toFixed(2)}</span>
                      </div>
                    ),
                  },
                ],
              }
            ]}
            control={control}
            onSubmit={onSubmit}
            onCancel={onClose}
            submitLabel={submitLabel}
            dense
            noTabs
          />
        </GlassCard>
      </motion.div>
    </div>
  );
}

// ── Space Row Item Skeleton ──
export function SpaceListItemSkeleton() {
  return (
    <GlassCard dense className="bg-white/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 animate-pulse">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0" />
          <div className="space-y-1 flex-1 max-w-[200px]">
            <div className="h-3 bg-slate-200 dark:bg-white/15 rounded w-3/4" />
            <div className="h-2.5 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-16 h-3 bg-slate-200 dark:bg-white/10 rounded hidden sm:block mr-2" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
        </div>
      </div>
    </GlassCard>
  );
}

// ── Material Grid Item Skeleton ──
export function MaterialCardGridItemSkeleton() {
  return (
    <GlassCard className="flex flex-col h-full bg-slate-500/5 dark:bg-white/[0.01] animate-pulse" dense>
      <div className="p-2.5 flex flex-col h-full space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10" />
        </div>

        <div className="space-y-1.5">
          <div className="h-2.5 bg-slate-200 dark:bg-white/15 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
        </div>

        <div className="mt-auto pt-2 border-t border-slate-200 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-1/4" />
            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-1/4" />
            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-1/5" />
          </div>
          <div className="flex gap-1.5 pt-1">
            <div className="h-5 bg-slate-200 dark:bg-white/10 rounded flex-1" />
            <div className="h-5 bg-slate-200 dark:bg-white/10 rounded flex-1" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Material Row Item ──
export function MaterialListItem({ material: m, onEdit, onDelete, onTransactionIn, onTransactionOut, formatCurrency, index }) {
  return (
    <GlassCard hover delay={index * 0.005} dense className="bg-white/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package size={12} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-white tracking-tight truncate">{m.materialName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-semibold text-primary/60 dark:text-primary/40 uppercase tracking-wider">
                {m.unitPrice ? formatCurrency(m.unitPrice) : "—"} per unit
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block mr-2 space-y-0.5">
            <p className={`text-[9px] font-bold uppercase tracking-widest ${m.quantity < 10 ? "text-rose-500 animate-pulse" : "text-slate-550 dark:text-slate-400"}`}>
              Stock: {m.quantity} Units
            </p>
            <p className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {m.space_count || m.assignedSpaces || "0"} Spaces
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <StandardButton 
              size="xs" 
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/10 font-bold px-2 py-0.5" 
              onClick={onTransactionIn}
            >
              IN
            </StandardButton>
            <StandardButton 
              size="xs" 
              className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/10 font-bold px-2 py-0.5" 
              onClick={onTransactionOut}
            >
              OUT
            </StandardButton>
            <StandardButton variant="ghost" size="xs" icon={Edit3} onClick={() => onEdit(m)} />
            <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => onDelete(m.materialName)} className="text-rose-500" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Material Row Item Skeleton ──
export function MaterialListItemSkeleton() {
  return (
    <GlassCard dense className="bg-white/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 animate-pulse">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0" />
          <div className="space-y-1 flex-1 max-w-[200px]">
            <div className="h-3 bg-slate-200 dark:bg-white/15 rounded w-3/4" />
            <div className="h-2.5 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-20 h-4 bg-slate-200 dark:bg-white/10 rounded hidden sm:block mr-2" />
          <div className="w-8 h-5 bg-slate-200 dark:bg-white/10 rounded-md" />
          <div className="w-8 h-5 bg-slate-200 dark:bg-white/10 rounded-md" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
        </div>
      </div>
    </GlassCard>
  );
}

// ── Responsibility Row Item ──
export function ResponsibilityListItem({ responsibility: r, onEdit, onDelete, onViewDetails, onBulkAssign, index }) {
  const name = r.name || '';
  const priorityColor = r.priority === 'high' 
    ? 'text-rose-500 dark:text-rose-400' 
    : r.priority === 'medium' 
      ? 'text-amber-500 dark:text-amber-400' 
      : 'text-emerald-500 dark:text-emerald-400';
      
  return (
    <GlassCard hover delay={index * 0.005} dense className="bg-white/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield size={12} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-white tracking-tight truncate">{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-semibold text-primary/60 dark:text-primary/40 uppercase tracking-wider">{r.employeeType || 'All Staff'}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${priorityColor}`}>{r.priority || 'low'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block mr-2 space-y-0.5">
            <p className="text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest leading-none">
              Load: {r.estimatedHoursPerWeek || 0}H / Week
            </p>
            <p className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
              Compensation: ₹{r.compensation || 0}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <StandardButton 
              size="xs" 
              className="bg-primary/10 text-primary border-primary/10 font-bold px-2 py-0.5" 
              onClick={() => onBulkAssign(r)}
            >
              ASSIGN
            </StandardButton>
            <StandardButton variant="ghost" size="xs" icon={Eye} onClick={() => onViewDetails(r)} />
            <StandardButton variant="ghost" size="xs" icon={Edit3} onClick={() => onEdit(r)} />
            <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => onDelete(r.responsibilityId || r.id)} className="text-rose-500" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Responsibility Row Item Skeleton ──
export function ResponsibilityListItemSkeleton() {
  return (
    <GlassCard dense className="bg-white/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 animate-pulse">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0" />
          <div className="space-y-1 flex-1 max-w-[200px]">
            <div className="h-3 bg-slate-200 dark:bg-white/15 rounded w-3/4" />
            <div className="h-2.5 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-20 h-4 bg-slate-200 dark:bg-white/10 rounded hidden sm:block mr-2" />
          <div className="w-12 h-5 bg-slate-200 dark:bg-white/10 rounded-md" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
          <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
        </div>
      </div>
    </GlassCard>
  );
}
