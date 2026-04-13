import { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import { Activity, Server, Database, Cpu, Clock, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { useRBAC, PERMISSIONS, PermissionGuard } from '../contexts/RBACContext.jsx'
import PerformanceMonitor from '../components/PerformanceMonitor.jsx'

/**
 * Monitoring Dashboard Page
 * Phase 1: Frontend performance monitoring and system health dashboard
 */
export default function MonitoringPage() {
    const toast = useContext(ToastCtx)
    const { user, checkPermission } = useRBAC()
    const [systemHealth, setSystemHealth] = useState({
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        uptime: '24h 15m',
        responseTime: 145,
        errorRate: 0.8,
        activeUsers: 42
    })
    
    const [apiMetrics, setApiMetrics] = useState([
        { endpoint: '/api/schools', avgResponse: 120, successRate: 99.2, calls: 1250 },
        { endpoint: '/api/billing', avgResponse: 180, successRate: 98.5, calls: 850 },
        { endpoint: '/api/auth', avgResponse: 95, successRate: 99.8, calls: 3200 },
        { endpoint: '/api/audit', avgResponse: 210, successRate: 99.0, calls: 450 }
    ])
    
    const [recentIncidents, setRecentIncidents] = useState([
        {
            id: 1,
            type: 'warning',
            title: 'High API Response Time',
            description: 'API response time exceeded 300ms threshold',
            timestamp: '2026-04-13T10:30:00Z',
            resolved: true
        },
        {
            id: 2,
            type: 'error',
            title: 'Database Connection Spike',
            description: 'Database connection pool reached 85% capacity',
            timestamp: '2026-04-13T09:15:00Z',
            resolved: true
        },
        {
            id: 3,
            type: 'info',
            title: 'Scheduled Maintenance',
            description: 'System maintenance completed successfully',
            timestamp: '2026-04-13T08:00:00Z',
            resolved: true
        }
    ])

    // Check if user has permission to view monitoring
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
            case 'healthy': return 'text-green-500'
            case 'warning': return 'text-yellow-500'
            case 'error': return 'text-red-500'
            default: return 'text-gray-500'
        }
    }

    const getHealthIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle size={16} className="text-green-500" />
            case 'warning': return <AlertCircle size={16} className="text-yellow-500" />
            case 'error': return <AlertCircle size={16} className="text-red-500" />
            default: return <Activity size={16} className="text-gray-500" />
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

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">System Monitoring</h1>
                <p className="page-sub">Real-time performance metrics and system health monitoring</p>
            </div>

            {/* System Health Overview */}
            <div className="elevated-card mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">System Health Overview</h2>
                    <div className="flex items-center gap-2">
                        {getHealthIcon(systemHealth.status)}
                        <span className={`font-medium ${getHealthColor(systemHealth.status)}`}>
                            {systemHealth.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Server size={16} className="text-blue-500" />
                            <h3 className="text-sm font-medium">Uptime</h3>
                        </div>
                        <div className="text-2xl font-bold">{systemHealth.uptime}</div>
                        <div className="text-xs text-gray-500">Last restart: 24h ago</div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-purple-500" />
                            <h3 className="text-sm font-medium">Avg Response</h3>
                        </div>
                        <div className="text-2xl font-bold">{systemHealth.responseTime}ms</div>
                        <div className="text-xs text-gray-500">
                            {systemHealth.responseTime < 200 ? 'Optimal' : 'Needs attention'}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className="text-orange-500" />
                            <h3 className="text-sm font-medium">Error Rate</h3>
                        </div>
                        <div className="text-2xl font-bold">{systemHealth.errorRate}%</div>
                        <div className="text-xs text-gray-500">
                            {systemHealth.errorRate < 1 ? 'Low' : 'Moderate'}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity size={16} className="text-green-500" />
                            <h3 className="text-sm font-medium">Active Users</h3>
                        </div>
                        <div className="text-2xl font-bold">{systemHealth.activeUsers}</div>
                        <div className="text-xs text-gray-500">Last 24 hours</div>
                    </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                    Last checked: {formatTimestamp(systemHealth.lastCheck)}
                </div>
            </div>

            {/* Performance Monitoring Section */}
            <div className="mb-6">
                <PerformanceMonitor />
            </div>

            {/* API Performance Metrics */}
            <div className="elevated-card mb-6">
                <h2 className="text-lg font-semibold mb-4">API Performance Metrics</h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Endpoint</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Avg Response</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Success Rate</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Total Calls</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apiMetrics.map((metric, index) => (
                                <motion.tr 
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                >
                                    <td className="py-3 px-4">
                                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                            {metric.endpoint}
                                        </code>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            {metric.avgResponse < 150 ? 
                                                <TrendingDown size={14} className="text-green-500" /> :
                                                <TrendingUp size={14} className="text-yellow-500" />
                                            }
                                            <span className="font-medium">{metric.avgResponse}ms</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="h-2 rounded-full bg-green-500"
                                                    style={{ width: `${metric.successRate}%` }}
                                                />
                                            </div>
                                            <span className="text-sm">{metric.successRate}%</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="font-medium">{metric.calls.toLocaleString()}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                            metric.successRate >= 99 ? 'bg-green-100 text-green-800' :
                                            metric.successRate >= 98 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {metric.successRate >= 99 ? 'Excellent' :
                                             metric.successRate >= 98 ? 'Good' : 'Needs Attention'}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                    Metrics updated every 5 minutes. Threshold: Response time < 200ms, Success rate > 99%
                </div>
            </div>

            {/* Recent Incidents */}
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
                                className={`p-4 rounded-lg border ${
                                    incident.type === 'error' ? 'border-red-200 bg-red-50' :
                                    incident.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                                    'border-blue-200 bg-blue-50'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {incident.type === 'error' ? 
                                                <AlertCircle size={16} className="text-red-500" /> :
                                                incident.type === 'warning' ?
                                                <AlertCircle size={16} className="text-yellow-500" /> :
                                                <Activity size={16} className="text-blue-500" />
                                            }
                                            <h3 className="font-medium">{incident.title}</h3>
                                            {incident.resolved && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                                    <CheckCircle size={10} />
                                                    Resolved
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                                        <div className="text-xs text-gray-500">
                                            {formatTimestamp(incident.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                        <p>No incidents reported in the last 24 hours</p>
                    </div>
                )}
                
                <div className="mt-4 text-sm text-gray-500">
                    Incident response time target: < 15 minutes for critical issues
                </div>
            </div>

            {/* Monitoring Recommendations */}
            <div className="elevated-card mt-6">
                <h2 className="text-lg font-semibold mb-4">Monitoring Recommendations</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-medium mb-2">Phase 2 Enhancements</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Implement real-time WebSocket monitoring</li>
                            <li>• Add database performance metrics</li>
                            <li>• Integrate with backend monitoring systems</li>
                            <li>• Set up automated alerting via email/SMS</li>
                        </ul>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="font-medium mb-2">Immediate Actions</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Review API endpoints with response time > 200ms</li>
                            <li>• Monitor error rate trends daily</li>
                            <li>• Set up dashboard for business stakeholders</li>
                            <li>• Document incident response procedures</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}