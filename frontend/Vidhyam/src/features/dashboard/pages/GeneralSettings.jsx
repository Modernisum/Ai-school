import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Settings, Clock, Save, RefreshCw, Palette, 
  History, Maximize2, Minimize2, Globe, Shield, 
  Loader, Zap, Cpu, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
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

  const fetchSessionSettings = async () => {
    setLoadingSession(true);
    setSessionError(null);
    try {
      const response = await callApiWithBackoff(`${API_BASE_URL}/school/${schoolId}?filter=session`);
      if (response.success && response.data?.sessionDurationHours) {
        setSessionDuration(response.data.sessionDurationHours);
      }
    } catch (err) {
      console.error('Error fetching session settings:', err);
      setSessionError('Failed to load session settings');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSessionChange = async (newDuration) => {
    const duration = parseInt(newDuration);
    setSessionDuration(duration);
    setUpdatingSession(true);
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
          <h3 className="text-[10px] font-black text-[var(--text-main)] uppercase italic tracking-widest leading-none">{title}</h3>
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1 opacity-60">{subtitle}</p>
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
        className="appearance-none bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-[10px] text-[var(--text-main)] outline-none cursor-pointer w-44 disabled:opacity-50 font-black uppercase italic tracking-widest hover:border-primary/50 transition-all text-center"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
            {opt.label.toUpperCase().replace(' ', '_')}
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
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-[0.2em] uppercase italic leading-none">SYSTEM_REGISTRY</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1.5 opacity-80 flex items-center gap-2">
              <Cpu size={10} className="text-primary" />
              PROTOCOL_SETTINGS // CONFIGURATION_CORE // NODE_854
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core System Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <Zap size={14} className="text-primary/60" />
             <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">STABILITY_ENGINE</h2>
          </div>
          
          <GlassCard className="divide-y divide-white/5">
            <SettingRow 
              icon={Globe} 
              title="SESSION_PERSISTENCE" 
              subtitle="AUTH_TOKEN_EXPIRATION_DELAY"
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
                  { value: 1, label: "1_HOUR" },
                  { value: 4, label: "4_HOURS" },
                  { value: 8, label: "8_HOURS" },
                  { value: 12, label: "12_HOURS" },
                  { value: 24, label: "24_HOURS" },
                  { value: 48, label: "48_HOURS" },
                  { value: 168, label: "1_WEEK" },
                ]}
              />
            </SettingRow>

            <SettingRow 
              icon={RefreshCw} 
              title="AUTO_SYNC_PROTOCOL" 
              subtitle="POLLING_INTERVAL_TUNING"
              iconColor="text-indigo-400"
            >
              <Clock size={14} className="text-slate-600 opacity-60" />
              <StyledSelect 
                value={pollingInterval}
                onChange={handleIntervalChange}
                options={[
                  { value: 5000, label: "5S_FAST" },
                  { value: 10000, label: "10S_IDEAL" },
                  { value: 20000, label: "20S_BALANCED" },
                  { value: 30000, label: "30S_THROTTLE" },
                  { value: 60000, label: "1M_SAVER" },
                ]}
              />
            </SettingRow>
          </GlassCard>
        </div>

        {/* Visual & Workspace Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <Palette size={14} className="text-primary/60" />
             <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">WORKSPACE_DYNAMICS</h2>
          </div>

          <GlassCard className="divide-y divide-white/5">
            <SettingRow 
              icon={Palette} 
              title="VISUAL_ENGINE_PRESETS" 
              subtitle="THEME_CORE_INITIALIZATION"
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

            <SettingRow 
              icon={Maximize2} 
              title="RESOLUTION_SCALING" 
              subtitle="GLOBAL_UI_MATRIX_SCALE"
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
                  { value: 0.75, label: "75%_SMALL" },
                  { value: 0.85, label: "85%_COMPACT" },
                  { value: 1.0, label: "100%_NORMAL" },
                  { value: 1.15, label: "115%_LARGE" },
                  { value: 1.25, label: "125%_ULTRA" },
                  { value: 1.5, label: "150%_ACCESSIBLE" },
                ]}
              />
            </SettingRow>
          </GlassCard>
        </div>

        {/* Data & Safety Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-1">
             <Activity size={14} className="text-primary/60" />
             <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">DATA_INTEGRITY</h2>
          </div>

          <GlassCard className="p-2">
            <div className="flex items-center justify-between gap-6 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase italic tracking-[0.2em] leading-none">DATA_RECOVERY_PROTOCOL</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 max-w-md line-clamp-2 opacity-70">
                    Access the neural recovery node to restore deleted administrative entities and structural configurations. History logs are persisted for 90 days.
                  </p>
                </div>
              </div>
              
              <StandardButton 
                variant="glow" 
                size="md" 
                onClick={() => navigate('/dashboard/recovery')}
                icon={Shield}
                label="INITIATE_RECOVERY_SCAN"
              />
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
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{sessionError}</span>
        </motion.div>
      )}
    </div>
  );
}

