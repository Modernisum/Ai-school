import React, { useState, useCallback } from "react";
import {
  Briefcase, Shield, Zap, Activity,
  Search, Plus, Download, RefreshCw,
  Users, Building, DollarSign, FileText, Calendar
} from "lucide-react";
import { toast } from "react-toastify";

import PageHeader from "../../../../components/ui/PageHeader";
import KPIWidget, { KPITile } from "../../../../components/ui/KPIWidget";
import FilterWidget from "../../../../components/ui/FilterWidget";
import StandardButton from "../../../../components/ui/StandardButton";
import ResponsibilityList from "./ResponsibilityList";

import {
  useGetResponsibilitiesQuery,
  useGetOverviewAnalyticsQuery,
  useDeleteResponsibilityMutation,
} from "../../infrastructureApi";

const ResponsibilityHub = ({
  schoolId,
  onAddProtocol,
  onEditProtocol,
  onViewDetails,
  onBulkAssign,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    start: "",
    end: "",
  });

  // Queries
  const {
    data: responsibilitiesData,
    isFetching,
    refetch: refetchList,
  } = useGetResponsibilitiesQuery({ schoolId });

  const {
    data: analyticsData,
    isFetching: analyticsFetching,
  } = useGetOverviewAnalyticsQuery({ schoolId });

  const [deleteResponsibility] = useDeleteResponsibilityMutation();

  // Handlers
  const handleDelete = async (id) => {
    if (
      window.confirm(
        "TERMINATE PROTOCOL PERMANENTLY? This action cannot be undone."
      )
    ) {
      try {
        await deleteResponsibility({
          schoolId,
          responsibilityId: id,
        }).unwrap();
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

  // Filter Logic
  const filteredData = (responsibilitiesData?.data || []).filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" || r.employeeType === typeFilter;
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
            icon: Plus,
          },
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
          value={`$${(stats.totalHoursEstimated || 0) * 10}`}
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
          { label: "ALL CLASSES", value: "all" },
          { label: "TEACHING", value: "teacher" },
          { label: "STAFF", value: "staff" },
          { label: "MANAGEMENT", value: "administrator" },
          { label: "OPERATIONAL", value: "operational" },
        ]}
        selectedFilter={typeFilter}
        onFilterChange={setTypeFilter}
        onExport={handleExportCsv}
        onRefresh={refetchList}
      />

      {/* Export Reports Dropdown */}
      <div className="flex justify-end">
        <div className="relative">
          <StandardButton
            icon={FileText}
            label="EXPORT REPORT"
            variant="ghost"
            size="xs"
            onClick={() => setShowReportMenu(!showReportMenu)}
          />
          {showReportMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 w-72 glass-card p-3 rounded-xl border border-white/10">
              <p className="text-micro font-black text-slate-800 uppercase tracking-widest mb-2">
                Date Range
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={reportDateRange.start}
                  onChange={(e) =>
                    setReportDateRange((p) => ({ ...p, start: e.target.value }))
                  }
                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-micro text-white"
                />
                <input
                  type="date"
                  value={reportDateRange.end}
                  onChange={(e) =>
                    setReportDateRange((p) => ({ ...p, end: e.target.value }))
                  }
                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-micro text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <StandardButton
                  icon={FileText}
                  label="UTILIZATION"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleExportPdf("utilization")}
                />
                <StandardButton
                  icon={FileText}
                  label="WORKLOAD"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleExportPdf("workload")}
                />
                <StandardButton
                  icon={FileText}
                  label="SPACES"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleExportPdf("space-distribution")}
                />
                <StandardButton
                  icon={FileText}
                  label="REVENUE"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleExportPdf("revenue")}
                />
              </div>
            </div>
          )}
        </div>
      </div>

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
