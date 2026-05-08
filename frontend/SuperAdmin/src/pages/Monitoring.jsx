import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, Database, Zap, Cpu, 
    ShieldCheck, AlertTriangle, RefreshCw, 
    Clock, HardDrive, Network,
    AlertCircle
} from 'lucide-react';
import { getHealth } from '../api';
import { ToastCtx } from '../App.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';

const HealthCard = ({ title, status, icon: Icon, latencyMs, detail }) => {
    const isHealthy = status === 'healthy';
    const statusColorClass = isHealthy ? 'text-success' : 'text-danger';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <GlassCard 
                hover={false}
                glowColor={isHealthy ? 'success' : 'primary'}
                className={isHealthy ? 'success-border' : 'danger-border'}
                style={{ 
                    boxShadow: isHealthy 
                        ? 'var(--shadow-glow-success)' 
                        : 'var(--shadow-glow-danger)'
                }}
            >
                <div className="flex justify-between items-start mb-6">
                    <div 
                        className="flex items-center justify-center"
                        style={{
                            padding: 'var(--space-4)',
                            borderRadius: 'var(--radius-2xl)',
                            background: isHealthy 
                                ? 'color-mix(in srgb, var(--color-success) 10%, transparent)' 
                                : 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                            border: '1px solid var(--border-subtle)'
                        }}
                    >
                        <Icon size={24} className={statusColorClass} />
                    </div>
                    <div className="flex items-center gap-2">
                        <div 
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: isHealthy ? 'var(--color-success)' : 'var(--color-danger)',
                                boxShadow: isHealthy 
                                    ? '0 0 10px var(--color-success)' 
                                    : '0 0 10px var(--color-danger)',
                                animation: 'pulse 2s ease-in-out infinite'
                            }}
                        />
                        <span 
                            className={`${statusColorClass} uppercase`}
                            style={{
                                fontSize: 10,
                                fontWeight: 'var(--font-extrabold)',
                                letterSpacing: '0.1em'
                            }}
                        >
                            {status || 'Unknown'}
                        </span>
                    </div>
                </div>
                
                <div>
                    <p 
                        className="uppercase"
                        style={{
                            fontSize: 10,
                            fontWeight: 'var(--font-extrabold)',
                            color: 'var(--text-tertiary)',
                            letterSpacing: '0.2em',
                            marginBottom: 'var(--space-1)'
                        }}
                    >
                        {title}
                    </p>
                    <div className="flex" style={{ alignItems: 'baseline', gap: 'var(--space-2)' }}>
                        <h3 style={{ 
                            fontSize: 'var(--text-xl)', 
                            fontWeight: 'var(--font-extrabold)', 
                            color: 'var(--text-primary)' 
                        }}>
                            {isHealthy ? 'Operational' : 'Interrupt'}
                        </h3>
                        {latencyMs !== undefined && (
                            <span className="mono text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                                {latencyMs}ms
                            </span>
                        )}
                    </div>
                    {detail && (
                        <p style={{ 
                            fontSize: 10, 
                            color: 'var(--text-tertiary)', 
                            marginTop: 'var(--space-1)' 
                        }}>
                            {detail}
                        </p>
                    )}
                </div>

                <div className="flex" style={{ marginTop: 'var(--space-6)', gap: 'var(--space-2)' }}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div 
                            key={i} 
                            style={{
                                height: 4,
                                flex: 1,
                                borderRadius: 9999,
                                background: isHealthy 
                                    ? 'color-mix(in srgb, var(--color-success) 20%, transparent)' 
                                    : 'color-mix(in srgb, var(--color-danger) 20%, transparent)'
                            }}
                        >
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ delay: i * 0.1, duration: 1 }}
                                style={{
                                    height: '100%',
                                    borderRadius: 9999,
                                    background: isHealthy ? 'var(--color-success)' : 'var(--color-danger)'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </GlassCard>
        </motion.div>
    );
};

export default function Monitoring() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [alertHistory, setAlertHistory] = useState([]);

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getHealth();
            setHealth(data);
            setLastUpdated(new Date());
            
            if (data.alerts && data.alerts.length > 0) {
                setAlertHistory(prev => {
                    const newAlerts = data.alerts.map(a => ({
                        ...a,
                        id: `${a.dependency}-${a.timestamp}`,
                        seen: false
                    }));
                    const merged = [...newAlerts, ...prev]
                        .filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
                        .slice(0, 50);
                    return merged;
                });
            }
        } catch (error) {
            console.error('Health check failed:', error);
            setHealth(prev => prev ? { ...prev, status: 'offline' } : { status: 'offline', alerts: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 15000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const deps = health?.dependencies;
    const metrics = health?.metrics;
    const alerts = health?.alerts || [];

    return (
        <div className="page-container monitoring-page">
            {/* Header */}
            <div className="monitoring-header">
                <div>
                    <div className="flex items-center gap-3 text-success mb-2">
                        <Activity size={18} style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                        <span className="uppercase" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.3em' }}>
                            Neural System Analytics
                        </span>
                    </div>
                    <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Infrastructure{' '}
                        <span style={{
                            background: 'linear-gradient(to right, var(--color-success), var(--color-info))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            Health
                        </span>
                    </h1>
                    <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', fontWeight: 'var(--font-medium)' }}>
                        <span className="flex items-center gap-2">
                            <Clock size={14} /> Last Synchronization: {lastUpdated.toLocaleTimeString()}
                        </span>
                    </p>
                </div>

                <button 
                    onClick={fetchHealth} 
                    disabled={loading}
                    className="btn btn-secondary monitoring-refresh-btn"
                >
                    <RefreshCw 
                        size={16} 
                        className="monitoring-refresh-icon"
                        style={loading ? { animation: 'spin 1s linear infinite' } : {}} 
                    />
                    <span className="uppercase" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em' }}>
                        Manual Refresh
                    </span>
                </button>
            </div>

            {/* Active Alerts Banner */}
            <AnimatePresence>
                {alerts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="glass-card"
                        style={{
                            background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                            borderColor: 'var(--border-danger)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-danger" size={20} />
                            <h3 className="text-danger uppercase letter-spaced" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-extrabold)' }}>
                                Active Alerts ({alerts.length})
                            </h3>
                        </div>
                        <div className="monitoring-alert-list">
                            {alerts.map((alert, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`monitoring-alert-item ${alert.severity === 'critical' ? 'critical' : 'warning'}`}
                                >
                                    <AlertCircle 
                                        size={18} 
                                        className={alert.severity === 'critical' ? 'text-danger' : 'text-warning'} 
                                        style={{ flexShrink: 0 }}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`monitoring-severity-badge ${alert.severity === 'critical' ? 'critical' : 'warning'}`}>
                                                {alert.severity}
                                            </span>
                                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                                                {alert.dependency}
                                            </span>
                                        </div>
                                        <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                                            {alert.message}
                                        </p>
                                    </div>
                                    <span className="text-tertiary" style={{ fontSize: 10 }}>
                                        {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : ''}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Stats Grid */}
            <div className="monitoring-health-grid">
                <HealthCard 
                    title="Core Engine" 
                    status={health?.status} 
                    icon={Cpu}
                    latencyMs={metrics?.total_check_duration_ms}
                    detail={health?.uptime_human}
                />
                <HealthCard 
                    title="Database Layer" 
                    status={deps?.database?.status} 
                    icon={Database}
                    latencyMs={deps?.database?.latency_ms}
                    detail={deps?.database?.detail}
                />
                <HealthCard 
                    title="Memory Cache" 
                    status={deps?.redis?.status} 
                    icon={Zap}
                    latencyMs={deps?.redis?.latency_ms}
                    detail={deps?.redis?.detail}
                />
                <HealthCard 
                    title="Object Storage" 
                    status={deps?.storage?.status} 
                    icon={HardDrive}
                    latencyMs={deps?.storage?.latency_ms}
                    detail={deps?.storage?.detail}
                />
            </div>

            {/* Detailed Services & Info */}
            <div className="monitoring-detail-grid">
                {/* System Metrics */}
                <GlassCard hover={false} glowColor="success">
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: 'var(--space-8)', opacity: 0.1, pointerEvents: 'none' }}>
                        <Network size={120} className="text-success" />
                    </div>
                    
                    <h3 className="flex items-center gap-3" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-8)' }}>
                        <ShieldCheck className="text-success" /> System Integrity Report
                    </h3>

                    <div className="monitoring-metrics-grid">
                        <div className="flex flex-col gap-6">
                            <div>
                                <p className="uppercase text-tertiary" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                                    Build Version
                                </p>
                                <p className="mono" style={{
                                    fontSize: 'var(--text-lg)',
                                    fontWeight: 'var(--font-bold)',
                                    color: 'var(--text-primary)',
                                    background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                                    padding: 'var(--space-2) var(--space-4)',
                                    borderRadius: 'var(--radius-xl)',
                                    display: 'inline-block',
                                    border: '1px solid var(--border-subtle)'
                                }}>
                                    v{health?.version || '0.0.0'}-stable
                                </p>
                            </div>
                            <div>
                                <p className="uppercase text-tertiary" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                                    Primary Node Uptime
                                </p>
                                <p className="text-success" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-extrabold)' }}>
                                    {health?.uptime_human || 'Calculating...'}
                                </p>
                            </div>
                            <div>
                                <p className="uppercase text-tertiary" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                                    Memory Usage
                                </p>
                                <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                                    {metrics?.memory_usage_human || 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div>
                                <p className="uppercase text-tertiary" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                                    Server Timestamp
                                </p>
                                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)' }}>
                                    {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Waiting for data...'}
                                </p>
                            </div>
                            <div>
                                <p className="uppercase text-tertiary" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                                    DB Connection Pool
                                </p>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-secondary">Active</span>
                                        <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{metrics?.db_pool_active ?? '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-secondary">Idle</span>
                                        <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{metrics?.db_pool_idle ?? '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-secondary">Pool Size</span>
                                        <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{metrics?.db_pool_size ?? '-'}</span>
                                    </div>
                                    <div style={{ marginTop: 'var(--space-2)', height: 12, background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)', borderRadius: 9999, overflow: 'hidden' }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: metrics?.db_pool_size ? `${((metrics.db_pool_active || 0) / metrics.db_pool_size) * 100}%` : '0%' }}
                                            style={{ height: '100%', background: 'var(--color-success)', boxShadow: '0 0 10px var(--color-success)' }}
                                        />
                                    </div>
                                    <span className="text-tertiary" style={{ fontSize: 10 }}>Pool utilization</span>
                                </div>
                            </div>
                            <div>
                                <p className="uppercase text-tertiary" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                                    Health Check Latency
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1" style={{ height: 12, background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)', borderRadius: 9999, overflow: 'hidden' }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: metrics?.total_check_duration_ms ? `${Math.min((metrics.total_check_duration_ms / 500) * 100, 100)}%` : '0%' }}
                                            style={{
                                                height: '100%',
                                                borderRadius: 9999,
                                                background: (metrics?.total_check_duration_ms || 0) < 100 ? 'var(--color-success)' : 
                                                    (metrics?.total_check_duration_ms || 0) < 300 ? 'var(--color-warning)' : 'var(--color-danger)'
                                            }}
                                        />
                                    </div>
                                    <span className="text-success" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)' }}>
                                        {metrics?.total_check_duration_ms || 0}ms
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Status Log / Alerts */}
                <GlassCard hover={false} glowColor="warning" style={{ background: 'var(--surface-layer3)' }}>
                    <h3 className="flex items-center gap-3" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-8)' }}>
                        <AlertTriangle size={20} className="text-warning" /> Incident Log
                    </h3>
                    
                    <div className="flex flex-col gap-6">
                        {loading && !health ? (
                            <div className="flex flex-col items-center justify-center" style={{ padding: 'var(--space-16) 0', opacity: 0.2 }}>
                                <div className="spinner" />
                                <p className="uppercase" style={{ fontSize: 10, fontWeight: 'var(--font-extrabold)', letterSpacing: '0.1em', marginTop: 'var(--space-4)' }}>
                                    Scanning Signal...
                                </p>
                            </div>
                        ) : alertHistory.length > 0 ? (
                            alertHistory.slice(0, 10).map((alert, i) => (
                                <div 
                                    key={alert.id || i} 
                                    className={`monitoring-alert-item ${alert.severity === 'critical' ? 'critical' : 'warning'}`}
                                >
                                    <AlertTriangle 
                                        className={alert.severity === 'critical' ? 'text-danger' : 'text-warning'} 
                                        size={18}
                                        style={{ flexShrink: 0 }}
                                    />
                                    <div>
                                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                                            {alert.dependency}
                                        </p>
                                        <p className="text-secondary" style={{ fontSize: 10 }}>
                                            {alert.message}
                                        </p>
                                        <p className="text-tertiary" style={{ fontSize: 10, marginTop: 'var(--space-1)' }}>
                                            {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : ''}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center" style={{ padding: 'var(--space-10) 0' }}>
                                <div className="flex items-center justify-center mb-6" style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: 'color-mix(in srgb, var(--color-success) 10%, transparent)'
                                }}>
                                    <ShieldCheck className="text-success" size={32} />
                                </div>
                                <h4 className="uppercase" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                                    No Disruptions
                                </h4>
                                <p className="uppercase" style={{ fontSize: 10, fontWeight: 'var(--font-bold)', color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>
                                    All neural pathways are at peak efficiency.
                                </p>
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>

            <style>{`
                .monitoring-page {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-10);
                }
                .monitoring-header {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: var(--space-6);
                }
                @media (min-width: 768px) {
                    .monitoring-header {
                        flex-direction: row;
                        align-items: center;
                    }
                }
                .monitoring-refresh-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-6);
                    border-radius: var(--radius-2xl);
                    transition: all var(--duration-normal) var(--ease-out);
                }
                .monitoring-refresh-btn:active {
                    transform: scale(0.95);
                }
                .monitoring-refresh-btn:hover .monitoring-refresh-icon {
                    transform: rotate(180deg);
                }
                .monitoring-refresh-icon {
                    transition: transform 700ms var(--ease-in-out);
                }
                .monitoring-health-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: var(--space-6);
                }
                @media (min-width: 768px) {
                    .monitoring-health-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (min-width: 1024px) {
                    .monitoring-health-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
                .monitoring-detail-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: var(--space-8);
                }
                @media (min-width: 1024px) {
                    .monitoring-detail-grid {
                        grid-template-columns: 2fr 1fr;
                    }
                }
                .monitoring-metrics-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: var(--space-8);
                    position: relative;
                    z-index: 1;
                }
                @media (min-width: 768px) {
                    .monitoring-metrics-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                .monitoring-alert-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }
                .monitoring-alert-item {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-4);
                    padding: var(--space-4);
                    border-radius: var(--radius-2xl);
                }
                .monitoring-alert-item.critical {
                    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
                    border: 1px solid var(--border-danger);
                }
                .monitoring-alert-item.warning {
                    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
                    border: 1px solid var(--border-warning);
                }
                .monitoring-severity-badge {
                    display: inline-flex;
                    align-items: center;
                    font-size: 10px;
                    font-weight: var(--font-extrabold);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    padding: 2px 8px;
                    border-radius: 9999px;
                }
                .monitoring-severity-badge.critical {
                    background: color-mix(in srgb, var(--color-danger) 20%, transparent);
                    color: var(--color-danger);
                }
                .monitoring-severity-badge.warning {
                    background: color-mix(in srgb, var(--color-warning) 20%, transparent);
                    color: var(--color-warning);
                }
            `}</style>
        </div>
    );
}
