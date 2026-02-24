import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, LayoutDashboard, School, Database, Plus, LogOut, MessageSquare
} from 'lucide-react'
import { isLoggedIn, logout } from './api.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SchoolsList from './pages/SchoolsList.jsx'
import SchoolDetail from './pages/SchoolDetail.jsx'
import BackupPage from './pages/BackupPage.jsx'
import SetupPage from './pages/SetupPage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import SupportPage from './pages/SupportPage.jsx'
import BillingPage from './pages/Billing/BillingPage.jsx'

export const ToastCtx = createContext(null)

function PrivateLayout() {
    const [toast, setToast] = useState(null)

    const showToast = (type, msg) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 3500)
    }

    const nav = [
        { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
        { to: '/schools', icon: <School size={16} />, label: 'Schools' },
        { to: '/billing', icon: <Database size={16} />, label: 'Billing & Rev' },
        { to: '/setup', icon: <Plus size={16} />, label: 'Add School' },
        { to: '/support', icon: <MessageSquare size={16} />, label: 'Support' },
        { to: '/backup', icon: <Database size={16} />, label: 'Backup' },
    ]

    return (
        <ToastCtx.Provider value={showToast}>
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

                {/* Main */}
                <main className="main">
                    <AnimatePresence mode="wait">
                        <Routes>
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="schools" element={<SchoolsList />} />
                            <Route path="schools/:schoolId" element={<SchoolDetail />} />
                            <Route path="schools/:schoolId/sessions" element={<SessionsPage />} />
                            <Route path="setup" element={<SetupPage />} />
                            <Route path="support" element={<SupportPage />} />
                            <Route path="billing" element={<BillingPage />} />
                            <Route path="backup" element={<BackupPage />} />
                            <Route index element={<Navigate to="dashboard" replace />} />
                        </Routes>
                    </AnimatePresence>
                </main>
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
    if (!isLoggedIn()) return <Navigate to="/login" replace />
    return children
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={<RequireAuth><PrivateLayout /></RequireAuth>} />
            </Routes>
        </BrowserRouter>
    )
}
