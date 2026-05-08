import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, User, Lock, ArrowLeft, AlertCircle, Upload, X, Loader } from 'lucide-react'
import { updateAdminCredentials, getAdminProfile, uploadFile, deleteFileByUrl } from '../api'
import GlassCard from '../components/ui/GlassCard.jsx'
import StandardButton from '../components/ui/StandardButton.jsx'

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
            <GlassCard className="login-card-refactored" style={{ maxWidth: 450, margin: '60px auto' }}>
                <div className="login-header">
                    <div className="login-logo">
                        <div className="login-logo-icon">
                            <Shield size={22} color="white" />
                        </div>
                    </div>
                    <div className="login-header-text">
                        <h1 className="login-title">Update Credentials</h1>
                        <p className="login-subtitle">Verify current identity to set new credentials</p>
                    </div>
                </div>

                <div className="login-divider" />

                <form onSubmit={handleSubmit}>
                    {error && <div className="alert-inline alert-inline-danger mb-4">{error}</div>}
                    {message && <div className="alert-inline alert-inline-success mb-4">{message}</div>}

                    <div className="form-group" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: 10, marginBottom: 20 }}>
                        <span className="text-xs font-bold uppercase letter-spaced text-tertiary">ADMIN PROFILE</span>
                    </div>

                    <div className="input-group flex flex-col items-center mb-4">
                        <div style={{ position: 'relative', width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--border-default)', background: 'var(--surface-layer3)' }}>
                            {(localProfilePreview || form.profileImageUrl) ? (
                                <>
                                    <img src={localProfilePreview || form.profileImageUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button 
                                        type="button" 
                                        className="icon-btn"
                                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: 4, backdropFilter: 'blur(4px)' }}
                                        onClick={() => {
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
                                <label className="flex flex-col items-center justify-center" style={{ width: '100%', height: '100%', cursor: profLoading ? 'default' : 'pointer', color: 'var(--text-tertiary)' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        hidden 
                                        disabled={profLoading}
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const localUrl = URL.createObjectURL(file);
                                            setLocalProfilePreview(localUrl);
                                            setPendingProfileFile(file);
                                        }}
                                    />
                                    {profLoading ? (
                                        <div className="spinner" style={{ width: 24, height: 24 }} />
                                    ) : (
                                        <>
                                            <Upload size={24} />
                                            <span className="text-xs font-bold" style={{ marginTop: 4 }}>UPLOAD</span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: 10, marginBottom: 20 }}>
                        <span className="text-xs font-bold uppercase letter-spaced text-tertiary">CURRENT AUTHORIZATION</span>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Current Username</label>
                        <div className="input-wrapper">
                            <input type="text" placeholder="superadmin" required value={form.currentUsername} onChange={e => setForm({ ...form, currentUsername: e.target.value })} className="form-input" />
                        </div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Current Password</label>
                        <div className="input-wrapper">
                            <input type="password" placeholder="••••••••" required value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} className="form-input" />
                        </div>
                    </div>
                    
                    <div style={{ margin: '24px 0 20px', borderBottom: '1px solid var(--border-default)', paddingBottom: 10 }}>
                        <span className="text-xs font-bold uppercase letter-spaced text-tertiary">NEW CREDENTIALS</span>
                    </div>

                    <div className="input-group">
                        <label className="input-label">New Username</label>
                        <div className="input-wrapper">
                            <input type="text" placeholder="Enter new username" required value={form.newUsername} onChange={e => setForm({ ...form, newUsername: e.target.value })} className="form-input" />
                        </div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">New Password</label>
                        <div className="input-wrapper">
                            <input type="password" placeholder="Enter new password" required value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} className="form-input" />
                        </div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Confirm New Password</label>
                        <div className="input-wrapper">
                            <input type="password" placeholder="Confirm new password" required value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className="form-input" />
                        </div>
                    </div>

                    <StandardButton type="submit" isLoading={loading} className="w-full mt-4" style={{ width: '100%' }}>
                        Update Credentials
                    </StandardButton>

                    <Link to="/login" className="login-footer-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </form>
            </GlassCard>
        </div>
    )
}
