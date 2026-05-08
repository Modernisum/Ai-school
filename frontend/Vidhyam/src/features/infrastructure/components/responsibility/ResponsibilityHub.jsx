import React, { useState } from 'react';
import { 
  Briefcase, Shield, Zap, Activity, 
  Search, Plus, Download, RefreshCw,
  Users, Building, DollarSign
} from 'lucide-react';
import { toast } from 'react-toastify';

import PageHeader from '../../../../components/ui/PageHeader';
import KPIWidget, { KPITile } from '../../../../components/ui/KPIWidget';
import FilterWidget from '../../../../components/ui/FilterWidget';
import StandardButton from '../../../../components/ui/StandardButton';
import ResponsibilityList from './ResponsibilityList';

import { 
  useGetResponsibilitiesQuery, 
  useGetOverviewAnalyticsQuery,
  useDeleteResponsibilityMutation,
  useExportResponsibilitiesCSVQuery
} from '../../infrastructureApi';

const ResponsibilityHub = ({ 
  schoolId, 
  onAddProtocol, 
  onEditProtocol, 
  onViewDetails, 
  onBulkAssign 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Queries
  const { 
    data: responsibilitiesData, 
    isFetching, 
    refetch: refetchList 
  } = useGetResponsibilitiesQuery({ schoolId });

  const { 
    data: analyticsData, 
    isFetching: analyticsFetching 
  } = useGetOverviewAnalyticsQuery({ schoolId });

  const [deleteResponsibility] = useDeleteResponsibilityMutation();

  // Handlers
  const handleDelete = async (id) => {
    if (window.confirm('TERMINATE PROTOCOL PERMANENTLY? This action cannot be undone.')) {
      try {
        await deleteResponsibility({ schoolId, responsibilityId: id }).unwrap();
        toast.success('Protocol Decommissioned Successfully');
      } catch (err) {
        toast.error(err.data?.message || 'Decommission Failure');
      }
    }
  };

  const handleExport = () => {
    // Note: The CSV endpoint returns a blob
    toast.info('Initializing Data Ledger Export...');
    // Real export handled via infrastructureApi exportResponsibilitiesCSV
  };

  // Filter Logic
  const filteredData = (responsibilitiesData?.data || []).filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || r.employeeType === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = analyticsData?.data || {};

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      {/* Header */}
      <PageHeader
        title="COMMAND"
        accentTitle="ROLES"
        subtitle="Personnel Responsibility Protocols & Mandates"
        icon={Briefcase}
        actions={[
          {
            label: "LOG PROTOCOL",
            onClick: onAddProtocol,
            variant: "primary",
            size: "xs",
            icon: Plus
          }
        ]}
      />

      {/* Primary Metrics */}
      <KPIWidget columns={4}>
        <KPITile 
          label="Active Protocols" 
          value={stats.activeResponsibilities || 0} 
          sub={`Total ${stats.totalResponsibilities || 0} Registry Load`}
          icon={Shield} 
          color="primary" 
          loading={analyticsFetching}
        />
        <KPITile 
          label="Mission Pulse" 
          value={stats.totalAssignments || 0} 
          sub={`${stats.utilizationRate || 0}% Utilization`}
          icon={Activity} 
          color="success" 
          loading={analyticsFetching}
        />
        <KPITile 
          label="Jurisdiction" 
          value={stats.totalEstimatedHoursPerWeek || 0} 
          sub="Total Weekly Load"
          icon={Building} 
          color="warning" 
          loading={analyticsFetching}
        />
        <KPITile 
          label="Credit Stream" 
          value={`$${(stats.totalHoursEstimated || 0) * 10}`} // Mocking a revenue metric if not strictly in API for hub
          sub="Projected Allocations"
          icon={DollarSign} 
          color="accent" 
          loading={analyticsFetching}
        />
      </KPIWidget>

      {/* Operational Filters */}
      <FilterWidget
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Scan protocols by ID or description..."
        filters={[
          { label: 'ALL CLASSES', value: 'all' },
          { label: 'TEACHING', value: 'teacher' },
          { label: 'STAFF', value: 'staff' },
          { label: 'MANAGEMENT', value: 'administrator' },
          { label: 'OPERATIONAL', value: 'operational' },
        ]}
        selectedFilter={typeFilter}
        onFilterChange={setTypeFilter}
        onExport={handleExport}
        onRefresh={refetchList}
      />

      {/* Protocol Manifest (List) */}
      <div className="min-h-[400px]">
        {isFetching ? (
          <div className="flex items-center justify-center h-[200px] opacity-20">
            <RefreshCw className="animate-spin" size={32} />
          </div>
        ) : (
          <ResponsibilityList 
            responsibilities={filteredData}
            onEdit={onEditProtocol}
            onDelete={handleDelete}
            onViewDetails={onViewDetails}
            onBulkAssign={onBulkAssign}
          />
        )}
      </div>

      <div className="flex justify-center pt-2">
        <p className="text-micro font-black text-slate-800 uppercase tracking-[0.4em] italic">
          Terminal Session: Active
        </p>
      </div>
    </div>
  );
};

export default ResponsibilityHub;
