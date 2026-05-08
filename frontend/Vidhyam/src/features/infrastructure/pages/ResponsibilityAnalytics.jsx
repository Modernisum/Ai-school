import React, { useState } from 'react';
import { 
  TrendingUp, Shield, Users, Building, 
  DollarSign, Download, Zap, Activity,
  Filter, Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';

import PageHeader from '../../../components/ui/PageHeader';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import ChartWidget from '../../../components/ui/ChartWidget';
import StandardButton from '../../../components/ui/StandardButton';

import { 
  useGetOverviewAnalyticsQuery,
  useExportResponsibilitiesCSVQuery
} from '../infrastructureApi';

const ResponsibilityAnalytics = ({ schoolId }) => {
  const [timeRange, setTimeRange] = useState('30d');
  
  // Queries
  const { 
    data: analyticsData, 
    isFetching, 
    refetch 
  } = useGetOverviewAnalyticsQuery({ schoolId, timeRange });

  const stats = analyticsData?.data || {};

  const handleExport = () => {
    toast.info('Generating Mission Protocol Ledger...');
    // Real export would use useExportResponsibilitiesCSVQuery
  };

  // Prepare data for ChartWidget
  // 1. Personnel Class distribution (Pie/Donut)
  const classDistribution = stats.byEmployeeType ? Object.entries(stats.byEmployeeType).map(([label, value]) => ({
    label: label.toUpperCase(),
    value
  })) : [];

  // 2. Priority Mix
  const priorityMix = stats.byPriority ? Object.entries(stats.byPriority).map(([label, value]) => ({
    label: label.toUpperCase(),
    value
  })) : [];

  // Mocking trend data if not in API spec for time range
  const workloadTrend = [
    { label: 'WEEK 01', value: 45 },
    { label: 'WEEK 02', value: 52 },
    { label: 'WEEK 03', value: 48 },
    { label: 'WEEK 04', value: 65 }
  ];

  return (
    <div className="max-w-full p-1 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <PageHeader
        title="OPERATIONAL"
        accentTitle="INTELLIGENCE"
        subtitle="Jurisdictional Telemetry Sequence Active"
        icon={TrendingUp}
        actions={[
          {
            label: "EXPORT_LEDGER",
            onClick: handleExport,
            variant: "ghost",
            size: "xs",
            icon: Download
          },
          {
            label: "SYNC_TELEMETRY",
            onClick: refetch,
            variant: "primary",
            size: "xs",
            icon: Zap
          }
        ]}
      />

      {/* Global Metrics */}
      <KPIWidget columns={4} dense>
         <KPITile label="FLEET_LOAD" value={stats.totalResponsibilities || 0} sub="PROTOCOL_COUNT" icon={Shield} color="primary" loading={isFetching} />
         <KPITile label="PERSONNEL_DEPLOY" value={stats.totalAssignments || 0} sub="ACTIVE_UNITS" icon={Users} color="success" loading={isFetching} />
         <KPITile label="CAPACITY_USE" value={`${stats.utilizationRate || 0}%`} sub="PERF_SCORE" icon={Activity} color="warning" loading={isFetching} />
         <KPITile label="WEEKLY_FLUX" value={stats.totalEstimatedHoursPerWeek || 0} sub="HRS_LOGGED" icon={Clock} color="accent" loading={isFetching} />
      </KPIWidget>

      {/* Control Strip */}
      <div className="flex items-center justify-between gap-4 p-2 bg-white/5 border border-white/10 rounded-xl">
         <div className="flex items-center gap-2">
            <Filter size={12} className="text-slate-500" />
            <span className="text-micro font-black text-slate-700 uppercase tracking-widest leading-none">Scanning Period:</span>
            <select 
               value={timeRange} 
               onChange={(e) => setTimeRange(e.target.value)}
               className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-micro font-black text-white uppercase tracking-widest outline-none focus:border-primary/50"
            >
               <option value="7d">Last 7 Cycles</option>
               <option value="30d">Current 30D Window</option>
               <option value="90d">Quarterly Pulse</option>
            </select>
         </div>
         <p className="text-micro font-black text-slate-800 uppercase tracking-widest italic leading-none">/// TEMPORAL_SYNC_ACTIVE ///</p>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
         <ChartWidget
          type="donut"
          title="PERSONNEL_CLASS_DISTRIBUTION"
          description="Protocol density per স্টাফ unit."
          data={classDistribution}
          loading={isFetching}
          onRefresh={refetch}
          dense
        />

        <ChartWidget
          type="radar"
          title="MANDATE_PRIORITY_MATRIX"
          description="Operational criticality balance."
          data={priorityMix}
          loading={isFetching}
          dense
        />

        <ChartWidget
          type="area"
          title="DEPLOYMENT_MOMENTUM"
          description="Historical trend of responsibility nodes."
          data={workloadTrend}
          categories={['W1', 'W2', 'W3', 'W4']}
          loading={isFetching}
          className="lg:col-span-2"
          dense
        />
      </div>

      <div className="flex justify-center pt-8">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] animate-pulse">
          /// END TELEMETRY TRANSMISSION ///
        </p>
      </div>
    </div>
  );
};

// Local Clock import for compatibility if missing from lucide
import { Clock } from 'lucide-react';

export default ResponsibilityAnalytics;
