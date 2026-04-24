import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, LayoutDashboard, School, Database, Plus, LogOut, MessageSquare, Ticket, Search, FileText,
    Settings, UserCheck, Users, BarChart3, ShieldCheck
} from 'lucide-react'
import { isLoggedIn, logout } from './api.js'
import Login from './pages/Login.jsx'
import UpdateCredentials from './pages/UpdateCredentials.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SchoolsList from './pages/SchoolsList.jsx'
import SchoolDetail from './pages/SchoolDetail.jsx'
import BackupPage from './pages/BackupPage.jsx'
import SetupPage from './pages/SetupPage.jsx'
import SetupTemplatesPage from './pages/SetupTemplatesPage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import SupportPage from './pages/SupportPage.jsx'
import BillingPage from './pages/Billing/BillingPage.jsx'
import PromoPage from './pages/PromoPage.jsx'
import AISettings from './pages/AISettings.jsx'
import Monitoring from './pages/Monitoring.jsx'

import SpotlightSearch from './components/SpotlightSearch.jsx'
import { RBACProvider, useRBAC, PermissionGuard } from './contexts/RBACContext.jsx'
import { PERMISSIONS } from './rbac.js'

export const ToastCtx = createContext(null)

function PrivateLayout() {
    const [toast, setToast] = useState(null)
    const { user, checkPermission } = useRBAC()

    const showToast = (type, msg) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 3500)
    }

    // Navigation items with required permissions
    const navItems = [
        {
            to: '/dashboard',
            icon: <LayoutDashboard size={16} />,
            label: 'Dashboard',
            permission: PERMISSIONS.VIEW_DASHBOARD
        },
        {
            to: '/schools',
            icon: <School size={16} />,
            label: 'Schools',
            permission: PERMISSIONS.VIEW_SCHOOLS
        },
        {
            to: '/billing',
            icon: <Database size={16} />,
            label: 'Billing & Rev',
            permission: PERMISSIONS.VIEW_BILLING
        },
        {
            to: '/promos',
            icon: <Ticket size={16} />,
            label: 'Promo Codes',
            permission: PERMISSIONS.VIEW_PROMOS
        },
        {
            to: '/setup',
            icon: <Plus size={16} />,
            label: 'Add School',
            permission: PERMISSIONS.CREATE_SCHOOL
        },
        {
            to: '/setup-templates',
            icon: <FileText size={16} />,
            label: 'Setup Templates',
            permission: PERMISSIONS.VIEW_SETUP_TEMPLATES
        },
        {
            to: '/support',
            icon: <MessageSquare size={16} />,
            label: 'Support',
            permission: PERMISSIONS.VIEW_SUPPORT
        },
        {
            to: '/backup',
            icon: <Database size={16} />,
            label: 'Backup',
            permission: PERMISSIONS.VIEW_BACKUP
        },
        {
            to: '/ai-settings',
            icon: <Settings size={16} />,
            label: 'AI Configuration',
            permission: PERMISSIONS.VIEW_AI_SETTINGS
        },
        // Admin-only navigation items
        {
            to: '/user-management',
            icon: <Users size={16} />,
            label: 'User Management',
            permission: PERMISSIONS.VIEW_USERS,
            adminOnly: true
        },
        {
            to: '/audit-logs',
            icon: <ShieldCheck size={16} />,
            label: 'Audit Logs',
            permission: PERMISSIONS.VIEW_AUDIT_LOGS,
            adminOnly: true
        },
        {
            to: '/monitoring',
            icon: <BarChart3 size={16} />,
            label: 'Monitoring',
            permission: PERMISSIONS.VIEW_MONITORING,
            adminOnly: true
        },
    ]

    // Filter navigation based on user permissions
    const nav = navItems.filter(item => {
        if (item.permission) {
            return checkPermission(item.permission)
        }
        return true
    })

    const [health, setHealth] = useState('checking')
    
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/health`)
                setHealth(res.ok ? 'healthy' : 'error')
            } catch (e) {
                setHealth('offline')
            }
        }
        check()
        const itv = setInterval(check, 60000)
        return () => clearInterval(itv)
    }, [])

    return (
        <ToastCtx.Provider value={showToast}>
            <SpotlightSearch />
            <div className="layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-logo">
                        <div className="icon"><Shield size={18} color="white" /></div>
                        <div>
                            <h2>Super Admin</h2>
                            <p>Control Panel</p>
                        </div>
                    </div>
                    
                    {/* User Role Badge */}
                    {!user.isLoading && (
                        <div style={{
                            margin: '0 16px 20px 16px',
                            padding: '8px 12px',
                            background: 'var(--bg-lighter)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <UserCheck size={12} />
                                <span style={{ fontWeight: 600 }}>{user.role?.replace('_', ' ')}</span>
                            </div>
                            <div style={{ color: 'var(--text3)', fontSize: '11px' }}>
                                {user.permissions.length} permissions
                            </div>
                        </div>
                    )}
                    
                    {/* Navigation Items */}
                    {nav.map(n => (
                        <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                            {n.icon} {n.label}
                        </NavLink>
                    ))}
                    
                    <div className="nav-bottom">
                        <button
                            className="nav-item"
                            style={{ width: '100%', background: 'none', border: 'none', color: 'var(--red)' }}
                            onClick={() => { logout(); window.location.href = '/login' }}
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
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

                        <div style={{ display: 'flex', itemsCenter: 'center', gap: '8px', padding: '0 16px' }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: health === 'healthy' ? '#10b981' : health === 'checking' ? '#6366f1' : '#f43f5e',
                                boxShadow: health === 'healthy' ? '0 0 8px #10b981' : 'none',
                                animation: health === 'healthy' ? 'pulse 2s infinite' : 'none'
                            }} />
                            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.05em' }}>
                                Backend: {health === 'healthy' ? 'Operational' : health === 'checking' ? 'Syncing...' : 'Signal Lost'}
                            </span>
                        </div>
                    </header>

                    <main className="main">
                        <AnimatePresence mode="wait">
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
                                <Route path="ai-settings" element={<AISettings />} />
                                <Route path="monitoring" element={<Monitoring />} />
                                <Route index element={<Navigate to="dashboard" replace />} />
                            </Routes>
                        </AnimatePresence>
                    </main>
                </div>
            </div>

            {/* Toast */}
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
    if (!isLoggedIn()) {
        return <Navigate to="/login" replace />
    }
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
