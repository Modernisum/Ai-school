import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Settings, Clock, Save, RefreshCw, Palette, History, Maximize2, Minimize2, Globe, Shield, Loader } from 'lucide-react';
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
      const response = await callApiWithBackoff(`${API_BASE_URL}/school/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionDurationHours: duration })
      });
      if (!response.success) throw new Error(response.message || 'Update failed');
    } catch (err) {
      console.error('Error updating session settings:', err);
      setSessionError('Update failed. Reverting...');
      fetchSessionSettings(); // Revert on error
    } finally {
      setUpdatingSession(false);
    }
  };

  const handleIntervalChange = (e) => {
    dispatch(setPollingInterval(parseInt(e.target.value)));
  };



  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20">
            <Settings size={28} className="text-primary" />
          </div>
          General Settings
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Configure application-wide preferences and synchronization.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <section className="glass-card p-5 md:px-6 md:py-4 border border-white/5 bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Session Persistence</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Control how long online sessions remain active.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            {updatingSession ? (
              <Loader size={16} className="text-primary animate-spin" />
            ) : (
              <Shield size={16} className={`${sessionError ? 'text-rose-500' : 'text-emerald-500'}`} />
            )}
            <select 
              value={sessionDuration} 
              onChange={(e) => handleSessionChange(e.target.value)}
              disabled={loadingSession || updatingSession}
              className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none cursor-pointer text-sm w-full md:w-48 disabled:opacity-50"
            >
              <option value={1}>1 Hour</option>
              <option value={4}>4 Hours</option>
              <option value={8}>8 Hours</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours (Default)</option>
              <option value={48}>48 Hours</option>
              <option value={168}>1 Week</option>
            </select>
          </div>
          {sessionError && (
            <p className="absolute bottom-1 right-6 text-[9px] font-bold text-rose-500 uppercase tracking-tighter animate-pulse">
              {sessionError}
            </p>
          )}
        </section>

        <section className="glass-card p-5 md:px-6 md:py-4 border border-white/5 bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Auto-Sync</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Applies to all real-time tables.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <Clock size={16} className="text-slate-400 hidden sm:block" />
            <select 
              value={pollingInterval} 
              onChange={handleIntervalChange}
              className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none cursor-pointer text-sm w-full md:w-48"
            >
              <option value={5000}>5s (Fast)</option>
              <option value={10000}>10s (Recommended)</option>
              <option value={20000}>20s (Balanced)</option>
              <option value={30000}>30s (Slow)</option>
              <option value={60000}>1m (Battery Saver)</option>
            </select>
          </div>
        </section>

        <section className="glass-card p-5 md:px-6 md:py-4 border border-white/5 bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Theme Presets</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Instantly update application appearance.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary hidden sm:block"></span>
            <select
              value={THEME_PRESETS.find(p => p.colors.primary === theme.primary && p.colors.backgroundVia === theme.backgroundVia)?.id || 'vidhyam-default'}
              onChange={(e) => {
                const preset = THEME_PRESETS.find(p => p.id === e.target.value);
                if (preset) dispatch(setTheme(preset.colors));
              }}
              className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none cursor-pointer text-sm w-full md:w-48"
            >
              <option disabled value="">Select a theme...</option>
              {THEME_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="glass-card p-5 md:px-6 md:py-4 border border-white/5 bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Maximize2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Font Scale</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Adjust font size for better readability.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary hidden sm:block"></span>
            <select
              value={screenScale}
              onChange={(e) => {
                const scale = parseFloat(e.target.value);
                if (!isNaN(scale) && scale >= 0.5 && scale <= 2.0) {
                  dispatch(setScreenScale(scale));
                  updateScreenScale(scale);
                }
              }}
              className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none cursor-pointer text-sm w-full md:w-48"
            >
              <option value="0.75">Small (75%)</option>
              <option value="0.85">Compact (85%)</option>
              <option value="1.0">Normal (100%)</option>
              <option value="1.15">Large (115%)</option>
              <option value="1.25">Extra Large (125%)</option>
              <option value="1.5">Accessibility (150%)</option>
            </select>
          </div>
        </section>

        <section className="glass-card p-5 md:px-6 md:py-4 border border-white/5 bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Data Recovery</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Restore recently deleted records and audit logs.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button 
              onClick={() => navigate('/dashboard/recovery')}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg px-6 py-2 transition-all font-bold text-sm w-full md:w-auto flex items-center justify-center gap-2"
            >
              <History size={16} />
              View History
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

