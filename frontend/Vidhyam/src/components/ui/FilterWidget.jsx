import React from 'react';
import { Search, Filter, Download, Upload, RefreshCw } from 'lucide-react';

/**
 * Common Filter Widget for subcategory pages
 * Reusable component with search, filters, and action buttons
 */
const FilterWidget = ({
  // Search props
  searchValue = '',
  onSearchChange = () => {},
  searchPlaceholder = 'Search...',
  
  // Filter props
  filters = [],
  selectedFilter = '',
  onFilterChange = () => {},
  
  // Additional filters
  additionalFilters = [],
  
  // Action buttons
  showExport = true,
  onExport = () => {},
  showImport = false,
  onImport = () => {},
  showRefresh = true,
  onRefresh = () => {},
  
  // Custom actions
  customActions = [],
  
  // Styling
  className = '',
  searchClassName = '',
  filterClassName = '',
  actionClassName = '',
  
  // Icons
  searchIcon: SearchIcon = Search,
  filterIcon: FilterIcon = Filter,
  exportIcon: ExportIcon = Download,
  importIcon: ImportIcon = Upload,
  refreshIcon: RefreshIcon = RefreshCw,
}) => {
  return (
    <div className={`bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-3xl p-6 ${className}`}>
      <div className="flex flex-col md:flex-row gap-4 items-center">
        
        {/* ─── Search Input ─── */}
        <div className="relative flex-1 group w-full">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
          <input
            className={`w-full bg-slate-500/5 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-slate-500/10 dark:focus:bg-white/[0.05] transition-all font-medium ${searchClassName}`}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* ─── Filters ─── */}
        {filters.length > 0 && (
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative">
              <FilterIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
              <select
                className={`bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-3.5 pl-10 pr-8 text-xs text-slate-800 dark:text-[var(--text-muted)] font-semibold tracking-wide focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer appearance-none ${filterClassName}`}
                value={selectedFilter}
                onChange={(e) => onFilterChange(e.target.value)}
              >
                {filters.map((filter, index) => (
                  <option key={index} value={filter.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Additional filters */}
            {additionalFilters.map((filter, index) => (
              <select
                key={index}
                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-3.5 px-4 text-xs text-slate-800 dark:text-[var(--text-muted)] font-semibold tracking-wide focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer"
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
              >
                {filter.options.map((option, optIndex) => (
                  <option key={optIndex} value={option.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}
        
        {/* ─── Action Buttons ─── */}
        <div className={`flex gap-2 w-full md:w-auto ${actionClassName}`}>
          {showRefresh && (
            <button
              onClick={onRefresh}
              className="p-3.5 rounded-2xl bg-slate-500/5 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all flex items-center gap-2"
              title="Refresh data"
            >
              <RefreshIcon size={16} />
              <span className="text-xs font-semibold tracking-wide hidden md:inline">Refresh</span>
            </button>
          )}
          
          {showExport && (
            <button
              onClick={onExport}
              className="p-3.5 rounded-2xl bg-slate-500/5 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 transition-all flex items-center gap-2"
              title="Export data"
            >
              <ExportIcon size={16} />
              <span className="text-xs font-semibold tracking-wide hidden md:inline">Export</span>
            </button>
          )}
          
          {showImport && (
            <button
              onClick={onImport}
              className="p-3.5 rounded-2xl bg-slate-500/5 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-all flex items-center gap-2"
              title="Import data"
            >
              <ImportIcon size={16} />
              <span className="text-xs font-semibold tracking-wide hidden md:inline">Import</span>
            </button>
          )}
          
          {/* Custom actions */}
          {customActions.map((action, index) => {
            const colorClass = action.color || 'blue';
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`p-3.5 rounded-2xl bg-slate-500/5 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-${colorClass}-600 dark:hover:text-${colorClass}-400 hover:border-${colorClass}-500/30 hover:bg-${colorClass}-500/5 dark:hover:bg-${colorClass}-500/10 transition-all flex items-center gap-2`}
                title={action.title}
              >
                {action.icon && <action.icon size={16} />}
                <span className="text-xs font-semibold tracking-wide hidden md:inline">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* ─── Quick Stats (Optional) ─── */}
      {filters.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-3">
          {filters.map((filter, index) => (
            filter.count !== undefined && (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${filter.color || 'bg-blue-500'}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">{filter.label}:</span>
                <span className="text-xs font-semibold text-[var(--text-main)]">{filter.count}</span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterWidget;

/**
 * Example usage:
 * 
 * <FilterWidget
 *   searchValue={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   searchPlaceholder="Search students..."
 *   filters={[
 *     { label: 'All Classes', value: 'All' },
 *     { label: 'Class 10', value: '10', count: 25, color: 'bg-emerald-500' },
 *     { label: 'Class 11', value: '11', count: 18, color: 'bg-amber-500' },
 *   ]}
 *   selectedFilter={selectedClass}
 *   onFilterChange={setSelectedClass}
 *   additionalFilters={[
 *     {
 *       value: statusFilter,
 *       onChange: setStatusFilter,
 *       options: [
 *         { label: 'All Status', value: 'All' },
 *         { label: 'Active', value: 'Active' },
 *         { label: 'Inactive', value: 'Inactive' },
 *       ]
 *     }
 *   ]}
 *   showExport={true}
 *   onExport={handleExport}
 *   showRefresh={true}
 *   onRefresh={fetchData}
 *   customActions={[
 *     {
 *       label: 'Add New',
 *       icon: Plus,
 *       color: 'emerald',
 *       onClick: handleAddNew,
 *       title: 'Add new record'
 *     }
 *   ]}
 * />
 */