import { useState, useEffect, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, Filter, Calendar, User, Shield, Database, Clock, Eye, Download,
    RefreshCw, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, XCircle, Loader
} from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { useRBAC, PERMISSIONS, PermissionGuard } from '../contexts/RBACContext.jsx'

// Mock audit log data for development
const mockAuditLogs = [
    {
        id: '1',
        timestamp: '2026-04-13T10:30:00Z',
        userId: 'superadmin',
        userRole: 'SUPER_ADMIN',
        action: 'LOGIN',
        entityType: 'AUTH',
        entityId: 'session_001',
        details: 'User logged in from IP 192.168.1.100',
        ipAddress: '192.168.1.100',
        status: 'SUCCESS',
        metadata: { userAgent: 'Chrome/120.0' }
    },
    {
        id: '2',
        timestamp: '2026-04-13T10:15:00Z',
        userId: 'admin1',
        userRole: 'ADMINISTRATOR',
        action: 'CREATE_SCHOOL',
        entityType: 'SCHOOL',
        entityId: 'school_789012',
        details: 'Created new school "ABC International"',
        ipAddress: '192.168.1.101',
        status: 'SUCCESS',
        metadata: { schoolName: 'ABC International' }
    },
    {
        id: '3',
        timestamp: '2026-04-13T09:45:00Z',
        userId: 'support1',
        userRole: 'SUPPORT_MANAGER',
        action: 'VIEW_SCHOOL',
        entityType: 'SCHOOL',
        entityId: 'school_123456',
        details: 'Viewed school details',
        ipAddress: '192.168.1.102',
        status: 'SUCCESS',
        metadata: { schoolId: 'school_123456' }
    },
    {
        id: '4',
        timestamp: '2026-04-13T09:30:00Z',
        userId: 'billing1',
        userRole: 'BILLING_MANAGER',
        action: 'UPDATE_BILLING',
        entityType: 'BILLING',
        entityId: 'invoice_001',
        details: 'Updated billing status for school',
        ipAddress: '192.168.1.103',
        status: 'SUCCESS',
        metadata: { invoiceId: 'invoice_001' }
    },
    {
        id: '5',
        timestamp: '2026-04-13T09:15:00Z',
        userId: 'unknown',
        userRole: 'UNKNOWN',
        action: 'UNAUTHORIZED_ACCESS',
        entityType: 'SECURITY',
        entityId: 'alert_001',
        details: 'Attempted unauthorized access to admin panel',
        ipAddress: '192.168.1.200',
        status: 'FAILED',
        metadata: { reason: 'Invalid credentials' }
    },
    {
        id: '6',
        timestamp: '2026-04-13T08:45:00Z',
        userId: 'superadmin',
        userRole: 'SUPER_ADMIN',
        action: 'EXPORT_DATA',
        entityType: 'BACKUP',
        entityId: 'export_001',
        details: 'Exported all school data',
        ipAddress: '192.168.1.100',
        status: 'SUCCESS',
        metadata: { fileSize: '45MB', format: 'JSON' }
    },
    {
        id: '7',
        timestamp: '2026-04-13T08:30:00Z',
        userId: 'admin1',
        userRole: 'ADMINISTRATOR',
        action: 'DELETE_SCHOOL',
        entityType: 'SCHOOL',
        entityId: 'school_old_001',
        details: 'Deleted school "Old Academy"',
        ipAddress: '192.168.1.101',
        status: 'SUCCESS',
        metadata: { schoolName: 'Old Academy' }
    },
    {
        id: '8',
        timestamp: '2026-04-13T08:15:00Z',
        userId: 'superadmin',
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_SYSTEM_CONFIG',
        entityType: 'SYSTEM',
        entityId: 'config_001',
        details: 'Updated system configuration',
        ipAddress: '192.168.1.100',
        status: 'SUCCESS',
        metadata: { configKey: 'session_timeout', value: '24h' }
    }
]

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState({
        action: 'all',
        status: 'all',
        userRole: 'all',
        startDate: '',
        endDate: ''
    })
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    })
    const toast = useContext(ToastCtx)
    const { user, checkPermission } = useRBAC()

    const loadLogs = useCallback(async () => {
        setLoading(true)
        try {
            // In Phase 1, we'll use mock data
            // TODO: Replace with actual API call in Phase 2
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Filter mock data
            let filteredLogs = [...mockAuditLogs]
            
            // Apply search
            if (search) {
                const searchLower = search.toLowerCase()
                filteredLogs = filteredLogs.filter(log => 
                    log.userId.toLowerCase().includes(searchLower) ||
                    log.details.toLowerCase().includes(searchLower) ||
                    log.entityId.toLowerCase().includes(searchLower)
                )
            }
            
            // Apply filters
            if (filters.action !== 'all') {
                filteredLogs = filteredLogs.filter(log => log.action === filters.action)
            }
            if (filters.status !== 'all') {
                filteredLogs = filteredLogs.filter(log => log.status === filters.status)
            }
            if (filters.userRole !== 'all') {
                filteredLogs = filteredLogs.filter(log => log.userRole === filters.userRole)
            }
            
            // Apply date filters
            if (filters.startDate) {
                filteredLogs = filteredLogs.filter(log => 
                    new Date(log.timestamp) >= new Date(filters.startDate)
                )
            }
            if (filters.endDate) {
                filteredLogs = filteredLogs.filter(log => 
                    new Date(log.timestamp) <= new Date(filters.endDate)
                )
            }
            
            // Calculate pagination
            const total = filteredLogs.length
            const totalPages = Math.ceil(total / pagination.limit)
            const startIndex = (pagination.page - 1) * pagination.limit
            const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pagination.limit)
            
            setLogs(paginatedLogs)
            setPagination(prev => ({
                ...prev,
                total,
                totalPages
            }))
            
        } catch (error) {
            console.error('Failed to load audit logs:', error)
            toast('error', 'Failed to load audit logs')
        } finally {
            setLoading(false)
        }
    }, [search, filters, pagination.page, pagination.limit, toast])

    useEffect(() => {
        loadLogs()
    }, [loadLogs])

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
    }

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }))
    }

    const exportLogs = () => {
        const dataStr = JSON.stringify(logs, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
        
        const exportFileDefaultName = `audit_logs_${new Date().toISOString().split('T')[0]}.json`
        
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
        
        toast('success', 'Audit logs exported successfully')
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'SUCCESS': return <CheckCircle size={12} color="#10b981" />
            case 'FAILED': return <XCircle size={12} color="#ef4444" />
            default: return <AlertCircle size={12} color="#f59e0b" />
        }
    }

    const getActionIcon = (action) => {
        if (action.includes('LOGIN')) return <Shield size={12} />
        if (action.includes('SCHOOL')) return <Database size={12} />
        if (action.includes('BILLING')) return <Database size={12} />
        if (action.includes('EXPORT')) return <Download size={12} />
        return <Eye size={12} />
    }

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    // Check if user has permission to view audit logs
    if (!checkPermission(PERMISSIONS.VIEW_AUDIT_LOGS)) {
        return (
            <div className="page">
                <div className="page-header">
                    <h1 className="page-title">Access Denied</h1>
                    <p className="page-sub">You don't have permission to view audit logs</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Audit Logs</h1>
                <p className="page-sub">Track all system activities and user actions</p>
            </div>

            {/* Filters Section */}
            <div className="elevated-card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                    {/* Search */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', display: 'block' }}>
                            Search Logs
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                            <input
                                type="text"
                                placeholder="Search by user, action, or details..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 40px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg)',
                                    color: 'var(--text)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Action Filter */}
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', display: 'block' }}>
                            Action
                        </label>
                        <select
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '13px'
                            }}
                        >
                            <option value="all">All Actions</option>
                            <option value="LOGIN">Login</option>
                            <option value="CREATE_SCHOOL">Create School</option>
                            <option value="UPDATE_SCHOOL">Update School</option>
                            <option value="DELETE_SCHOOL">Delete School</option>
                            <option value="VIEW_SCHOOL">View School</option>
                            <option value="UPDATE_BILLING">Update Billing</option>
                            <option value="EXPORT_DATA">Export Data</option>
                            <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', display: 'block' }}>
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '13px'
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <button
                        className="btn btn-outline"
                        onClick={loadLogs}
                        disabled={loading}
                        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>

                    {/* Export Button */}
                    <PermissionGuard requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
                        <button
                            className="btn btn-primary"
                            onClick={exportLogs}
                            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Download size={14} />
                            Export Logs
                        </button>
                    </PermissionGuard>
                </div>

                {/* Date Filters */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', display: 'block' }}>
                            Start Date
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                style={{
                                    padding: '8px 12px 8px 36px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg)',
                                    color: 'var(--text)',
                                    fontSize: '13px'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', display: 'block' }}>
                            End Date
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                style={{
                                    padding: '8px 12px 8px 36px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg)',
                                    color: 'var(--text)',
                                    fontSize: '13px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Clear Filters */}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            className="btn btn-ghost"
                            onClick={() => {
                                setFilters({
                                    action: 'all',
                                    status: 'all',
                                    userRole: 'all',
                                    startDate: '',
                                    endDate: ''
                                })
                                setSearch('')
                            }}
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="elevated-card">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <Loader size={24} className="spin" />
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Timestamp</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>User</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Action</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Entity</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Details</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>IP Address</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <motion.tr
                                            key={log.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                borderBottom: '1px solid var(--border2)',
                                                '&:hover': { background: 'var(--bg2)' }
                                            }}
                                        >
                                            <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text2)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Clock size={12} color="var(--text3)" />
                                                    {formatTimestamp(log.timestamp)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <User size={12} color="var(--text3)" />
                                                    <div>
                                                        <div style={{ fontWeight: 500 }}>{log.userId}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{log.userRole}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {getActionIcon(log.action)}
                                                    <span>{log.action.replace(/_/g, ' ')}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text2)' }}>
                                                <div>
                                                    <div>{log.entityType}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{log.entityId}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text2)', maxWidth: '300px' }}>
                                                {log.details}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text2)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Shield size={12} color="var(--text3)" />
                                                    {log.ipAddress}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    background: log.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.1)' :
                                                              log.status === 'FAILED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: log.status === 'SUCCESS' ? '#10b981' :
                                                          log.status === 'FAILED' ? '#ef4444' : '#f59e0b'
                                                }}>
                                                    {getStatusIcon(log.status)}
                                                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{log.status}</span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '24px',
                                paddingTop: '16px',
                                borderTop: '1px solid var(--border)'
                            }}>
                                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <ChevronLeft size={14} />
                                        Previous
                                    </button>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.totalPages - 2) {
                                                pageNum = pagination.totalPages - 4 + i;
                                            } else {
                                                pageNum = pagination.page - 2 + i;
                                            }
                                            
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        background: pagination.page === pageNum ? 'var(--primary)' : 'transparent',
                                                        color: pagination.page === pageNum ? 'white' : 'var(--text2)',
                                                        border: 'none',
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        minWidth: '32px'
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        Next
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
