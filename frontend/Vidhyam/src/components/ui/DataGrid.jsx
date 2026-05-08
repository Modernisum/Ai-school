import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Search, Filter, RefreshCw, X } from 'lucide-react';
import GlassCard from './GlassCard';

// ─── Skeleton Loader Component ────────────────────────────────────────────────
const SkeletonRow = ({ columns, actions }) => (
  <tr className="animate-pulse">
    {columns.map((_, i) => (
      <td key={i} className="p-4">
        <div className="h-2 bg-white/5 rounded-full w-24" />
      </td>
    ))}
    {actions && (
      <td className="p-4 text-right">
        <div className="h-6 w-16 bg-white/5 rounded-lg ml-auto" />
      </td>
    )}
  </tr>
);

// ─── Structured Filter Field Renderer ─────────────────────────────────────────
const FilterField = ({ field }) => {
  const { type, label, value = '', onChange, options = [], placeholder } = field;

  const inputClass = "w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/40 transition-all";
  const labelClass = "text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block";

  switch (type) {
    case 'select':
      return (
        <div>
          {label && <label className={labelClass}>{label}</label>}
          <select className={inputClass} value={value} onChange={(e) => onChange?.(e.target.value)}>
            {options.map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    case 'date':
      return (
        <div>
          {label && <label className={labelClass}>{label}</label>}
          <input type="date" className={inputClass} value={value} onChange={(e) => onChange?.(e.target.value)} />
        </div>
      );
    case 'time':
      return (
        <div>
          {label && <label className={labelClass}>{label}</label>}
          <input type="time" className={inputClass} value={value} onChange={(e) => onChange?.(e.target.value)} />
        </div>
      );
    case 'text':
    default:
      return (
        <div>
          {label && <label className={labelClass}>{label}</label>}
          <input type="text" className={inputClass} value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder || ''} />
        </div>
      );
  }
};

export default function DataGrid({ 
  title, 
  subtitle, 
  columns = [], 
  rows = [], 
  isLoading = false,
  emptyMessage = "No Data Detected",
  actions,
  headerActions,
  // Search & Filter Props
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  // Structured filter definitions (alternative to raw JSX filters)
  filterDefinitions = [],
  onApplyFilters,
  onClearFilters,
  onRefresh,
  showSearch = false,
  itemsPerPage = 10
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Determine if we have any filters
  const hasFilters = (filters && filters.length > 0) || (filterDefinitions && filterDefinitions.length > 0);

  // Reset page when data or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length, searchValue]);

  // Optimized Pagination & Data Slicing
  const { totalPages, currentRows, startIndex } = React.useMemo(() => {
    const total = Math.max(1, Math.ceil(rows.length / itemsPerPage));
    const start = (currentPage - 1) * itemsPerPage;
    const currentSlice = rows.slice(start, start + itemsPerPage);
    return { totalPages: total, currentRows: currentSlice, startIndex: start };
  }, [rows, currentPage, itemsPerPage]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const handleApply = () => {
    onApplyFilters?.();
    setShowFilterDropdown(false);
  };

  const handleClear = () => {
    onClearFilters?.();
  };

  return (
    <GlassCard className="overflow-hidden border-none shadow-2xl bg-white/[0.01]" glowColor="primary">
      {/* Header Section */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Title & Total Count */}
          <div className="flex items-center gap-3 shrink-0">
            {title && (
              <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                {title}
              </h3>
            )}
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">
              {rows?.length || 0} Total
            </span>
          </div>

          {/* Right: Search, Filters & Actions */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap w-full lg:w-auto">
            {showSearch && (
              <div className="relative flex-1 lg:w-64 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={14} className="text-slate-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.08] border border-white/10 focus:border-primary/50 text-white text-xs rounded-xl focus:outline-none transition-all placeholder:text-slate-600 font-medium"
                />
              </div>
            )}
            
            {/* Filters */}
            {hasFilters && (
              <div className="relative">
                <button 
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center border shrink-0 ${showFilterDropdown ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/10'}`}
                >
                  <Filter size={14} />
                </button>
                
                <AnimatePresence>
                  {showFilterDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 lg:right-0 top-full mt-2 w-80 p-4 rounded-2xl bg-[#0f111a] border border-white/10 shadow-2xl shadow-black/50 z-50 backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Filters</h4>
                        <div className="flex items-center gap-2">
                          {onClearFilters && (
                            <button onClick={handleClear} className="text-[9px] text-slate-500 hover:text-white font-bold uppercase transition-colors flex items-center gap-1">
                              <X size={10} /> Clear
                            </button>
                          )}
                          <button onClick={handleApply} className="text-[9px] text-primary hover:text-white font-bold uppercase transition-colors">
                            Apply
                          </button>
                        </div>
                      </div>

                      {/* Structured filter definitions */}
                      {filterDefinitions && filterDefinitions.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {filterDefinitions.map((field, idx) => (
                            <div key={idx} className={field.className || ''}>
                              <FilterField field={field} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Legacy raw JSX filters */}
                      {filters && filters.length > 0 && (
                        <div className="flex flex-col gap-3">
                          {filters.map((filter, idx) => (
                            <div key={idx} className="w-full">
                              {filter}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Refresh Button */}
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-2 shrink-0"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            )}

            {/* Additional Header Actions */}
            {headerActions && (
              <div className="flex items-center gap-2 shrink-0 border-l border-white/10 pl-2 ml-1">
                {headerActions}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Grid Content */}
      <div className="overflow-x-auto custom-scrollbar p-2">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-white/[0.03]">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left border-b border-white/5 ${col.className || ''}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
              {actions && <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-white/5">Protocol</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
               // Loading Skeletons
               [...Array(5)].map((_, i) => <SkeletonRow key={i} columns={columns} actions={!!actions} />)
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-32 opacity-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-white/5">
                    <MoreHorizontal size={32} className="text-white" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest italic">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              <AnimatePresence mode="popLayout">
                {currentRows.map((row, rowIdx) => (
                  <motion.tr 
                    layout
                    key={row.id || rowIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rowIdx * 0.03 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`p-4 ${col.className || ''}`}>
                        {col.render ? col.render(row[col.key], row) : (
                          <span className="text-xs font-medium text-slate-300">
                            {row[col.key] || '---'}
                          </span>
                        )}
                      </td>
                    ))}
                    {actions && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {rows.length > 0 && (
        <div className={`p-4 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, idx) => (
              <button
                key={idx}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                disabled={typeof page !== 'number' || isLoading}
                className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black transition-all ${
                  currentPage === page 
                    ? 'bg-primary/20 text-primary border border-primary/30' 
                    : typeof page === 'number' 
                      ? 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                      : 'text-slate-600 cursor-default'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
