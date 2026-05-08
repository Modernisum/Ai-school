import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, LogIn, Eye, EyeOff, Loader2, RefreshCw, Lock, User, AlertTriangle, Fingerprint, ShieldCheck } from 'lucide-react'
import { adminLogin } from '../api.js'
import StandardButton from '../components/ui/StandardButton.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [health, setHealth] = useState('checking')
    const [attempts, setAttempts] = useState(0)
    const [lockoutUntil, setLockoutUntil] = useState(null)
    const [lockoutCountdown, setLockoutCountdown] = useState('')
    const [showSuccess, setShowSuccess] = useState(false)
    const usernameRef = useRef(null)
    const nav = useNavigate()

    // Load lockout state from sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem('sa_login_lockout')
        if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.until && Date.now() < parsed.until) {
                setLockoutUntil(parsed.until)
                setAttempts(parsed.attempts || MAX_ATTEMPTS)
            } else {
                sessionStorage.removeItem('sa_login_lockout')
            }
        }
        const storedAttempts = sessionStorage.getItem('sa_login_attempts')
        if (storedAttempts) {
            const count = parseInt(storedAttempts, 10)
            if (count > 0 && count < MAX_ATTEMPTS) setAttempts(count)
        }
    }, [])

    // Lockout countdown timer
    useEffect(() => {
        if (!lockoutUntil) return
        const tick = () => {
            const remaining = lockoutUntil - Date.now()
            if (remaining <= 0) {
                setLockoutUntil(null)
                setAttempts(0)
                sessionStorage.removeItem('sa_login_lockout')
                sessionStorage.removeItem('sa_login_attempts')
                return
            }
            const mins = Math.floor(remaining / 60000)
            const secs = Math.floor((remaining % 60000) / 1000)
            setLockoutCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
        }
        tick()
        const itv = setInterval(tick, 1000)
        return () => clearInterval(itv)
    }, [lockoutUntil])

    const checkServer = useCallback(async () => {
        try {
            const res = await fetch('/health')
            setHealth(res.ok ? 'healthy' : 'error')
        } catch {
            setHealth('offline')
        }
    }, [])

    useEffect(() => {
        checkServer()
        const itv = setInterval(checkServer, 30000)
        return () => clearInterval(itv)
    }, [checkServer])

    useEffect(() => {
        if (!lockoutUntil && usernameRef.current) usernameRef.current.focus()
    }, [lockoutUntil])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (lockoutUntil) return

        setError('')
        setLoading(true)
        try {
            const res = await adminLogin(form.username, form.password)
            if (res.success) {
                setShowSuccess(true)
                sessionStorage.removeItem('sa_login_attempts')
                sessionStorage.removeItem('sa_login_lockout')
                setTimeout(() => nav('/dashboard', { replace: true }), 800)
            } else {
                const newAttempts = attempts + 1
                setAttempts(newAttempts)
                sessionStorage.setItem('sa_login_attempts', String(newAttempts))

                if (newAttempts >= MAX_ATTEMPTS) {
                    const until = Date.now() + LOCKOUT_DURATION
                    setLockoutUntil(until)
                    sessionStorage.setItem('sa_login_lockout', JSON.stringify({ until, attempts: newAttempts }))
                    setError(`Too many failed attempts. Account locked for 15 minutes.`)
                } else {
                    setError(res.message || 'Invalid credentials')
                }
            }
        } catch {
            setError('Connection failed — is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    const remainingAttempts = MAX_ATTEMPTS - attempts
    const isLocked = !!lockoutUntil

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
    }

    return (
        <div className="login-bg">
            {/* Animated background elements */}
            <div className="login-bg-grid" />
            <div className="login-bg-glow login-bg-glow--1" />
            <div className="login-bg-glow login-bg-glow--2" />
            <div className="login-bg-glow login-bg-glow--3" />

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 2 }}
            >
                <GlassCard className="login-card-refactored" glowColor="primary">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Header */}
                        <motion.div variants={itemVariants} className="login-header">
                            <div className="login-logo">
                                <div className="login-logo-icon">
                                    <Shield size={26} color="white" />
                                </div>
                                <div className="login-logo-pulse" />
                            </div>
                            <div className="login-header-text">
                                <div className="login-title-row">
                                    <h1 className="login-title">Super Admin</h1>
                                    <div className={`login-health-badge login-health-badge--${health}`}>
                                        <span className="login-health-dot" />
                                        {health === 'healthy' ? 'Online' : health === 'checking' ? 'Syncing' : 'Offline'}
                                    </div>
                                </div>
                                <p className="login-subtitle">High-Security Control Panel</p>
                            </div>
                        </motion.div>

                        {/* Divider */}
                        <motion.div variants={itemVariants} className="login-divider" />

                        {/* Success state */}
                        <AnimatePresence>
                            {showSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="login-success-overlay"
                                >
                                    <div className="login-success-icon">
                                        <ShieldCheck size={40} color="var(--color-success)" />
                                    </div>
                                    <p className="login-success-text">Access Granted</p>
                                    <p className="login-success-sub">Redirecting to dashboard...</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Lockout warning */}
                        <AnimatePresence>
                            {isLocked && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="login-lockout-banner"
                                >
                                    <Lock size={16} />
                                    <div>
                                        <p className="login-lockout-title">Account Temporarily Locked</p>
                                        <p className="login-lockout-desc">Try again in {lockoutCountdown}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form */}
                        {!showSuccess && (
                            <form onSubmit={handleSubmit} autoComplete="off">
                                <motion.div variants={itemVariants} className="input-group">
                                    <label className="input-label">
                                        <User size={12} />
                                        Administrator Key
                                    </label>
                                    <div className="input-wrapper">
                                        <input
                                            ref={usernameRef}
                                            type="text"
                                            placeholder="Enter username"
                                            value={form.username}
                                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                            required
                                            autoFocus
                                            disabled={isLocked}
                                            className={error && !isLocked ? 'input-error' : ''}
                                        />
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants} className="input-group">
                                    <label className="input-label">
                                        <Lock size={12} />
                                        Passphrase
                                    </label>
                                    <div className="input-wrapper input-wrapper--password">
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            placeholder="Enter password"
                                            value={form.password}
                                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                            required
                                            disabled={isLocked}
                                            className={error && !isLocked ? 'input-error' : ''}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(s => !s)}
                                            className="input-toggle-visibility"
                                            tabIndex={-1}
                                        >
                                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Error message */}
                                <AnimatePresence>
                                    {error && !isLocked && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            className="login-error"
                                        >
                                            <AlertTriangle size={14} />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Attempt indicator */}
                                {attempts > 0 && !isLocked && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="login-attempts-bar"
                                    >
                                        <div className="login-attempts-track">
                                            <motion.div
                                                className="login-attempts-fill"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
                                                transition={{ duration: 0.4 }}
                                            />
                                        </div>
                                        <span className="login-attempts-text">
                                            {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                                        </span>
                                    </motion.div>
                                )}

                                {/* Submit */}
                                <motion.div variants={itemVariants}>
                                    <StandardButton
                                        type="submit"
                                        isLoading={loading}
                                        disabled={isLocked}
                                        icon={isLocked ? Lock : Fingerprint}
                                        size="lg"
                                        style={{ width: '100%', marginTop: attempts > 0 ? 12 : 0 }}
                                    >
                                        {isLocked ? 'Locked' : 'Authenticate'}
                                    </StandardButton>
                                </motion.div>

                                {/* Footer */}
                                <motion.div variants={itemVariants} className="login-footer">
                                    <Link to="/update-credentials" className="login-footer-link">
                                        <RefreshCw size={12} />
                                        System Reset or Credential Update?
                                    </Link>
                                </motion.div>
                            </form>
                        )}
                    </motion.div>
                </GlassCard>

                {/* Bottom security notice */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="login-security-notice"
                >
                    <Lock size={11} />
                    <span>256-bit encrypted &bull; Session timeout: 30 min &bull; IP-locked</span>
                </motion.div>
            </motion.div>
        </div>
    )
}
