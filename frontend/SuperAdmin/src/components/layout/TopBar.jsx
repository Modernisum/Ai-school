import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import HealthDot from '../ui/HealthDot.jsx';

export default function TopBar({ onToggleSidebar, sidebarCollapsed, health, alerts = [], onSearch }) {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (showNotifs && !e.target.closest('.notif-panel') && !e.target.closest('.notif-btn')) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showNotifs]);

  const unreadAlerts = alerts.filter(a => !a.resolved).length;

  const handleSpotlight = () => {
    window.dispatchEvent(new CustomEvent('toggle-spotlight'));
  };

  const healthColor = health === 'healthy' ? 'text-success' : health === 'degraded' ? 'text-warning' : 'text-tertiary';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="collapse-btn" onClick={onToggleSidebar}>
          <Activity size={16} />
        </button>
      </div>

      <div className="topbar-center">
        <div className="search-box" onClick={handleSpotlight} style={{ cursor: 'pointer' }}>
          <Search size={14} />
          <input type="text" placeholder="Search schools, features, settings..." readOnly style={{ cursor: 'pointer' }} />
          <span className="search-kbd">⌘K</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="health-indicator" onClick={() => navigate('/monitoring')}>
          <HealthDot status={health} size={7} />
          <span className={`hidden-mobile ${healthColor}`}>
            {health === 'healthy' ? 'Operational' : health === 'degraded' ? 'Degraded' : health === 'critical' ? 'Critical' : 'Offline'}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <button className="notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell size={16} />
            {unreadAlerts > 0 && <span className="notif-dot" />}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="notif-panel"
              >
                <div className="notif-panel-header">
                  <span className="font-bold text-sm">Notifications</span>
                  {unreadAlerts > 0 && <span className="text-xs text-primary font-semibold">{unreadAlerts} new</span>}
                </div>
                <div className="notif-panel-body">
                  {alerts.length === 0 ? (
                    <div className="text-center text-tertiary text-sm" style={{ padding: 24 }}>No notifications</div>
                  ) : (
                    alerts.slice(0, 20).map((a, i) => (
                      <div key={i} className={`notif-item ${!a.resolved ? 'unread' : ''}`} onClick={() => navigate('/monitoring')}>
                        <div className="notif-item-icon" style={{ background: a.severity === 'critical' ? 'color-mix(in srgb, var(--color-danger) 15%, transparent)' : 'color-mix(in srgb, var(--color-warning) 15%, transparent)' }}>
                          <Activity size={14} color={a.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)'} />
                        </div>
                        <div className="notif-item-content">
                          <div className="notif-item-title">{a.dependency}</div>
                          <div className="notif-item-desc">{a.message}</div>
                          <div className="notif-item-time">{new Date(a.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
