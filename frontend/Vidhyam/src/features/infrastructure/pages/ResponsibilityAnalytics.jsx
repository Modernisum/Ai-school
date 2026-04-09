import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  TrendingUp, Users, Building, DollarSign, Activity,
  Download, Upload, Calendar, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function ResponsibilityAnalytics({ schoolId, showToast }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [schoolId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/responsibility/${schoolId}/overview/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      showToast('error', 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/responsibility/${schoolId}/export/csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `responsibilities_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      showToast('success', 'Exported successfully');
    } catch (error) {
      showToast('error', 'Export failed');
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Responsibilities', analytics?.totalResponsibilities || 0],
        ['Active Assignments', analytics?.activeAssignments || 0],
        ['Spaces Covered', analytics?.spacesCovered || 0],
        ['Monthly Revenue', `$${(analytics?.monthlyRevenue || 0).toFixed(2)}`],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Employee Workload sheet
      if (analytics?.employeeWorkload?.length > 0) {
        const workloadData = [
          ['Employee', 'Assignments'],
          ...analytics.employeeWorkload.map(e => [e.name, e.assignments])
        ];
        const workloadSheet = XLSX.utils.aoa_to_sheet(workloadData);
        XLSX.utils.book_append_sheet(workbook, workloadSheet, 'Employee Workload');
      }
      
      // Space Utilization sheet
      if (analytics?.spaceUtilization?.length > 0) {
        const spaceData = [
          ['Space', 'Value'],
          ...analytics.spaceUtilization.map(s => [s.name, s.value])
        ];
        const spaceSheet = XLSX.utils.aoa_to_sheet(spaceData);
        XLSX.utils.book_append_sheet(workbook, spaceSheet, 'Space Utilization');
      }
      
      // Revenue Trend sheet
      if (analytics?.revenueTrend?.length > 0) {
        const trendData = [
          ['Date', 'Revenue'],
          ...analytics.revenueTrend.map(t => [t.date, t.revenue])
        ];
        const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
        XLSX.utils.book_append_sheet(workbook, trendSheet, 'Revenue Trend');
      }
      
      // Top Responsibilities sheet
      if (analytics?.topResponsibilities?.length > 0) {
        const topData = [
          ['Name', 'Assignments', 'Spaces', 'Revenue'],
          ...analytics.topResponsibilities.map(r => [r.name, r.assignments, r.spaces, r.revenue])
        ];
        const topSheet = XLSX.utils.aoa_to_sheet(topData);
        XLSX.utils.book_append_sheet(workbook, topSheet, 'Top Responsibilities');
      }
      
      XLSX.writeFile(workbook, `responsibility_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('success', 'Excel exported successfully');
    } catch (error) {
      showToast('error', 'Excel export failed');
    }
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/responsibility/${schoolId}/import/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showToast('success', `Imported ${data.count} responsibilities`);
        fetchAnalytics();
      }
    } catch (error) {
      showToast('error', 'Import failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Mission Analytics</h2>
          <p className="text-slate-400 text-sm">Overview of responsibility assignments and utilization</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-lg hover:bg-primary/30 transition"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-lg hover:bg-accent/30 transition"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
          <label className="flex items-center gap-2 bg-success/20 text-success px-4 py-2 rounded-lg hover:bg-success/30 transition cursor-pointer">
            <Upload size={16} />
            Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Responsibilities', 
            value: analytics?.totalResponsibilities || 0, 
            icon: Activity, 
            color: 'text-primary' 
          },
          { 
            label: 'Active Assignments', 
            value: analytics?.activeAssignments || 0, 
            icon: Users, 
            color: 'text-success' 
          },
          { 
            label: 'Spaces Covered', 
            value: analytics?.spacesCovered || 0, 
            icon: Building, 
            color: 'text-warning' 
          },
          { 
            label: 'Monthly Revenue', 
            value: `$${(analytics?.monthlyRevenue || 0).toFixed(2)}`, 
            icon: DollarSign, 
            color: 'text-accent' 
          }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color} opacity-50`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Workload */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Employee Workload</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.employeeWorkload || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '#334155' }}
                itemStyle={{ color: '#f1f5f9' }}
              />
              <Bar dataKey="assignments" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Space Utilization */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Space Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics?.spaceUtilization || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {(analytics?.spaceUtilization || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '#334155' }}
                itemStyle={{ color: '#f1f5f9' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.revenueTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '#334155' }}
                itemStyle={{ color: '#f1f5f9' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Responsibilities Table */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Top Responsibilities by Revenue</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-sm">
                <th className="pb-3">Name</th>
                <th className="pb-3">Assignments</th>
                <th className="pb-3">Spaces</th>
                <th className="pb-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.topResponsibilities || []).map((resp, index) => (
                <tr key={index} className="border-t border-slate-700">
                  <td className="py-3 text-white">{resp.name}</td>
                  <td className="py-3 text-slate-300">{resp.assignments}</td>
                  <td className="py-3 text-slate-300">{resp.spaces}</td>
                  <td className="py-3 text-success font-semibold">${resp.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ResponsibilityAnalytics;
