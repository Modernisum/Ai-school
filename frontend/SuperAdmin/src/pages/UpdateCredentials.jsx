import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, User, Lock, ArrowLeft, AlertCircle, Upload, X, Loader } from 'lucide-react'
import { updateAdminCredentials, getAdminProfile, uploadFile, deleteFileByUrl } from '../api'

export default function UpdateCredentials() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [profLoading, setProfLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [localProfilePreview, setLocalProfilePreview] = useState('')
    const [pendingProfileFile, setPendingProfileFile] = useState(null)
    
    const [form, setForm] = useState({
        currentUsername: '',
        currentPassword: '',
        newUsername: '',
        newPassword: '',
        confirmPassword: '',
        profileImageUrl: ''
    })

    useEffect(() => {
        getAdminProfile().then(res => {
            if (res.success && res.data) {
                setForm(f => ({ 
                    ...f, 
                    currentUsername: res.data.username || '',
                    newUsername: res.data.username || '',
                    profileImageUrl: res.data.profileImageUrl || '' 
                }))
            }
        }).catch(console.error)
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')

        if (form.newPassword !== form.confirmPassword) {
            return setError('New passwords do not match')
        }
        
        try {
            let finalProfileUrl = form.profileImageUrl;

            // Upload pending profile if exists
            if (pendingProfileFile) {
                setProfLoading(true);
                const uploadRes = await uploadFile(pendingProfileFile);
                if (uploadRes.success) {
                    finalProfileUrl = uploadRes.url;
                } else {
                    setError(uploadRes.message || 'Profile upload failed');
                    setLoading(false);
                    setProfLoading(false);
                    return;
                }
                setProfLoading(false);
            }

            const data = await updateAdminCredentials({
                currentUsername: form.currentUsername,
                currentPassword: form.currentPassword,
                newUsername: form.newUsername,
                newPassword: form.newPassword,
                profileImageUrl: finalProfileUrl
            })
            if (data.success) {
                setMessage('Credentials updated successfully')
                setPendingProfileFile(null)
                setLocalProfilePreview('')
                setForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '', profileImageUrl: finalProfileUrl }))
            } else {
                setError(data.message || 'Update failed')
            }
        } catch (err) {
            setError('An error occurred during update')
        } finally {
            setLoading(false)
            setProfLoading(false)
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
                            ADMIN PROFILE
                        </span>
                    </div>

                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                        <div style={{ position: 'relative', width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-30)', background: 'var(--bg3)' }}>
                            {(localProfilePreview || form.profileImageUrl) ? (
                                <>
                                    <img src={localProfilePreview || form.profileImageUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button 
                                        type="button" 
                                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', padding: 4, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                                        onClick={() => {
                                            // Only delete from server if it was already a server URL
                                            if (form.profileImageUrl && !localProfilePreview) {
                                                deleteFileByUrl(form.profileImageUrl);
                                            }
                                            setForm(f => ({ ...f, profileImageUrl: '' }));
                                            setLocalProfilePreview('');
                                            setPendingProfileFile(null);
                                        }}
                                        disabled={profLoading}
                                    >
                                        <X size={12} />
                                    </button>
                                </>
                            ) : (
                                <label style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: profLoading ? 'default' : 'pointer', color: 'var(--text3)' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        hidden 
                                        disabled={profLoading}
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            // Immediate local preview only
                                            const localUrl = URL.createObjectURL(file);
                                            setLocalProfilePreview(localUrl);
                                            setPendingProfileFile(file);
                                        }}
                                    />
                                    {profLoading ? (
                                        <Loader size={24} className="spin" style={{ color: 'var(--accent)' }} />
                                    ) : (
                                        <>
                                            <Upload size={24} />
                                            <span style={{ fontSize: 10, fontWeight: 700, marginTop: 4 }}>UPLOAD</span>
                                        </>
                                    )}
                                    {profLoading && <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, background: 'var(--accent)', width: '100%', animation: 'shimmer 2s infinite linear' }} />}
                                </label>
                            )}
                        </div>
                    </div>

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
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            `}</style>
        </div>
    )
}
