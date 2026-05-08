import { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, SlidersHorizontal } from 'lucide-react';
import EmptyState from './EmptyState.jsx';

/**
 * Enterprise DataTable with sorting, filtering, pagination, selection.
 *
 * @param {Array} columns - [{ key, label, sortable, render, width }]
 * @param {Array} rows - Data rows
 * @param {string} rowKey - Unique key field for each row
 * @param {boolean} selectable - Enable row selection
 * @param {Array} selectedIds - Controlled selected IDs
 * @param {Function} onSelectionChange - (selectedIds) => void
 * @param {number} pageSize - Rows per page (0 = no pagination)
 * @param {Function} onRowClick - (row) => void
 * @param {ReactNode} emptyState - Custom empty state
 * @param {string} searchPlaceholder
 * @param {Array} filters - [{ key, label, options: [{value, label}] }]
 * @param {Object} activeFilters - { key: value }
 * @param {Function} onFilterChange - (key, value) => void
 * @param {string} className
 */
export default function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  pageSize = 0,
  onRowClick,
  emptyState,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters = [],
  activeFilters = {},
  onFilterChange,
  className = '',
  loading = false,
  bulkActions,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const handleSort = useCallback((key) => {
    if (!columns.find(c => c.key === key)?.sortable) return;
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }, [sortKey, columns]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = pageSize > 0 ? Math.ceil(sortedRows.length / pageSize) : 1;
  const pagedRows = pageSize > 0 ? sortedRows.slice(page * pageSize, (page + 1) * pageSize) : sortedRows;

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < rows.length;

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.([]);
    else onSelectionChange?.(rows.map(r => r[rowKey]));
  };

  const toggleRow = (id) => {
    if (selectedIds.includes(id)) onSelectionChange?.(selectedIds.filter(i => i !== id));
    else onSelectionChange?.([...selectedIds, id]);
  };

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={10} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className={`table-container ${className}`}>
      {/* Toolbar */}
      {(onSearchChange || filters.length > 0 || bulkActions) && (
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            {onSearchChange && (
              <div className="search-box" style={{ maxWidth: 260 }}>
                <Search size={14} />
                <input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={e => { onSearchChange(e.target.value); setPage(0); }}
                />
              </div>
            )}
            {filters.map(f => (
              <select
                key={f.key}
                className="form-select"
                style={{ width: 'auto', maxWidth: 160, padding: '6px 28px 6px 10px', fontSize: 'var(--text-xs)' }}
                value={activeFilters[f.key] || ''}
                onChange={e => { onFilterChange?.(f.key, e.target.value); setPage(0); }}
              >
                <option value="">{f.label}</option>
                {f.options.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ))}
            {selectedIds.length > 0 && bulkActions && (
              <span className="text-xs text-secondary">{selectedIds.length} selected</span>
            )}
          </div>
          <div className="table-toolbar-right">
            {selectedIds.length > 0 && bulkActions}
            <span className="table-count">{rows.length} total</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'sortable' : ''}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {selectable && <td><div className="skeleton" style={{ width: 16, height: 16 }} /></td>}
                  {columns.map(col => (
                    <td key={col.key}><div className="skeleton skeleton-text" style={{ width: `${Math.max(40, Math.random() * 120 + 40)}px` }} /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  {emptyState || <EmptyState title="No records found" />}
                </td>
              </tr>
            ) : (
              pagedRows.map(row => (
                <tr
                  key={row[rowKey]}
                  className={selectedIds.includes(row[rowKey]) ? 'selected' : ''}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : undefined }}
                >
                  {selectable && (
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row[rowKey])}
                        onChange={() => toggleRow(row[rowKey])}
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="table-footer">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="table-pagination">
            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = totalPages <= 7 ? i : page < 3 ? i : page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i;
              return (
                <button key={pageNum} className={`page-btn ${pageNum === page ? 'active' : ''}`} onClick={() => setPage(pageNum)}>
                  {pageNum + 1}
                </button>
              );
            })}
            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Format currency
 */
export function formatCurrency(n, currency = '₹') {
  if (n == null) return '-';
  return `${currency}${Number(n).toLocaleString('en-IN')}`;
}

/**
 * Helper: Format date
 */
export function formatDate(d, style = 'short') {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  if (style === 'relative') {
    const diff = Date.now() - dt.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
