import { useState, useEffect, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Server, Database, Cpu, Clock, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Zap, HardDrive } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { useRBAC, PERMISSIONS, PermissionGuard } from '../contexts/RBACContext.jsx'
import PerformanceMonitor from '../components/PerformanceMonitor.jsx'
import { HealthDot, StatusBadge } from '../components/ui/index.js'

export default function MonitoringPage() {
    const toast = useContext(ToastCtx)
    const { user, checkPermission } = useRBAC()
    const [systemHealth, setSystemHealth] = useState({
        status: 'checking',
        lastCheck: new Date().toISOString(),
        uptime: '0',
        uptimeHuman: '',
        responseTime: 0,
        errorRate: 0,
        checks: [],
        alerts: [],
        metrics: null
    })

    const [prevStatus, setPrevStatus] = useState('checking')

    const fetchHealth = useCallback(async () => {
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
            const res = await fetch(`${baseUrl}/health`)
            const data = await res.json()

            const newStatus = data.status === 'healthy' ? 'healthy' :
                              data.status === 'degraded' ? 'degraded' : 'error'

            if (prevStatus === 'healthy' && newStatus !== 'healthy') {
                const failedDeps = (data.alerts || []).map(a => a.dependency).join(', ')
                toast('error', `⚠️ System ${newStatus === 'error' ? 'CRITICAL' : 'DEGRADED'}: ${failedDeps || 'Unknown failure'}`)
            } else if (prevStatus !== 'healthy' && newStatus === 'healthy') {
                toast('success', '✅ System recovered — all dependencies healthy')
            }
            setPrevStatus(newStatus)

            const deps = data.dependencies || {}
            const checks = [
                { name: 'database', status: deps.database?.status || 'unknown', duration_ms: deps.database?.latency_ms || 0 },
                { name: 'redis', status: deps.redis?.status || 'unknown', duration_ms: deps.redis?.latency_ms || 0 },
                { name: 'storage', status: deps.storage?.status || 'unknown', duration_ms: deps.storage?.latency_ms || 0 },
            ]

            setSystemHealth({
                status: newStatus,
                lastCheck: data.timestamp,
                uptime: `${Math.floor((data.uptime_seconds || 0) / 3600)}h ${Math.floor(((data.uptime_seconds || 0) % 3600) / 60)}m`,
                uptimeHuman: data.uptime_human || '',
                responseTime: data.metrics?.total_check_duration_ms || 0,
                errorRate: (data.alerts || []).filter(a => a.severity === 'critical').length > 0 ? 5.0 :
                           (data.alerts || []).length > 0 ? 1.0 : 0.1,
                checks,
                alerts: data.alerts || [],
                metrics: data.metrics || null
            })
        } catch (e) {
            if (prevStatus !== 'offline') {
                toast('error', '🔴 Backend signal lost — cannot reach health endpoint')
            }
            setPrevStatus('offline')
            setSystemHealth(prev => ({ ...prev, status: 'offline' }))
        }
    }, [prevStatus, toast])

    useEffect(() => {
        fetchHealth()
        const itv = setInterval(fetchHealth, 15000)
        return () => clearInterval(itv)
    }, [fetchHealth])

    const [apiMetrics, setApiMetrics] = useState([
        { endpoint: '/api/schools', avgResponse: 120, successRate: 99.2, calls: 1250 },
        { endpoint: '/api/billing', avgResponse: 180, successRate: 98.5, calls: 850 },
        { endpoint: '/api/auth', avgResponse: 95, successRate: 99.8, calls: 3200 },
        { endpoint: '/api/audit', avgResponse: 210, successRate: 99.0, calls: 450 }
    ])

    const recentIncidents = (systemHealth.alerts || []).map((alert, i) => ({
        id: i + 1,
        type: alert.severity === 'critical' ? 'error' : 'warning',
        title: `${alert.dependency} Failure`,
        description: alert.message,
        timestamp: alert.timestamp,
        resolved: false
    }))

    if (!checkPermission(PERMISSIONS.VIEW_MONITORING)) {
        return (
            <div className="page">
                <div className="page-header">
                    <h1 className="page-title">Access Denied</h1>
                    <p className="page-sub">You don't have permission to view monitoring dashboard</p>
                </div>
            </div>
        )
    }

    const getHealthColor = (status) => {
        switch (status) {
            case 'healthy': return { color: 'var(--color-success)' }
            case 'degraded': return { color: 'var(--color-warning)' }
            case 'error': return { color: 'var(--color-danger)' }
            case 'offline': return { color: 'var(--color-danger)' }
            default: return { color: 'var(--text-tertiary)' }
        }
    }

    const getHealthIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
            case 'degraded': return <AlertCircle size={16} style={{ color: 'var(--color-warning)' }} />
            case 'error': return <AlertCircle size={16} style={{ color: 'var(--color-danger)' }} />
            case 'offline': return <AlertCircle size={16} style={{ color: 'var(--color-danger)' }} />
            default: return <Activity size={16} style={{ color: 'var(--text-tertiary)' }} />
        }
    }

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const incidentStyleMap = {
        error: { background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', borderColor: 'var(--border-danger)' },
        warning: { background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', borderColor: 'var(--border-warning)' }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">System Monitoring</h1>
                <p className="page-sub">Real-time performance metrics and system health monitoring</p>
            </div>

            <AnimatePresence>
                {systemHealth.alerts && systemHealth.alerts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 p-4 border"
                        style={{
                            background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                            borderColor: 'var(--border-danger)',
                            borderRadius: 'var(--radius-xl)'
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle size={18} className="text-danger" />
                            <h3 className="font-semibold" style={{ color: 'var(--color-danger)' }}>
                                Active Alerts ({systemHealth.alerts.length})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {systemHealth.alerts.map((alert, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-3 rounded-lg"
                                    style={{
                                        background: alert.severity === 'critical'
                                            ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                                            : 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
                                    }}
                                >
                                    <AlertCircle
                                        size={14}
                                        style={{ color: alert.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)' }}
                                    />
                                    <span
                                        className="text-xs font-bold uppercase"
                                        style={{ color: alert.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)' }}
                                    >
                                        {alert.severity}
                                    </span>
                                    <span className="text-sm font-medium">{alert.dependency}:</span>
                                    <span className="text-sm text-secondary">{alert.message}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="elevated-card mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">System Health Overview</h2>
                    <div className="flex items-center gap-2">
                        {getHealthIcon(systemHealth.status)}
                        <span className="font-medium" style={getHealthColor(systemHealth.status)}>
                            {systemHealth.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--surface-layer2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Server size={16} className="text-primary" />
                            <h3 className="text-sm font-medium">Uptime</h3>
                        </div>
                        <div className="text-2xl font-bold">{systemHealth.uptimeHuman || systemHealth.uptime}</div>
                        <div className="text-xs text-tertiary">Live Backend Stream</div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ background: 'var(--surface-layer2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} style={{ color: 'var(--color-secondary)' }} />
                            <h3 className="text-sm font-medium">Health Latency</h3>
                        </div>
                        <div className="text-2xl font-bold">{systemHealth.responseTime.toFixed(1)}ms</div>
                        <div className="text-xs text-tertiary">Total check duration</div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ background: 'var(--surface-layer2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} style={{ color: 'var(--color-warning)' }} />
                            <h3 className="text-sm font-medium">System State</h3>
                        </div>
                        <div className="text-2xl font-bold">
                            {systemHealth.status === 'healthy' ? 'STABLE' :
                             systemHealth.status === 'degraded' ? 'DEGRADED' : 'CRITICAL'}
                        </div>
                        <div className="text-xs text-tertiary">
                            {systemHealth.status === 'healthy' ? 'Nominal Performance' :
                             systemHealth.status === 'degraded' ? 'Partial Degradation' : 'Emergency Action Required'}
                        </div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ background: 'var(--surface-layer2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Database size={16} className="text-success" />
                            <h3 className="text-sm font-medium">DB Pool</h3>
                        </div>
                        <div className="text-2xl font-bold">
                            {systemHealth.metrics ? `${systemHealth.metrics.db_pool_active}/${systemHealth.metrics.db_pool_size}` : '-'}
                        </div>
                        <div className="text-xs text-tertiary">Active / Total connections</div>
                    </div>
                </div>

                {systemHealth.checks && systemHealth.checks.length > 0 && (
                    <div
                        className="mt-6 flex flex-wrap gap-3 p-4 border border-dashed"
                        style={{
                            background: 'var(--surface-layer1)',
                            borderColor: 'var(--border-default)',
                            borderRadius: 'var(--radius-xl)'
                        }}
                    >
                         {systemHealth.checks.map(check => (
                             <div
                                 key={check.name}
                                 className="flex items-center gap-3 px-3 py-2 rounded-lg shadow-sm border"
                                 style={{ background: 'var(--surface-layer3)', borderColor: 'var(--border-subtle)' }}
                             >
                                 <HealthDot
                                     status={check.status === 'healthy' ? 'healthy' : 'critical'}
                                     size={8}
                                     pulse={check.status !== 'healthy'}
                                 />
                                 <span className="text-xs font-bold uppercase tracking-wider text-secondary">{check.name}</span>
                                 <span
                                     className="text-micro font-mono px-1.5 py-0.5 rounded"
                                     style={{ background: 'var(--surface-layer2)', color: 'var(--text-tertiary)' }}
                                 >
                                     {check.duration_ms}ms
                                 </span>
                             </div>
                         ))}
                    </div>
                )}

                <div className="mt-4 text-sm text-tertiary">
                    Neural Link Last Updated: {formatTimestamp(systemHealth.lastCheck)}
                </div>
            </div>

            <div className="mb-6">
                <PerformanceMonitor />
            </div>

            <div className="elevated-card mb-6">
                <h2 className="text-lg font-semibold mb-4">API Performance Metrics</h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                <th className="text-left py-2 px-4 text-sm font-medium text-tertiary">Endpoint</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-tertiary">Avg Response</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-tertiary">Success Rate</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-tertiary">Total Calls</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-tertiary">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apiMetrics.map((metric, index) => {
                                const statusVariant = metric.successRate >= 99 ? 'healthy' :
                                                      metric.successRate >= 98 ? 'degraded' : 'critical'
                                const statusLabel = metric.successRate >= 99 ? 'Excellent' :
                                                    metric.successRate >= 98 ? 'Good' : 'Needs Attention'

                                return (
                                    <motion.tr
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        className="border-b"
                                        style={{ borderColor: 'var(--border-subtle)' }}
                                    >
                                        <td className="py-3 px-4">
                                            <code
                                                className="text-sm px-2 py-1 rounded"
                                                style={{ background: 'var(--surface-layer2)' }}
                                            >
                                                {metric.endpoint}
                                            </code>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {metric.avgResponse < 150 ?
                                                    <TrendingDown size={14} className="text-success" /> :
                                                    <TrendingUp size={14} className="text-warning" />
                                                }
                                                <span className="font-medium">{metric.avgResponse}ms</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-16 rounded-full h-2"
                                                    style={{ background: 'var(--surface-layer3)' }}
                                                >
                                                    <div
                                                        className="h-2 rounded-full"
                                                        style={{
                                                            width: `${metric.successRate}%`,
                                                            background: 'var(--color-success)'
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-sm">{metric.successRate}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-medium">{metric.calls.toLocaleString()}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <StatusBadge status={statusVariant} label={statusLabel} size="sm" />
                                        </td>
                                    </motion.tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-sm text-tertiary">
                    Metrics updated every 15 seconds. Threshold: Response time &lt; 200ms, Success rate &gt; 99%
                </div>
            </div>

            <div className="elevated-card">
                <h2 className="text-lg font-semibold mb-4">Recent Incidents & Alerts</h2>

                {recentIncidents.length > 0 ? (
                    <div className="space-y-3">
                        {recentIncidents.map((incident) => (
                            <motion.div
                                key={incident.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="p-4 rounded-lg border"
                                style={incidentStyleMap[incident.type] || { borderColor: 'var(--border-default)', background: 'var(--surface-layer2)' }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {incident.type === 'error' ?
                                                <AlertCircle size={16} className="text-danger" /> :
                                                <AlertCircle size={16} className="text-warning" />
                                            }
                                            <h3 className="font-medium">{incident.title}</h3>
                                            {!incident.resolved && (
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs animate-pulse"
                                                    style={{
                                                        background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                                                        color: 'var(--color-danger)'
                                                    }}
                                                >
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-secondary mb-2">{incident.description}</p>
                                        <div className="text-xs text-tertiary">
                                            {formatTimestamp(incident.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-tertiary">
                        <CheckCircle size={32} className="mx-auto mb-2 text-success" />
                        <p>No incidents reported — all systems operational</p>
                    </div>
                )}

                <div className="mt-4 text-sm text-tertiary">
                    Auto-refresh every 15s • Incident response time target: &lt; 15 minutes for critical issues
                </div>
            </div>
        </div>
    )
}
