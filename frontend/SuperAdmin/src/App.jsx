import { useState, useEffect, createContext, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, LayoutDashboard, School, Database, Plus, LogOut, MessageSquare, Ticket, Search, FileText,
    Settings, UserCheck, Users, BarChart3, ShieldCheck, Cpu
} from 'lucide-react'
import { isLoggedIn, logout } from './api.js'
import Login from './pages/Login.jsx'
import UpdateCredentials from './pages/UpdateCredentials.jsx'
import SpotlightSearch from './components/SpotlightSearch.jsx'
import { RBACProvider, useRBAC, PermissionGuard } from './contexts/RBACContext.jsx'
import { PERMISSIONS } from './rbac.js'
import HealthDot from './components/ui/HealthDot.jsx'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const SchoolsList = lazy(() => import('./pages/SchoolsList.jsx'))
const SchoolDetail = lazy(() => import('./pages/SchoolDetail.jsx'))
const BackupPage = lazy(() => import('./pages/BackupPage.jsx'))
const SetupPage = lazy(() => import('./pages/SetupPage.jsx'))
const SetupTemplatesPage = lazy(() => import('./pages/SetupTemplatesPage.jsx'))
const SessionsPage = lazy(() => import('./pages/SessionsPage.jsx'))
const SupportPage = lazy(() => import('./pages/SupportPage.jsx'))
const BillingPage = lazy(() => import('./pages/Billing/BillingPage.jsx'))
const PromoPage = lazy(() => import('./pages/PromoPage.jsx'))
const AISettings = lazy(() => import('./pages/AISettings.jsx'))
const SystemSettings = lazy(() => import('./pages/SystemSettings.jsx'))
const Monitoring = lazy(() => import('./pages/Monitoring.jsx'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage.jsx'))

const PageLoader = () => (
  <div className="flex items-center justify-center" style={{ height: 200, width: '100%' }}>
    <div className="spinner" />
  </div>
)

export const ToastCtx = createContext(null)

function PrivateLayout() {
    const [toast, setToast] = useState(null)
    const { user, checkPermission } = useRBAC()

    const showToast = (type, msg) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 3500)
    }

    const navItems = [
        { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard', permission: PERMISSIONS.VIEW_DASHBOARD },
        { to: '/schools', icon: <School size={16} />, label: 'Schools', permission: PERMISSIONS.VIEW_SCHOOLS },
        { to: '/billing', icon: <Database size={16} />, label: 'Billing & Rev', permission: PERMISSIONS.VIEW_BILLING },
        { to: '/promos', icon: <Ticket size={16} />, label: 'Promo Codes', permission: PERMISSIONS.VIEW_PROMOS },
        { to: '/setup', icon: <Plus size={16} />, label: 'Add School', permission: PERMISSIONS.CREATE_SCHOOL },
        { to: '/setup-templates', icon: <FileText size={16} />, label: 'Setup Templates', permission: PERMISSIONS.VIEW_SETUP_TEMPLATES },
        { to: '/support', icon: <MessageSquare size={16} />, label: 'Support', permission: PERMISSIONS.VIEW_SUPPORT },
        { to: '/backup', icon: <Database size={16} />, label: 'Backup', permission: PERMISSIONS.VIEW_BACKUP },
        { to: '/settings', icon: <Settings size={16} />, label: 'Global API Keys', permission: PERMISSIONS.VIEW_AI_SETTINGS },
        { to: '/ai-settings', icon: <Cpu size={16} />, label: 'AI Configuration', permission: PERMISSIONS.VIEW_AI_SETTINGS },
        { to: '/user-management', icon: <Users size={16} />, label: 'User Management', permission: PERMISSIONS.VIEW_USERS, adminOnly: true },
        { to: '/audit-logs', icon: <ShieldCheck size={16} />, label: 'Audit Logs', permission: PERMISSIONS.VIEW_AUDIT_LOGS, adminOnly: true },
        { to: '/monitoring', icon: <BarChart3 size={16} />, label: 'Monitoring', permission: PERMISSIONS.VIEW_MONITORING, adminOnly: true },
    ]

    const nav = navItems.filter(item => {
        if (item.permission) return checkPermission(item.permission)
        return true
    })

    const [health, setHealth] = useState('checking')
    const [healthDetails, setHealthDetails] = useState(null)
    const [healthAlerts, setHealthAlerts] = useState([])
    
    useEffect(() => {
        const check = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
                const res = await fetch(`${baseUrl}/health`)
                const data = await res.json()
                if (data.status === 'healthy') { setHealth('healthy'); setHealthDetails(null); setHealthAlerts([]) }
                else if (data.status === 'degraded') { setHealth('degraded'); setHealthDetails(data); setHealthAlerts(data.alerts || []) }
                else { setHealth('critical'); setHealthDetails(data); setHealthAlerts(data.alerts || []) }
            } catch (e) {
                setHealth('offline')
                setHealthDetails({ status: 'offline', message: 'Network connection lost' })
                setHealthAlerts([{ severity: 'critical', dependency: 'backend', message: 'Network connection lost', timestamp: new Date().toISOString() }])
            }
        }
        check()
        const itv = setInterval(check, 15000)
        return () => clearInterval(itv)
    }, [])

    const HighPriorityAlert = () => {
        if (health !== 'critical' && health !== 'offline' && health !== 'degraded') return null
        const isCritical = health === 'critical' || health === 'offline'
        const failedDeps = healthAlerts.map(a => a.dependency).join(', ')
        const alertMessages = healthAlerts.map(a => `${a.dependency}: ${a.message}`).join(' | ')
        
        return (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className={`alert-banner ${isCritical ? 'critical' : 'warning'}`}
            >
                <ShieldCheck size={20} className="animate-pulse" />
                <span>{isCritical ? 'SYSTEM CRITICAL' : 'SYSTEM DEGRADED'}: </span>
                <span style={{ opacity: 0.9, fontWeight: 500 }}>
                    {health === 'offline' ? 'Backend Signal Lost' : `Failed: ${failedDeps || 'Unknown'}`}
                </span>
                {healthAlerts.length > 0 && (
                    <span className="text-xs" style={{ opacity: 0.7, fontWeight: 400, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alertMessages}
                    </span>
                )}
                <button 
                    className="btn btn-xs"
                    onClick={() => window.location.href='/monitoring'}
                    style={{ marginLeft: 12, background: 'white', color: 'inherit', border: 'none', padding: '4px 12px', borderRadius: 4, textTransform: 'uppercase' }}
                >
                    Diagnose Now
                </button>
            </motion.div>
        )
    }

    const healthLabel = health === 'healthy' ? 'Operational' : health === 'degraded' ? 'Degraded' : health === 'checking' ? 'Syncing...' : health === 'critical' ? 'Critical' : 'Signal Lost'

    return (
        <ToastCtx.Provider value={showToast}>
            <HighPriorityAlert />
            <SpotlightSearch />
            <div className="layout">
                <aside className="sidebar">
                    <div className="sidebar-logo">
                        <div className="icon"><Shield size={18} color="white" /></div>
                        <div>
                            <h2>Super Admin</h2>
                            <p>Control Panel</p>
                        </div>
                    </div>
                    
                    {!user.isLoading && (
                        <div className="role-badge-container">
                            <div className="flex items-center gap-2 mb-1">
                                <UserCheck size={12} />
                                <span className="font-semibold text-xs">{user.role?.replace('_', ' ')}</span>
                            </div>
                            <div className="text-tertiary" style={{ fontSize: 11 }}>
                                {user.permissions.length} permissions
                            </div>
                        </div>
                    )}
                    
                    {nav.map(n => (
                        <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                            {n.icon} {n.label}
                        </NavLink>
                    ))}
                    
                    <div className="nav-bottom">
                        <button
                            className="nav-item text-danger"
                            style={{ width: '100%', background: 'none', border: 'none' }}
                            onClick={() => { logout(); window.location.href = '/login' }}
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </aside>

                <div className="main-container">
                    <header className="top-bar">
                        <div 
                            className="search-trigger"
                            onClick={() => window.dispatchEvent(new CustomEvent('toggle-spotlight'))}
                        >
                            <Search size={16} />
                            <span>Search for schools or features...</span>
                            <kbd className="kbd">⌘K</kbd>
                        </div>

                        <div className="health-indicator">
                            <HealthDot status={health} size={7} />
                            <span>System: {healthLabel}</span>
                        </div>
                    </header>

                    <main className="main">
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="schools" element={<SchoolsList />} />
                                <Route path="schools/:schoolId" element={<SchoolDetail />} />
                                <Route path="schools/:schoolId/sessions" element={<SessionsPage />} />
                                <Route path="setup" element={<SetupPage />} />
                                <Route path="setup-templates" element={<SetupTemplatesPage />} />
                                <Route path="support" element={<SupportPage />} />
                                <Route path="billing" element={<BillingPage />} />
                                <Route path="promos" element={<PromoPage />} />
                                <Route path="backup" element={<BackupPage />} />
                                <Route path="settings" element={<SystemSettings />} />
                                <Route path="ai-settings" element={<AISettings />} />
                                <Route path="monitoring" element={<Monitoring />} />
                                <Route path="audit-logs" element={<AuditLogsPage />} />
                                <Route index element={<Navigate to="dashboard" replace />} />
                            </Routes>
                        </Suspense>
                    </main>
                </div>
            </div>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`toast toast-${toast.type}`}
                    >
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </ToastCtx.Provider>
    )
}

function RequireAuth({ children }) {
    if (!isLoggedIn()) return <Navigate to="/login" replace />
    return children
}

export default function App() {
    return (
        <RBACProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/update-credentials" element={<UpdateCredentials />} />
                    <Route path="/*" element={<RequireAuth><PrivateLayout /></RequireAuth>} />
                </Routes>
            </BrowserRouter>
        </RBACProvider>
    )
}
