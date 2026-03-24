import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, User, Lock, ArrowLeft, AlertCircle } from 'lucide-react'
import { updateAdminCredentials } from '../api'

export default function UpdateCredentials() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    
    const [form, setForm] = useState({
        currentUsername: '',
        currentPassword: '',
        newUsername: '',
        newPassword: '',
        confirmPassword: ''
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')

        if (form.newPassword !== form.confirmPassword) {
            return setError('New passwords do not match')
        }

        setLoading(true)
        try {
            const data = await updateAdminCredentials({
                currentUsername: form.currentUsername,
                currentPassword: form.currentPassword,
                newUsername: form.newUsername,
                newPassword: form.newPassword
            })

            if (data.success) {
                setMessage('Credentials updated successfully. Redirecting to login...')
                setTimeout(() => navigate('/login'), 2000)
            } else {
                setError(data.message || 'Failed to update credentials')
            }
        } catch (err) {
            setError('Connection error. Is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-bg">
            <div className="login-card" style={{ maxWidth: '450px', margin: '60px auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={22} color="white" />
                    </div>
                    <div>
                        <h1>Update Admin Credentials</h1>
                        <p>Verify current identity to set new credentials</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171', marginBottom: 14 }}>
                            {error}
                        </div>
                    )}
                    {message && (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#10b981', marginBottom: 14 }}>
                            {message}
                        </div>
                    )}

                    <div style={{ marginBottom: 20, borderBottom: '1px solid var(--glass-border)', paddingBottom: 10 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            CURRENT AUTHORIZATION
                        </span>
                    </div>

                    <div className="input-group">
                        <label>Current Username</label>
                        <input
                            type="text"
                            placeholder="superadmin"
                            required
                            value={form.currentUsername}
                            onChange={e => setForm({ ...form, currentUsername: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            required
                            value={form.currentPassword}
                            onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                        />
                    </div>
                    
                    <div style={{ margin: '24px 0 20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: 10 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            NEW CREDENTIALS
                        </span>
                    </div>

                    <div className="input-group">
                        <label>New Username</label>
                        <input
                            type="text"
                            placeholder="Enter new username"
                            required
                            value={form.newUsername}
                            onChange={e => setForm({ ...form, newUsername: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            required
                            value={form.newPassword}
                            onChange={e => setForm({ ...form, newPassword: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            required
                            value={form.confirmPassword}
                            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                        {loading ? 'Updating...' : 'Update Credentials'}
                    </button>

                    <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, color: 'var(--text3)', fontSize: '0.9rem', textDecoration: 'none' }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </form>
            </div>
        </div>
    )
}
