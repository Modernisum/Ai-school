import React from 'react';
import { motion } from 'framer-motion';
import { Search, Edit3, Trash2, Eye, AlertTriangle, CheckCircle, Box, Filter } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';
import BudgetIndicator from './BudgetIndicator';

const ITEMS_PER_PAGE = 20;

export default function SpaceDataGrid({
  spaces,
  materialsBySpace,
  spaceResponsibilityCount,
  isLoading,
  search,
  onSearchChange,
  onViewDetails,
  onEdit,
  onDelete,
}) {
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [categoryFilter, setCategoryFilter] = React.useState('all');

  const categories = React.useMemo(() => {
    const cats = new Set((spaces || []).map(s => s.spaceCategory || 'Uncategorized'));
    return ['all', ...Array.from(cats)];
  }, [spaces]);

  const getSpaceStatus = React.useCallback((space) => {
    const name = space.spaceId || space.name;
    const mats = materialsBySpace?.[name] || [];
    const deficits = mats.filter(m => m.status === 'deficit');
    const hasMaterials = mats.length > 0;
    if (deficits.length > 0) return 'deficient';
    if (hasMaterials) return 'full';
    return 'unset';
  }, [materialsBySpace]);

  const filtered = React.useMemo(() => {
    let result = spaces || [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => (s.spaceName || s.name || '').toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') {
      result = result.filter(s => (s.spaceCategory || 'Uncategorized') === categoryFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(s => getSpaceStatus(s) === statusFilter);
    }
    return result;
  }, [spaces, search, categoryFilter, statusFilter, getSpaceStatus]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  React.useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-1">
        {[1, 2, 3, 4, 5].map(i => <SkeletonLoader key={i} variant="card" className="h-12" />)}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between bg-white dark:bg-slate-900/40 p-1.5 rounded-xl border border-slate-100 dark:border-white/10">
        <div className="relative group w-full md:w-64">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-micro text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 transition-all font-bold tracking-tight placeholder:text-slate-400 dark:placeholder:text-slate-600"
            placeholder="Search spaces..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <select
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-800 dark:text-white uppercase tracking-tight focus:outline-none focus:border-primary/50"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
          <select
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-800 dark:text-white uppercase tracking-tight focus:outline-none focus:border-primary/50"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="full">Full</option>
            <option value="deficient">Deficient</option>
            <option value="unset">Unset</option>
          </select>
        </div>
      </div>

      <div className="space-y-0.5">
        {paginated.length === 0 ? (
          <div className="py-8 text-center glass-card border-dashed flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <Box size={20} className="mb-2" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em]">No Spaces Found</p>
          </div>
        ) : (
          paginated.map((space, i) => {
            const name = space.spaceName || space.name || '';
            const status = getSpaceStatus(space);
            const respCount = spaceResponsibilityCount?.[space.spaceId || name] || 0;
            const statusIcon = status === 'full' ? CheckCircle : status === 'deficient' ? AlertTriangle : Box;
            const statusColor = status === 'full' ? 'text-green-500 dark:text-green-400' : status === 'deficient' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-600';
            const spaceMats = materialsBySpace?.[name] || [];
            const totalValue = spaceMats.reduce((sum, m) => sum + (m.unitPrice || 0) * (m.quantity || 0), 0);
            return (
              <GlassCard key={space.spaceId || space.id || i} hover delay={i * 0.005} dense className="bg-white/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between p-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Box size={10} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-800 dark:text-white tracking-tighter truncate">{name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest">{space.spaceCategory || 'General'}</span>
                        <statusIcon size={7} className={statusColor} />
                        {space.budget !== undefined && space.budget !== null && (
                          <BudgetIndicator totalValue={totalValue} budget={space.budget} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{respCount} RSP</p>
                    </div>
                    <StandardButton variant="ghost" size="xs" icon={Eye} onClick={() => onViewDetails(space)} />
                    <StandardButton variant="ghost" size="xs" icon={Edit3} onClick={() => onEdit(space)} />
                    <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => onDelete(space)} className="text-rose-500" />
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                  pageNum === page 
                    ? 'bg-primary text-white' 
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <span className="text-[7px] font-black text-slate-500 dark:text-slate-650 ml-1">/{totalPages}</span>
        </div>
      )}
    </div>
  );
}
