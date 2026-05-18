import { useState, useEffect, useContext, useMemo } from 'react'
import {
    Clock, User, Shield, Database, Download, Eye, RefreshCw
} from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { useRBAC, PermissionGuard } from '../contexts/RBACContext.jsx'
import { PERMISSIONS } from '../rbac.js'
import { StatusBadge, DataTable, GlassCard, PageHeader, StandardButton } from '../components/ui/'

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

const STATUS_VARIANT_MAP = {
    SUCCESS: 'active',
    FAILED: 'blocked',
}

const TABLE_FILTERS = [
    {
        key: 'action',
        label: 'All Actions',
        options: [
            { value: 'LOGIN', label: 'Login' },
            { value: 'CREATE_SCHOOL', label: 'Create School' },
            { value: 'UPDATE_SCHOOL', label: 'Update School' },
            { value: 'DELETE_SCHOOL', label: 'Delete School' },
            { value: 'VIEW_SCHOOL', label: 'View School' },
            { value: 'UPDATE_BILLING', label: 'Update Billing' },
            { value: 'EXPORT_DATA', label: 'Export Data' },
            { value: 'UNAUTHORIZED_ACCESS', label: 'Unauthorized Access' },
        ]
    },
    {
        key: 'status',
        label: 'All Status',
        options: [
            { value: 'SUCCESS', label: 'Success' },
            { value: 'FAILED', label: 'Failed' },
        ]
    }
]

export default function AuditLogsPage() {
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState({
        action: '',
        status: '',
        userRole: '',
        startDate: '',
        endDate: ''
    })
    const toast = useContext(ToastCtx)
    const { checkPermission } = useRBAC()

    const filteredLogs = useMemo(() => {
        let result = [...mockAuditLogs]

        if (search) {
            const searchLower = search.toLowerCase()
            result = result.filter(log =>
                log.userId.toLowerCase().includes(searchLower) ||
                log.details.toLowerCase().includes(searchLower) ||
                log.entityId.toLowerCase().includes(searchLower)
            )
        }

        if (filters.action) {
            result = result.filter(log => log.action === filters.action)
        }
        if (filters.status) {
            result = result.filter(log => log.status === filters.status)
        }
        if (filters.userRole) {
            result = result.filter(log => log.userRole === filters.userRole)
        }
        if (filters.startDate) {
            result = result.filter(log => new Date(log.timestamp) >= new Date(filters.startDate))
        }
        if (filters.endDate) {
            result = result.filter(log => new Date(log.timestamp) <= new Date(filters.endDate))
        }

        return result
    }, [search, filters])

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500)
        return () => clearTimeout(timer)
    }, [])

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const exportLogs = () => {
        const dataStr = JSON.stringify(filteredLogs, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
        const exportFileDefaultName = `audit_logs_${new Date().toISOString().split('T')[0]}.json`
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
        toast('success', 'Audit logs exported successfully')
    }

    const refreshLogs = () => {
        setLoading(true)
        setTimeout(() => setLoading(false), 500)
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

    const columns = [
        {
            key: 'timestamp',
            label: 'Timestamp',
            sortable: true,
            render: (val) => (
                <div className="flex items-center gap-2">
                    <Clock size={12} className="text-tertiary" />
                    <span className="text-secondary">{formatTimestamp(val)}</span>
                </div>
            )
        },
        {
            key: 'userId',
            label: 'User',
            sortable: true,
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <User size={12} className="text-tertiary" />
                    <div>
                        <div className="font-bold">{val}</div>
                        <div className="text-xs text-tertiary">{row.userRole}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'action',
            label: 'Action',
            sortable: true,
            render: (val) => (
                <div className="flex items-center gap-2">
                    {getActionIcon(val)}
                    <span>{val.replace(/_/g, ' ')}</span>
                </div>
            )
        },
        {
            key: 'entityType',
            label: 'Entity',
            render: (val, row) => (
                <div>
                    <div>{val}</div>
                    <div className="text-xs text-tertiary">{row.entityId}</div>
                </div>
            )
        },
        {
            key: 'details',
            label: 'Details',
            render: (val) => <span className="text-secondary">{val}</span>
        },
        {
            key: 'ipAddress',
            label: 'IP Address',
            render: (val) => (
                <div className="flex items-center gap-2">
                    <Shield size={12} className="text-tertiary" />
                    <span className="text-secondary">{val}</span>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => (
                <StatusBadge status={STATUS_VARIANT_MAP[val] || 'pending'} label={val} />
            )
        }
    ]

    if (!checkPermission(PERMISSIONS.VIEW_AUDIT_LOGS)) {
        return (
            <div className="page-container">
                <PageHeader title="Access Denied" description="You don't have permission to view audit logs" />
            </div>
        )
    }

    return (
        <div className="page-container">
            <PageHeader
                title="Audit Logs"
                description="Track all system activities and user actions"
                actions={
                    <>
                        <StandardButton variant="outline" size="sm" icon={RefreshCw} onClick={refreshLogs} isLoading={loading}>
                            Refresh
                        </StandardButton>
                        <PermissionGuard requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
                            <StandardButton variant="primary" size="sm" icon={Download} onClick={exportLogs}>
                                Export Logs
                            </StandardButton>
                        </PermissionGuard>
                    </>
                }
            />

            <GlassCard className="mb-6" hover={false}>
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label">{'\u00A0'}</label>
                        <StandardButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setFilters({ action: '', status: '', userRole: '', startDate: '', endDate: '' })
                                setSearch('')
                            }}
                        >
                            Clear Filters
                        </StandardButton>
                    </div>
                </div>
            </GlassCard>

            <DataTable
                columns={columns}
                rows={filteredLogs}
                pageSize={20}
                searchValue={search}
                onSearchChange={setSearch}
                filters={TABLE_FILTERS}
                activeFilters={{ action: filters.action, status: filters.status }}
                onFilterChange={handleFilterChange}
                loading={loading}
                searchPlaceholder="Search by user, action, or details..."
            />
        </div>
    )
}
