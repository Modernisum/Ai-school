import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Settings, Clock, RefreshCw, Palette, 
  History, Maximize2, Minimize2, Globe, Shield, 
  Loader, Zap, LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  selectPollingInterval, setPollingInterval, 
  selectTheme, setTheme, 
  selectScreenScale, setScreenScale 
} from '../../settings/settingsSlice';
import { THEME_PRESETS } from '../../../utils/theme';
import { updateScreenScale } from '../../../utils/screenScale';
import { API_BASE_URL, getSchoolIdFromStorage, callApiWithBackoff } from '../../../utils/api';
import StandardButton from '../../../components/ui/StandardButton';
import GlassCard from '../../../components/ui/GlassCard';

export default function GeneralSettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pollingInterval = useSelector(selectPollingInterval);
  const theme = useSelector(selectTheme);
  const screenScale = useSelector(selectScreenScale);

  const [sessionDuration, setSessionDuration] = useState(24);
  const [loadingSession, setLoadingSession] = useState(false);
  const [updatingSession, setUpdatingSession] = useState(false);
  const [sessionError, setSessionError] = useState(null);

  const schoolId = getSchoolIdFromStorage();

  useEffect(() => {
    if (schoolId) {
      fetchSessionSettings();
    }
  }, [schoolId]);

  // Auto-dismiss session error after 4 seconds
  useEffect(() => {
    if (sessionError) {
      const timer = setTimeout(() => setSessionError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [sessionError]);

  const fetchSessionSettings = async () => {
    setLoadingSession(true);
    try {
      const response = await callApiWithBackoff(`${API_BASE_URL}/school/${schoolId}?filter=session`);
      if (response.success && response.data?.sessionDurationHours) {
        setSessionDuration(response.data.sessionDurationHours);
      }
    } catch (err) {
      console.error('Error fetching session settings:', err);
      // Fail silently on initial load, fallback to default 24h
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSessionChange = async (newDuration) => {
    const duration = parseInt(newDuration);
    setSessionDuration(duration);
    setUpdatingSession(true);
    setSessionError(null);
    try {
       await callApiWithBackoff(`${API_BASE_URL}/school/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionDurationHours: duration })
      });
    } catch (err) {
      console.error('Error updating session settings:', err);
      setSessionError('Update failed. Reverting...');
      fetchSessionSettings(); 
    } finally {
      setUpdatingSession(false);
    }
  };

  const handleIntervalChange = (e) => {
    dispatch(setPollingInterval(parseInt(e.target.value)));
  };

  const currentThemeId = THEME_PRESETS.find(p => p.colors.primary === theme.primary && p.mode === theme.mode)?.id || 'vidhyam-default';

  const SettingRow = ({ icon: Icon, title, subtitle, children, iconColor = "text-primary" }) => (
    <div className="flex items-center justify-between gap-4 p-3 hover:bg-white/[0.02] transition-colors rounded-xl group/row">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/row:border-white/10 transition-all ${iconColor}`}>
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wide leading-none">{title}</h3>
          <p className="text-[10px] text-slate-400 mt-1 opacity-80">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );

  const StyledSelect = ({ value, onChange, options, disabled }) => (
    <div className="relative group">
      <select 
        value={value} 
        onChange={onChange}
        disabled={disabled}
        className="appearance-none bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-xs font-semibold text-[var(--text-main)] outline-none cursor-pointer w-44 disabled:opacity-50 hover:border-primary/50 transition-all text-center"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white text-left px-2">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
        <Minimize2 size={10} className="rotate-45" />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
            <Settings size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-main)] tracking-wider leading-none">Settings</h1>
            <p className="text-xs text-slate-400 mt-1.5 opacity-80 flex items-center gap-2">
              <Settings size={12} className="text-primary" />
              Manage system preferences, performance settings, and appearance.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: General Preferences */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <Palette size={14} className="text-primary/60" />
             <h2 className="text-xs font-black text-slate-400 tracking-wider">General Preferences</h2>
          </div>
          
          <GlassCard className="divide-y divide-white/5">
            {/* Session Duration */}
            <SettingRow 
              icon={Globe} 
              title="Session Duration" 
              subtitle="Configure how long you stay logged in on this device"
            >
              {updatingSession ? (
                <Loader size={14} className="text-primary animate-spin" />
              ) : (
                <Shield size={14} className={`${sessionError ? 'text-rose-500' : 'text-emerald-500'} opacity-60`} />
              )}
              <StyledSelect 
                value={sessionDuration}
                onChange={(e) => handleSessionChange(e.target.value)}
                disabled={loadingSession || updatingSession}
                options={[
                  { value: 1, label: "1 Hour" },
                  { value: 4, label: "4 Hours" },
                  { value: 8, label: "8 Hours" },
                  { value: 12, label: "12 Hours" },
                  { value: 24, label: "24 Hours" },
                  { value: 48, label: "48 Hours" },
                  { value: 168, label: "1 Week" },
                ]}
              />
            </SettingRow>

            {/* Sync Frequency */}
            <SettingRow 
              icon={RefreshCw} 
              title="Background Sync Frequency" 
              subtitle="Set how frequently the dashboard auto-refreshes data"
              iconColor="text-indigo-400"
            >
              <Clock size={14} className="text-slate-600 opacity-60" />
              <StyledSelect 
                value={pollingInterval}
                onChange={handleIntervalChange}
                options={[
                  { value: 5000, label: "5 Seconds (Fast)" },
                  { value: 10000, label: "10 Seconds (Ideal)" },
                  { value: 20000, label: "20 Seconds (Balanced)" },
                  { value: 30000, label: "30 Seconds (Throttle)" },
                  { value: 60000, label: "1 Minute (Saver)" },
                ]}
              />
            </SettingRow>

            {/* Color Theme */}
            <SettingRow 
              icon={Palette} 
              title="Color Theme" 
              subtitle="Choose a visual color scheme for the workspace"
              iconColor="text-emerald-400"
            >
              <StyledSelect 
                value={currentThemeId}
                onChange={(e) => {
                  const preset = THEME_PRESETS.find(p => p.id === e.target.value);
                  if (preset) dispatch(setTheme({ ...preset.colors, mode: preset.mode }));
                }}
                options={THEME_PRESETS.map(p => ({ value: p.id, label: p.name }))}
              />
            </SettingRow>

            {/* Interface Scale */}
            <SettingRow 
              icon={Maximize2} 
              title="Interface Scale" 
              subtitle="Adjust the layout size of fonts and elements"
              iconColor="text-amber-500"
            >
              <StyledSelect 
                value={screenScale}
                onChange={(e) => {
                  const scale = parseFloat(e.target.value);
                  if (!isNaN(scale)) {
                    dispatch(setScreenScale(scale));
                    updateScreenScale(scale);
                  }
                }}
                options={[
                  { value: 0.7, label: "70% (Tiny)" },
                  { value: 0.8, label: "80% (Compact)" },
                  { value: 0.9, label: "90% (Normal)" },
                  { value: 1.0, label: "100% (Large)" },
                  { value: 1.15, label: "115% (Extra Large)" },
                  { value: 1.3, label: "130% (Ultra)" },
                ]}
              />
            </SettingRow>
          </GlassCard>
        </div>

        {/* Right Column: Account & Security */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <Shield size={14} className="text-primary/60" />
             <h2 className="text-xs font-black text-slate-400 tracking-wider">Account & Safety</h2>
          </div>

          <GlassCard className="divide-y divide-white/5">
            {/* Sign Out */}
            <SettingRow 
              icon={LogOut} 
              title="Sign Out" 
              subtitle="Securely end your active session on this device"
              iconColor="text-rose-400"
            >
              <button
                onClick={() => { localStorage.clear(); navigate("/"); }}
                className="px-4 py-2 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </SettingRow>

            {/* System Data Recovery */}
            <div className="p-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5 mt-0.5 flex-shrink-0">
                  <History size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xs font-bold text-white tracking-wide">System Data Recovery</h3>
                    <StandardButton 
                      variant="glow" 
                      size="sm" 
                      onClick={() => navigate('/dashboard/recovery')}
                      icon={Shield}
                      label="Start Scan"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed opacity-80">
                    Access the recovery tool to restore deleted files, student/staff records, and configurations. Session history logs are kept for up to 90 days.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {sessionError && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 right-8 bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3 border border-white/20"
        >
          <Zap size={18} className="animate-pulse" />
          <span className="text-xs font-semibold">{sessionError}</span>
        </motion.div>
      )}
    </div>
  );
}
