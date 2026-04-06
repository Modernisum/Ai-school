import React from 'react';
import { Search, Plus, DollarSign, AlertTriangle, Package, RefreshCw, Loader } from 'lucide-react';
import { useGetMaterialsDashboardQuery } from '../../infrastructureApi';
import MaterialCard from './MaterialCard';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

function MaterialsView({ materials, schoolId, onAdd, onEdit, onDelete, onBuy, onSell, onViewHistory, search, setSearch, filter, setFilter, isFetching }) {
  const { data: dashboard } = useGetMaterialsDashboardQuery(schoolId);

  return (
    <div className="p-8 space-y-12">
      {/* Strategic Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Strategic Investment', value: formatCurrency(dashboard?.totalInvestment || 0), icon: DollarSign, color: 'text-primary' },
          { label: 'Active Shortage', value: dashboard?.shortageCount || 0, icon: AlertTriangle, color: 'text-accent' },
          { label: 'Out of Stock', value: dashboard?.outOfStockCount || 0, icon: Package, color: 'text-rose-500' },
          { label: 'Low Reserves', value: dashboard?.lowStockCount || 0, icon: RefreshCw, color: 'text-yellow-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-5 hover:border-white/10 transition-all shadow-xl">
            <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} shadow-inner`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{stat.label}</p>
              <p className="text-2xl font-black text-white italic tracking-tighter mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-8 pt-4">
        <div className="relative flex-1 max-w-2xl">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-dark pl-14 py-4 text-sm uppercase tracking-widest font-black italic shadow-2xl" placeholder="Search Global Inventory Index..." value={search} onChange={e => setSearch(e.target.value)} />
          {isFetching && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
              <Loader className="animate-spin text-primary" size={18} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <select className="input-dark py-4 px-6 text-[11px] font-black uppercase tracking-widest shadow-xl" value={filter} onChange={e => setFilter(e.target.value)}>
            <option>All Inventory</option>
            <option>Shortage</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
          <button onClick={onAdd} className="btn-primary px-10 py-4 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 italic shadow-2xl shadow-primary/30"><Plus size={18} /> Provision Asset</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 min-h-[400px]">
        {materials.map((m, i) => (
          <MaterialCard 
            key={m.id || i} 
            material={m} 
            onEdit={() => onEdit(m)} 
            onDelete={() => onDelete(m.materialName)} 
            onBuy={() => onBuy(m)} 
            onSell={() => onSell(m)} 
            onViewHistory={() => onViewHistory(m)} 
          />
        ))}
        {materials.length === 0 && !isFetching && (
          <div className="col-span-full py-40 text-center bg-white/[0.01] border border-white/5 border-dashed rounded-[3rem] shadow-inner">
            <Package size={64} className="text-slate-800 mx-auto mb-6 opacity-40" />
            <p className="text-slate-500 font-black text-sm uppercase tracking-[0.3em] italic">No Assets Found in Inventory Register</p>
          </div>
        )}
        {isFetching && materials.length === 0 && (
          <div className="col-span-full py-40 text-center">
            <Loader size={48} className="animate-spin text-primary mx-auto mb-6" />
            <p className="text-slate-500 font-black text-sm uppercase tracking-[0.3em] italic">Accessing Central Registry...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MaterialsView;