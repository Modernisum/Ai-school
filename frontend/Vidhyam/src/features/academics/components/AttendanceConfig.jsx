import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage, API_BASE_URL, callApiWithBackoff } from '../../../utils/api';
import { motion } from 'framer-motion';
import {
  Settings, Bell, Clock, Mail, Save, CheckCircle, AlertTriangle,
  Loader, RefreshCw, ToggleLeft, ToggleRight, ShieldCheck, Zap
} from 'lucide-react';

const getSchoolId = () => getSchoolIdFromStorage() || '';

const DEFAULT_CONFIG = {
  auto_mark_absent_enabled: true,
  cutoff_time: '10:00',
  generate_daily_report_enabled: true,
  report_time: '18:00',
  send_email_notifications: false,
  admin_email: '',
  notify_on_unmarked: true,
  notify_on_low_attendance: true,
  low_attendance_threshold: 75,
  reminder_before_cutoff_minutes: 30,
};

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${value ? 'bg-primary' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function ConfigRow({ icon: Icon, title, description, children }) {
  return (
    <div className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">{children}</div>
    </div>
  );
}

export default function AttendanceConfig() {
  const schoolId = getSchoolId();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [dirty, setDirty] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const STORAGE_KEY = `attendance_config_${schoolId}`;

  // Load from localStorage (since backend has no dedicated settings endpoint yet)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [schoolId]);

  const set = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist to localStorage for now; swap to API call once backend endpoint exists
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      showToast('success', 'Configuration saved successfully');
      setDirty(false);
    } catch (e) {
      showToast('error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Automation Config</h2>
            <p className="text-sm text-slate-500">Control background jobs and notification behavior</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-sm hover:bg-white/10 transition-colors">
            <RefreshCw size={13} /> Reset
          </button>
          <button onClick={handleSave} disabled={!dirty || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/30 transition-colors disabled:opacity-50">
            {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Section: Auto-marking */}
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-3 flex items-center gap-2">
          <Clock size={12} /> Auto-Marking
        </p>
        <div className="space-y-3">
          <ConfigRow icon={Clock} title="Auto-mark Absent after Cutoff"
            description="Automatically marks anyone who hasn't checked in by the cutoff time as absent">
            <Toggle value={config.auto_mark_absent_enabled} onChange={v => set('auto_mark_absent_enabled', v)} />
          </ConfigRow>

          {config.auto_mark_absent_enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <ConfigRow icon={Clock} title="Cutoff Time" description="Time after which absent is auto-applied (school local time, 24h format)">
                <input type="time" className="input-dark" value={config.cutoff_time}
                  onChange={e => set('cutoff_time', e.target.value)} />
              </ConfigRow>
              <div className="mt-3">
                <ConfigRow icon={Bell} title="Reminder Before Cutoff"
                  description="Send reminder notification X minutes before cutoff fires">
                  <select className="input-dark" value={config.reminder_before_cutoff_minutes}
                    onChange={e => set('reminder_before_cutoff_minutes', parseInt(e.target.value))}>
                    {[0, 15, 30, 45, 60].map(m => (
                      <option key={m} value={m}>{m === 0 ? 'No reminder' : `${m} min before`}</option>
                    ))}
                  </select>
                </ConfigRow>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Section: Daily Reports */}
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-3 flex items-center gap-2">
          <ShieldCheck size={12} /> Daily Reports
        </p>
        <div className="space-y-3">
          <ConfigRow icon={CheckCircle} title="Generate Daily Report at EOD"
            description="Auto-generate attendance summary every evening at the configured time">
            <Toggle value={config.generate_daily_report_enabled} onChange={v => set('generate_daily_report_enabled', v)} />
          </ConfigRow>

          {config.generate_daily_report_enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <ConfigRow icon={Clock} title="Report Generation Time" description="When to generate and optionally email the daily report">
                <input type="time" className="input-dark" value={config.report_time}
                  onChange={e => set('report_time', e.target.value)} />
              </ConfigRow>
            </motion.div>
          )}
        </div>
      </div>

      {/* Section: Email Notifications */}
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-3 flex items-center gap-2">
          <Mail size={12} /> Email Notifications
        </p>
        <div className="space-y-3">
          <ConfigRow icon={Mail} title="Enable Email Notifications"
            description="Send summary emails to school admins (requires SMTP configured on backend)">
            <Toggle value={config.send_email_notifications} onChange={v => set('send_email_notifications', v)} />
          </ConfigRow>

          {config.send_email_notifications && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <ConfigRow icon={Mail} title="Admin Email" description="Email address to receive daily summaries">
                <input type="email" className="input-dark w-56" placeholder="admin@school.edu"
                  value={config.admin_email} onChange={e => set('admin_email', e.target.value)} />
              </ConfigRow>
            </motion.div>
          )}

          <ConfigRow icon={AlertTriangle} title="Notify on Unmarked Attendance"
            description="Alert admin when some students/employees haven't been marked by mid-day">
            <Toggle value={config.notify_on_unmarked} onChange={v => set('notify_on_unmarked', v)} />
          </ConfigRow>

          <ConfigRow icon={AlertTriangle} title="Notify on Low Attendance"
            description="Alert admin when class attendance drops below threshold">
            <div className="flex items-center gap-2">
              <Toggle value={config.notify_on_low_attendance} onChange={v => set('notify_on_low_attendance', v)} />
              {config.notify_on_low_attendance && (
                <select className="input-dark" value={config.low_attendance_threshold}
                  onChange={e => set('low_attendance_threshold', parseInt(e.target.value))}>
                  {[60, 65, 70, 75, 80, 85].map(t => (
                    <option key={t} value={t}>Below {t}%</option>
                  ))}
                </select>
              )}
            </div>
          </ConfigRow>
        </div>
      </div>

      {/* Status Note */}
      <div className="glass-card p-4 flex items-start gap-3 border border-blue-500/20 bg-blue-500/5">
        <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          Background jobs run automatically on the server. These settings are stored locally and will override defaults once a backend settings API endpoint is wired. Auto-marking and daily reports run via the Rust background worker already configured in <code className="text-blue-200">background_jobs.rs</code>.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-rose-500/20 border border-rose-500/30 text-rose-400'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </motion.div>
      )}
    </div>
  );
}
