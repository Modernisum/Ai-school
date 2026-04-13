import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion } from 'framer-motion';
import {
  Settings,
  Clock,
  Bell,
  DollarSign,
  Shield,
  Save,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Zap,
  Calendar,
  Mail,
  Smartphone,
  Database
} from 'lucide-react';
import { toast } from 'react-toastify';

const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

export default function AttendanceAutomationConfig() {
  const schoolId = getSchoolIdFromStorage() || "";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [automationStatus, setAutomationStatus] = useState({});
  const [config, setConfig] = useState({
    autoMarkAbsentEnabled: true,
    autoMarkCutoffTime: "10:00",
    dailyReportEnabled: true,
    dailyReportTime: "18:00",
    smsNotificationsEnabled: false,
    emailNotificationsEnabled: true,
    notificationRecipients: ["admin", "teachers"],
    payrollIntegrationEnabled: true,
    autoDeductionEnabled: true,
    deductionRate: 1.0, // 100% of daily rate for absent
    halfDayDeductionRate: 0.5, // 50% of daily rate
    lateDeductionRate: 0.25, // 25% of daily rate
    systemHealthMonitoring: true,
    healthCheckInterval: 3600, // seconds
    maxRetryAttempts: 3,
    enableDebugLogging: false
  });

  // Fetch current automation configuration
  const fetchAutomationConfig = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API}/operations/attendance/${schoolId}/automation-config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig(prev => ({ ...prev, ...data.config }));
        }
      }
    } catch (error) {
      console.error('Error fetching automation config:', error);
      toast.error('Failed to load automation configuration');
    } finally {
      setLoading(false);
    }
  };

  // Fetch automation status
  const fetchAutomationStatus = async () => {
    if (!schoolId) return;
    
    try {
      const response = await fetch(`${API}/operations/attendance/${schoolId}/automation-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAutomationStatus(data);
      }
    } catch (error) {
      console.error('Error fetching automation status:', error);
    }
  };

  // Save configuration
  const saveConfig = async () => {
    if (!schoolId) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API}/operations/attendance/${schoolId}/automation-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        toast.success('Automation configuration saved successfully');
        fetchAutomationStatus();
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Trigger manual auto-marking
  const triggerAutoMark = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API}/operations/attendance/${schoolId}/trigger-auto-mark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Auto-marking completed: ${data.marked_count} users marked as absent`);
        fetchAutomationStatus();
      } else {
        toast.error('Failed to trigger auto-marking');
      }
    } catch (error) {
      console.error('Error triggering auto-mark:', error);
      toast.error('Failed to trigger auto-marking');
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual report generation
  const triggerReportGeneration = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API}/operations/attendance/${schoolId}/trigger-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Daily report generated successfully');
        fetchAutomationStatus();
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error triggering report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Check system health
  const checkSystemHealth = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API}/operations/attendance/${schoolId}/health-check`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`System health: ${data.status}`);
        setAutomationStatus(prev => ({ ...prev, health: data }));
      } else {
        toast.error('Failed to check system health');
      }
    } catch (error) {
      console.error('Error checking health:', error);
      toast.error('Failed to check system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      fetchAutomationConfig();
      fetchAutomationStatus();
    }
  }, [schoolId]);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleTimeChange = (key, value) => {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(value)) {
      handleConfigChange(key, value);
    }
  };

  const handleRecipientToggle = (recipient) => {
    const currentRecipients = [...config.notificationRecipients];
    const index = currentRecipients.indexOf(recipient);
    
    if (index > -1) {
      currentRecipients.splice(index, 1);
    } else {
      currentRecipients.push(recipient);
    }
    
    handleConfigChange('notificationRecipients', currentRecipients);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Attendance Automation</h2>
            <p className="text-gray-600">Configure automated attendance management</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchAutomationStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800">Auto-Marking</h3>
              <p className="text-sm text-blue-600">Daily at {config.autoMarkCutoffTime}</p>
            </div>
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${automationStatus.autoMarkLastRun ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {automationStatus.autoMarkLastRun ? `Last run: ${new Date(automationStatus.autoMarkLastRun).toLocaleString()}` : 'Never run'}
            </span>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Daily Reports</h3>
              <p className="text-sm text-green-600">Daily at {config.dailyReportTime}</p>
            </div>
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${automationStatus.reportLastRun ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {automationStatus.reportLastRun ? `Last run: ${new Date(automationStatus.reportLastRun).toLocaleString()}` : 'Never run'}
            </span>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-purple-800">System Health</h3>
              <p className="text-sm text-purple-600">Monitoring enabled</p>
            </div>
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${automationStatus.health?.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {automationStatus.health?.status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Automation Settings */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-5 rounded-xl border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Auto-Marking Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">Enable Auto-Mark Absent</label>
                  <p className="text-sm text-gray-500">Automatically mark absent after cutoff time</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoMarkAbsentEnabled}
                    onChange={(e) => handleConfigChange('autoMarkAbsentEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cutoff Time
                </label>
                <input
                  type="time"
                  value={config.autoMarkCutoffTime}
                  onChange={(e) => handleTimeChange('autoMarkCutoffTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!config.autoMarkAbsentEnabled}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Users without attendance marked by this time will be auto-marked as absent
                </p>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={triggerAutoMark}
                  disabled={loading || !config.autoMarkAbsentEnabled}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>Run Auto-Mark Now</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">SMS Notifications</label>
                  <p className="text-sm text-gray-500">Send SMS for unmarked attendance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.smsNotificationsEnabled}
                    onChange={(e) => handleConfigChange('smsNotificationsEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">Email Notifications</label>
                  <p className="text-sm text-gray-500">Send email reports to admins</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.emailNotificationsEnabled}
                    onChange={(e) => handleConfigChange('emailNotificationsEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Recipients
                </label>
                <div className="space-y-2">
                  {['admin', 'teachers', 'parents', 'students'].map((recipient) => (
                    <div key={recipient} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`recipient-${recipient}`}
                        checked={config.notificationRecipients.includes(recipient)}
                        onChange={() => handleRecipientToggle(recipient)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`recipient-${recipient}`} className="ml-2 text-sm text-gray-700 capitalize">
                        {recipient}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payroll & System Settings */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-5 rounded-xl border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Payroll Integration
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">Enable Payroll Integration</label>
                  <p className="text-sm text-gray-500">Automatically apply attendance deductions to payroll</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.payrollIntegrationEnabled}
                    onChange={(e) => handleConfigChange('payrollIntegrationEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">Auto-Deduction</label>
                  <p className="text-sm text-gray-500">Automatically deduct salary for absences</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoDeductionEnabled}
                    onChange={(e) => handleConfigChange('autoDeductionEnabled', e.target.checked)}
                    className="sr-only peer"
                    disabled={!config.payrollIntegrationEnabled}
                  />
                  <div className={`w-11 h-6 ${!config.payrollIntegrationEnabled ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${config.payrollIntegrationEnabled ? 'peer-checked:bg-green-600' : ''}`}></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Absent Deduction Rate (% of daily rate)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={config.deductionRate * 100}
                    onChange={(e) => handleConfigChange('deductionRate', parseFloat(e.target.value) / 100)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    disabled={!config.payrollIntegrationEnabled || !config.autoDeductionEnabled}
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>0%</span>
                    <span className="font-medium">{Math.round(config.deductionRate * 100)}%</span>
                    <span>200%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Half-Day Deduction Rate
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.halfDayDeductionRate * 100}
                    onChange={(e) => handleConfigChange('halfDayDeductionRate', parseFloat(e.target.value) / 100)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    disabled={!config.payrollIntegrationEnabled || !config.autoDeductionEnabled}
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>0%</span>
                    <span className="font-medium">{Math.round(config.halfDayDeductionRate * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Late Arrival Deduction Rate
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={config.lateDeductionRate * 100}
                    onChange={(e) => handleConfigChange('lateDeductionRate', parseFloat(e.target.value) / 100)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    disabled={!config.payrollIntegrationEnabled || !config.autoDeductionEnabled}
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>0%</span>
                    <span className="font-medium">{Math.round(config.lateDeductionRate * 100)}%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              System Health & Monitoring
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">System Health Monitoring</label>
                  <p className="text-sm text-gray-500">Monitor automation system health</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.systemHealthMonitoring}
                    onChange={(e) => handleConfigChange('systemHealthMonitoring', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Health Check Interval (seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="86400"
                  value={config.healthCheckInterval}
                  onChange={(e) => handleConfigChange('healthCheckInterval', parseInt(e.target.value) || 3600)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!config.systemHealthMonitoring}
                />
                <p className="text-sm text-gray-500 mt-1">
                  How often to check system health (60-86400 seconds)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Retry Attempts
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.maxRetryAttempts}
                  onChange={(e) => handleConfigChange('maxRetryAttempts', parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Number of retry attempts for failed automation jobs
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <label className="font-medium text-gray-700">Debug Logging</label>
                  <p className="text-sm text-gray-500">Enable detailed debug logging</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableDebugLogging}
                    onChange={(e) => handleConfigChange('enableDebugLogging', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={checkSystemHealth}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  <span>Check System Health Now</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Daily Reports
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">Enable Daily Reports</label>
                  <p className="text-sm text-gray-500">Generate daily attendance reports</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dailyReportEnabled}
                    onChange={(e) => handleConfigChange('dailyReportEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Generation Time
                </label>
                <input
                  type="time"
                  value={config.dailyReportTime}
                  onChange={(e) => handleTimeChange('dailyReportTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!config.dailyReportEnabled}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Time to generate daily attendance reports
                </p>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={triggerReportGeneration}
                  disabled={loading || !config.dailyReportEnabled}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Report Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status & Logs */}
      <div className="mt-8 bg-gray-50 p-5 rounded-xl border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium text-gray-700 mb-2">Recent Automation Runs</h4>
            {automationStatus.recentRuns?.length > 0 ? (
              <div className="space-y-2">
                {automationStatus.recentRuns.slice(0, 3).map((run, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{run.type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${run.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {run.status}
                    </span>
                    <span className="text-gray-500">{new Date(run.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent automation runs</p>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium text-gray-700 mb-2">System Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Auto-mark Success Rate</span>
                <span className="font-medium">{automationStatus.metrics?.autoMarkSuccessRate || '0'}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Report Generation Time</span>
                <span className="font-medium">{automationStatus.metrics?.avgReportTime || '0'}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Failed Jobs (24h)</span>
                <span className="font-medium">{automationStatus.metrics?.failedJobs24h || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Background Jobs</span>
                <span className="font-medium">{automationStatus.metrics?.activeJobs || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center">
          <Info className="w-5 h-5 text-blue-600 mr-2" />
          <p className="text-sm text-blue-700">
            Configuration changes will take effect immediately after saving.
            Some changes may require a system restart to apply fully.
          </p>
        </div>
      </div>
    </div>
  );
}
