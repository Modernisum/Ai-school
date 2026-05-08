import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, Loader, RefreshCw, CheckCircle, AlertTriangle, 
  X, Clock, User, Eye, Download, FileText, ChevronRight,
  ShieldAlert, Activity, ClipboardList, ExternalLink, Trash2,
  Filter, Search, MoreHorizontal
} from 'lucide-react';
import { toast } from 'react-toastify';

import { selectPollingInterval } from '../../settings/settingsSlice';
import { useGetComplaintsQuery } from '../infrastructureApi';
import { useWebSockets } from '../../../hooks/useWebSockets';
import PageHeader from '../../../components/ui/PageHeader';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import GlassCard from '../../../components/ui/GlassCard';
import StandardButton from '../../../components/ui/StandardButton';
import DataGrid from '../../../components/ui/DataGrid';
import ChartWidget from '../../../components/ui/ChartWidget';

const getSchoolId = () => localStorage.getItem('schoolId') || "";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

export default function ComplainManagement() {
  const schoolId = getSchoolId();
  const pollingInterval = useSelector(selectPollingInterval);
  const { data: complainsData, isLoading, isFetching, refetch } = useGetComplaintsQuery(schoolId, { pollingInterval });
  const { messages } = useWebSockets(schoolId);
  
  const [viewComplain, setViewComplain] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const complains = complainsData?.data || [];

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.type === 'complaint' || lastMsg.category === 'complaint') {
        if (schoolId) refetch();
        toast.info('Neural Pulse: New entry recorded in protocol logs');
      }
    }
  }, [messages, refetch, schoolId]);

  const statusMap = {
    'pending': { color: 'warning', label: 'AUDIT PENDING' },
    'resolved': { color: 'success', label: 'MANDATE RESOLVED' },
    'dismissed': { color: 'primary', label: 'VOIDED' },
  };

  // Filter complaints based on search and filters
  const filteredComplains = useMemo(() => {
    return complains.filter(complain => {
      // Search filter
      if (search && !complain.title?.toLowerCase().includes(search.toLowerCase()) && 
          !complain.description?.toLowerCase().includes(search.toLowerCase()) &&
          !complain.studentId?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && complain.status?.toLowerCase() !== statusFilter) {
        return false;
      }
      
      // Date filter (simple implementation)
      if (dateFilter) {
        const complainDate = new Date(complain.createdAt).toISOString().split('T')[0];
        if (complainDate !== dateFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [complains, search, statusFilter, dateFilter]);

  // DataGrid columns
  const columns = [
    {
      key: 'title',
      header: 'REPORT TITLE',
      width: '25%',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${row.status?.toLowerCase() === 'pending' ? 'bg-amber-500' : 'bg-success'}`} />
          <span className="text-xs font-black text-white italic tracking-tighter uppercase truncate max-w-[180px]">
            {value || 'UNNAMED EXCEPTION'}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'STATUS',
      width: '15%',
      render: (value) => {
        const status = value?.toLowerCase();
        const statusInfo = statusMap[status] || { color: 'primary', label: 'RECORDS LOGGED' };
        return (
          <span className={`text-micro font-black px-1.5 py-0.5 rounded border tracking-widest leading-none ${
            status === 'pending' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
            status === 'resolved' ? 'bg-success/10 border-success/30 text-success' :
            'bg-primary/10 border-primary/30 text-primary'
          }`}>
            {statusInfo.label}
          </span>
        );
      }
    },
    {
      key: 'studentId',
      header: 'SOURCE NODE',
      width: '15%',
      render: (value) => (
        <span className="text-xs font-bold text-slate-500 uppercase italic tracking-tighter">
          {value || 'EXTERNAL'}
        </span>
      )
    },
    {
      key: 'description',
      header: 'INCIDENT NARRATIVE',
      width: '30%',
      render: (value) => (
        <span className="text-xs text-slate-400 truncate max-w-[250px] block">
          {value || 'No detailed data packets available for this sector.'}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'TIMESTAMP',
      width: '15%',
      render: (value) => (
        <span className="text-micro font-black text-slate-600 uppercase tracking-tighter">
          {fmtDate(value)}
        </span>
      )
    }
  ];

  // Actions for each row
  const rowActions = (row) => (
    <>
      <StandardButton 
        variant="ghost" 
        size="xs" 
        icon={Eye}
        onClick={() => setViewComplain(row)}
        tooltip="View Details"
      />
      <StandardButton 
        variant="ghost" 
        size="xs" 
        icon={ExternalLink}
        onClick={() => window.open(`/dashboard/notifications/complains/${row.id}`, '_blank')}
        tooltip="Open in Notifications"
      />
    </>
  );

  // Filter definitions for structured filtering
  const filterDefinitions = [
    {
      type: 'select',
      label: 'STATUS',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: 'ALL STATUS' },
        { value: 'pending', label: 'PENDING' },
        { value: 'resolved', label: 'RESOLVED' },
        { value: 'dismissed', label: 'DISMISSED' }
      ]
    },
    {
      type: 'date',
      label: 'DATE',
      value: dateFilter,
      onChange: setDateFilter,
      placeholder: 'Filter by date'
    }
  ];

  const handleApplyFilters = () => {
    // Filters are already applied via state
    toast.success('Filters applied');
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
    toast.info('Filters cleared');
  };

  // Generate weekly complaint data for chart
  const weeklyComplaintData = useMemo(() => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = Array(7).fill(0);
    
    complains.forEach(complain => {
      if (complain.createdAt) {
        const date = new Date(complain.createdAt);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        weekData[dayOfWeek]++;
      }
    });
    
    return daysOfWeek.map((day, index) => ({
      day,
      complaints: weekData[index]
    }));
  }, [complains]);

  // Chart data for weekly complaints
  const chartData = weeklyComplaintData.map(item => ({
    name: item.day,
    value: item.complaints
  }));

  const chartCategories = weeklyComplaintData.map(item => item.day);

  return (
    <div className="space-y-2 p-1 max-w-full">
      <PageHeader
        title="PROTOCOL"
        accentTitle="REPORTS"
        subtitle="SYSTEM_INTEGRITY: AUDIT_PROTOCOL"
        icon={ShieldAlert}
        actions={[
          { label: "SYNC", onClick: () => refetch(), icon: RefreshCw, variant: "ghost", size: "xs" }
        ]}
      />

      <KPIWidget columns={4}>
         <KPITile label="Active Reports" value={complains.length} sub="REALTIME_BACKLOG" icon={ClipboardList} color="primary" />
         <KPITile label="Pending Audit" value={complains.filter(c => c.status?.toLowerCase() === 'pending').length} sub="URGENT_ATTENTION" icon={AlertCircle} color="warning" />
         <KPITile label="Weekly Trend" value={chartData.reduce((sum, item) => sum + item.value, 0)} sub="7-DAY ANALYSIS" icon={Activity} color="success" />
         <KPITile label="Log Protocol" value="ACTIVE" sub="WEBSOCKET_LINKED" icon={Activity} color="accent" />
      </KPIWidget>

      {/* Weekly Complaint Chart */}
      <GlassCard className="p-3" glowColor="primary">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">WEEKLY COMPLAINT DISTRIBUTION</h3>
            <p className="text-micro text-slate-500 font-bold uppercase tracking-tighter">7-DAY TREND ANALYSIS</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-micro font-black text-slate-500 uppercase tracking-widest">
              Total: {chartData.reduce((sum, item) => sum + item.value, 0)} complaints
            </span>
          </div>
        </div>
        <ChartWidget
          type="bar"
          data={chartData}
          categories={chartCategories}
          title=""
          description="Complaints by day of week"
          height={200}
          showLegend={false}
          showGrid={true}
          colors={['#60a5fa']}
        />
      </GlassCard>

      <DataGrid
        title="PROTOCOL REPORTS"
        subtitle={`${filteredComplains.length} of ${complains.length} exceptions detected`}
        columns={columns}
        rows={filteredComplains}
        isLoading={isLoading}
        emptyMessage="NO_INTEGRITY_EXCEPTIONS_FOUND"
        actions={rowActions}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reports, descriptions, or source nodes..."
        filterDefinitions={filterDefinitions}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onRefresh={refetch}
        showSearch={true}
        itemsPerPage={10}
      />

      <AnimatePresence>
        {viewComplain && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
              onClick={() => setViewComplain(null)}
            />
            <motion.div 
              initial={{ x: 100, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: 100, opacity: 0 }} 
              className="relative w-full max-w-2xl z-10 pointer-events-auto h-fit max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
            <GlassCard title="REPORT_INVESTIGATION" onClose={() => setViewComplain(null)} className="p-3" glowColor={statusMap[viewComplain.status?.toLowerCase()]?.color || 'primary'} dense>
                <div className="space-y-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-white italic tracking-tighter uppercase">{viewComplain.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-micro font-black px-1.5 py-0.5 rounded border tracking-widest ${
                          viewComplain.status?.toLowerCase() === 'pending' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-success/10 border-success/30 text-success'
                        }`}>
                          {statusMap[viewComplain.status?.toLowerCase()]?.label || 'COMMITTED'}
                        </span>
                        <span className="text-micro font-black text-slate-600 uppercase tracking-tighter">{fmtDate(viewComplain.createdAt)}</span>
                      </div>
                    </div>
                    {viewComplain.attachmentUrl && (
                      <a href={viewComplain.attachmentUrl} target="_blank" rel="noreferrer" className="pointer-events-auto">
                        <StandardButton label="VIEW_MEDIA" icon={Eye} variant="primary" size="xs" />
                      </a>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                    <p className="text-micro font-black text-slate-600 uppercase tracking-widest">INCIDENT_NARRATIVE</p>
                    <p className="text-xxs font-bold text-slate-400 leading-tight italic">"{viewComplain.description}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-micro font-black text-slate-600 uppercase tracking-widest mb-0.5 text-right">MANDATE_ORIGIN</p>
                        <div className="flex items-center gap-2 justify-end text-right">
                          <p className="text-xxs font-black text-white uppercase italic">{viewComplain.studentId}</p>
                          <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-slate-500"><User size={12}/></div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-micro font-black text-slate-600 uppercase tracking-widest mb-0.5">AUDIT_CATEGORY</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-slate-500"><FileText size={12}/></div>
                          <p className="text-xxs font-black text-white uppercase italic">{viewComplain.category || 'GENERAL'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-white/5 pointer-events-auto">
                     <StandardButton label="RESOLVE_MANDATE" className="flex-1" icon={CheckCircle} size="xs" onClick={() => { toast.info('Protocol optimization in progress...'); setViewComplain(null); }} />
                     <StandardButton label="VOID" variant="ghost" className="flex-1 text-rose-400 hover:bg-rose-500/10" size="xs" icon={Trash2} onClick={() => { toast.error('Void requested'); setViewComplain(null); }} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
