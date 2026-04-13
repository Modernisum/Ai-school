import { useState, useEffect, useCallback } from 'react'
import { Activity, Cpu, Database, Clock, AlertCircle, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Performance monitoring dashboard component for Phase 1
 * Tracks frontend performance metrics, API response times, and system health
 */
export default function PerformanceMonitor() {
    const [metrics, setMetrics] = useState({
        pageLoadTime: 0,
        apiResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        errorRate: 0,
        uptime: 0
    })
    
    const [performanceData, setPerformanceData] = useState([])
    const [loading, setLoading] = useState(true)
    const [alerts, setAlerts] = useState([])

    // Mock performance data for Phase 1
    const mockPerformanceData = [
        { timestamp: '10:00', responseTime: 120, requests: 45, errors: 2 },
        { timestamp: '10:15', responseTime: 135, requests: 52, errors: 1 },
        { timestamp: '10:30', responseTime: 110, requests: 48, errors: 0 },
        { timestamp: '10:45', responseTime: 125, requests: 50, errors: 3 },
        { timestamp: '11:00', responseTime: 140, requests: 55, errors: 1 },
        { timestamp: '11:15', responseTime: 130, requests: 53, errors: 0 },
        { timestamp: '11:30', responseTime: 115, requests: 49, errors: 2 }
    ]

    // Simulate performance monitoring
    const updateMetrics = useCallback(() => {
        // In Phase 1, we'll use mock data
        // TODO: Replace with actual performance monitoring in Phase 2/3
        
        const now = Date.now()
        const mockMetrics = {
            pageLoadTime: Math.floor(Math.random() * 200) + 100, // 100-300ms
            apiResponseTime: Math.floor(Math.random() * 150) + 50, // 50-200ms
            memoryUsage: Math.floor(Math.random() * 30) + 50, // 50-80%
            cpuUsage: Math.floor(Math.random() * 40) + 20, // 20-60%
            activeConnections: Math.floor(Math.random() * 50) + 10, // 10-60
            errorRate: Math.random() * 5, // 0-5%
            uptime: Math.floor((now - Date.now() + 86400000) / 1000) // mock 24h
        }
        
        setMetrics(mockMetrics)
        
        // Update performance data
        const newDataPoint = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            responseTime: mockMetrics.apiResponseTime,
            requests: Math.floor(Math.random() * 20) + 40,
            errors: Math.floor(Math.random() * 4)
        }
        
        setPerformanceData(prev => {
            const updated = [...prev, newDataPoint]
            if (updated.length > 20) updated.shift() // Keep last 20 data points
            return updated
        })
        
        // Check for alerts
        const newAlerts = []
        if (mockMetrics.apiResponseTime > 300) {
            newAlerts.push({
                id: Date.now(),
                type: 'warning',
                message: `High API response time: ${mockMetrics.apiResponseTime}ms`,
                timestamp: new Date().toISOString()
            })
        }
        
        if (mockMetrics.errorRate > 3) {
            newAlerts.push({
                id: Date.now() + 1,
                type: 'error',
                message: `High error rate: ${mockMetrics.errorRate.toFixed(2)}%`,
                timestamp: new Date().toISOString()
            })
        }
        
        if (mockMetrics.memoryUsage > 80) {
            newAlerts.push({
                id: Date.now() + 2,
                type: 'critical',
                message: `High memory usage: ${mockMetrics.memoryUsage}%`,
                timestamp: new Date().toISOString()
            })
        }
        
        if (newAlerts.length > 0) {
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)) // Keep last 10 alerts
        }
    }, [])

    useEffect(() => {
        // Initialize with mock data
        setPerformanceData(mockPerformanceData)
        
        // Update metrics every 10 seconds
        updateMetrics()
        const interval = setInterval(updateMetrics, 10000)
        
        return () => clearInterval(interval)
    }, [updateMetrics])

    const getStatusColor = (value, thresholds) => {
        if (value >= thresholds.critical) return 'text-red-500'
        if (value >= thresholds.warning) return 'text-yellow-500'
        return 'text-green-500'
    }

    const getStatusIcon = (value, thresholds) => {
        if (value >= thresholds.critical) return <AlertCircle className="text-red-500" size={16} />
        if (value >= thresholds.warning) return <AlertCircle className="text-yellow-500" size={16} />
        return <CheckCircle className="text-green-500" size={16} />
    }

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        
        if (days > 0) return `${days}d ${hours}h`
        if (hours > 0) return `${hours}h ${minutes}m`
        return `${minutes}m`
    }

    return (
        <div className="performance-monitor">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 className="page-title">Performance Dashboard</h1>
                <p className="page-sub">Real-time monitoring of system performance and health</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* API Response Time */}
                <motion.div 
                    className="elevated-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Activity size={20} className="text-blue-500" />
                            <h3 className="text-sm font-medium">API Response</h3>
                        </div>
                        {getStatusIcon(metrics.apiResponseTime, { warning: 200, critical: 300 })}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                        {metrics.apiResponseTime}ms
                    </div>
                    <div className={`text-sm ${getStatusColor(metrics.apiResponseTime, { warning: 200, critical: 300 })}`}>
                        {metrics.apiResponseTime < 200 ? 'Optimal' : 
                         metrics.apiResponseTime < 300 ? 'Warning' : 'Critical'}
                    </div>
                </motion.div>

                {/* Memory Usage */}
                <motion.div 
                    className="elevated-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Database size={20} className="text-purple-500" />
                            <h3 className="text-sm font-medium">Memory</h3>
                        </div>
                        {getStatusIcon(metrics.memoryUsage, { warning: 70, critical: 85 })}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                        {metrics.memoryUsage}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full ${
                                metrics.memoryUsage < 70 ? 'bg-green-500' :
                                metrics.memoryUsage < 85 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(metrics.memoryUsage, 100)}%` }}
                        />
                    </div>
                </motion.div>

                {/* Error Rate */}
                <motion.div 
                    className="elevated-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={20} className="text-red-500" />
                            <h3 className="text-sm font-medium">Error Rate</h3>
                        </div>
                        {getStatusIcon(metrics.errorRate, { warning: 2, critical: 5 })}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                        {metrics.errorRate.toFixed(2)}%
                    </div>
                    <div className="flex items-center gap-2">
                        {metrics.errorRate < 1 ? (
                            <TrendingDown size={16} className="text-green-500" />
                        ) : (
                            <TrendingUp size={16} className="text-red-500" />
                        )}
                        <span className={`text-sm ${metrics.errorRate < 1 ? 'text-green-500' : 'text-red-500'}`}>
                            {metrics.errorRate < 1 ? 'Stable' : 'Increasing'}
                        </span>
                    </div>
                </motion.div>

                {/* Uptime */}
                <motion.div 
                    className="elevated-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Clock size={20} className="text-green-500" />
                            <h3 className="text-sm font-medium">Uptime</h3>
                        </div>
                        <Zap size={16} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-bold mb-1">
                        {formatUptime(metrics.uptime)}
                    </div>
                    <div className="text-sm text-green-500">
                        System Operational
                    </div>
                </motion.div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Response Time Chart */}
                <motion.div 
                    className="elevated-card"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h3 className="text-lg font-semibold mb-4">API Response Time Trend</h3>
                    <div className="h-64">
                        <div className="flex items-center justify-center h-full">
                            {/* Simple chart visualization for Phase 1 */}
                            <div className="w-full h-48 flex items-end justify-between px-4">
                                {performanceData.slice(-8).map((point, index) => (
                                    <div key={index} className="flex flex-col items-center">
                                        <div 
                                            className="w-8 bg-blue-500 rounded-t"
                                            style={{ height: `${(point.responseTime / 200) * 100}%` }}
                                        />
                                        <div className="text-xs mt-2 text-gray-500">
                                            {point.timestamp}
                                        </div>
                                        <div className="text-xs font-medium">
                                            {point.responseTime}ms
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        Average: {Math.round(performanceData.reduce((sum, p) => sum + p.responseTime, 0) / performanceData.length)}ms
                    </div>
                </motion.div>

                {/* Requests & Errors Chart */}
                <motion.div 
                    className="elevated-card"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h3 className="text-lg font-semibold mb-4">Requests & Errors</h3>
                    <div className="h-64">
                        <div className="flex items-center justify-center h-full">
                            <div className="w-full h-48 flex items-end justify-between px-4">
                                {performanceData.slice(-8).map((point, index) => (
                                    <div key={index} className="flex items-end gap-1">
                                        <div 
                                            className="w-6 bg-green-500 rounded-t"
                                            style={{ height: `${(point.requests / 100) * 100}%` }}
                                            title={`${point.requests} requests`}
                                        />
                                        <div 
                                            className="w-6 bg-red-500 rounded-t"
                                            style={{ height: `${(point.errors * 20) || 5}%` }}
                                            title={`${point.errors} errors`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Requests</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>Errors</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Alerts */}
            <motion.div 
                className="elevated-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
                {alerts.length > 0 ? (
                    <div className="space-y-3">
                        {alerts.slice(0, 5).map((alert) => (
                            <div 
                                key={alert.id}
                                className={`p-3 rounded-lg border ${
                                    alert.type === 'critical' ? 'border-red-200 bg-red-50' :
                                    alert.type === 'error' ? 'border-orange-200 bg-orange-50' :
                                    'border-yellow-200 bg-yellow-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={16} className={
                                            alert.type === 'critical' ? 'text-red-500' :
                                            alert.type === 'error' ? 'text-orange-500' :
                                            'text-yellow-500'
                                        } />
                                        <span className="font-medium">{alert.message}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                        <p>No alerts - All systems operational</p>
                    </div>
                )}
            </motion.div>

            {/* Performance Tips */}
            <motion.div 
                className="elevated-card mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h3 className="text-lg font-semibold mb-4">Performance Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-2">API Optimization</h4>
                        <p className="text-sm text-gray-600">
                            Consider implementing response caching for frequently accessed endpoints.
                            Current average response time: {Math.round(metrics.apiResponseTime)}ms
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium mb-2">Memory Management</h4>
                        <p className="text-sm text-gray-600">
                            Memory usage at {metrics.memoryUsage}%. Consider implementing lazy loading
                            for non-critical components.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// Helper component for checkmark
function CheckCircle({ className, size }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size || 16} 
            height={size || 16} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={className}
>
<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
<polyline points="22 4 12 14.01 9 11.01" />
</svg>
)
}
