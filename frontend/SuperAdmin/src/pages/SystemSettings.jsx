import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../api';
import { motion } from 'framer-motion';
import { Settings, Save, AlertCircle, CheckCircle, Loader2, Mail, MessageSquare, Cpu } from 'lucide-react';
import { GlassCard, StandardButton } from '../components/ui/';

const SystemSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const [keys, setKeys] = useState({
        GEMINI_API_KEY: '',
        EMAIL_API_KEY: '',
        SMS_API_KEY: ''
    });

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const geminiRes = await getConfig('GEMINI_API_KEY');
            const emailRes = await getConfig('EMAIL_API_KEY');
            const smsRes = await getConfig('SMS_API_KEY');

            setKeys({
                GEMINI_API_KEY: geminiRes.success && geminiRes.data ? geminiRes.data : '',
                EMAIL_API_KEY: emailRes.success && emailRes.data ? emailRes.data : '',
                SMS_API_KEY: smsRes.success && smsRes.data ? smsRes.data : ''
            });
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Failed to load configuration' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus({ type: '', message: '' });

        try {
            await updateConfig('GEMINI_API_KEY', keys.GEMINI_API_KEY);
            await updateConfig('EMAIL_API_KEY', keys.EMAIL_API_KEY);
            await updateConfig('SMS_API_KEY', keys.SMS_API_KEY);

            setStatus({ type: 'success', message: 'API Keys saved successfully' });
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Failed to save configuration' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        setKeys({ ...keys, [e.target.name]: e.target.value });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin text-primary" style={{ width: 32, height: 32 }} />
            </div>
        );
    }

    return (
        <div className="page">
            <header className="page-header" style={{ marginBottom: 'var(--space-10)' }}>
                <h1 className="page-title flex items-center gap-3">
                    <Settings className="text-primary" />
                    Global API Configurations
                </h1>
                <p className="page-sub">
                    Manage the global API keys for Email, SMS, and AI Providers. These keys will be used system-wide by the AI Agent and background tasks.
                </p>
            </header>

            {status.message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3"
                    style={{
                        marginBottom: 'var(--space-6)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-xl)',
                        background: status.type === 'success'
                            ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
                            : 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                        color: status.type === 'success'
                            ? 'color-mix(in srgb, var(--color-success) 80%, white)'
                            : 'color-mix(in srgb, var(--color-danger) 70%, white)',
                        border: status.type === 'success'
                            ? '1px solid color-mix(in srgb, var(--color-success) 20%, transparent)'
                            : '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)',
                    }}
                >
                    {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm" style={{ fontWeight: 'var(--font-medium)' }}>{status.message}</span>
                </motion.div>
            )}

            <GlassCard hover={false}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    
                    <div className="form-group">
                        <label className="form-label flex items-center gap-2">
                            <Cpu size={16} /> Gemini AI API Key
                        </label>
                        <input
                            type="password"
                            name="GEMINI_API_KEY"
                            value={keys.GEMINI_API_KEY}
                            onChange={handleChange}
                            className="form-input mono"
                            placeholder="AIzaSy..."
                        />
                        <p className="form-hint">Used for primary NLP and embedding generation in Vidhyam AI.</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label flex items-center gap-2">
                            <Mail size={16} /> SendGrid Email API Key
                        </label>
                        <input
                            type="password"
                            name="EMAIL_API_KEY"
                            value={keys.EMAIL_API_KEY}
                            onChange={handleChange}
                            className="form-input mono"
                            placeholder="SG...."
                        />
                        <p className="form-hint">Provides email dispatch capabilities for the AI Agent.</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label flex items-center gap-2">
                            <MessageSquare size={16} /> Twilio SMS API Key
                        </label>
                        <input
                            type="password"
                            name="SMS_API_KEY"
                            value={keys.SMS_API_KEY}
                            onChange={handleChange}
                            className="form-input mono"
                            placeholder="ACCOUNT_SID:AUTH_TOKEN:FROM_PHONE"
                        />
                        <p className="form-hint">Format must be ACCOUNT_SID:AUTH_TOKEN:FROM_PHONE for Twilio.</p>
                    </div>

                    <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
                        <StandardButton type="submit" variant="primary" size="lg" icon={Save} isLoading={saving}>
                            {saving ? 'Saving Configurations...' : 'Save All Keys'}
                        </StandardButton>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};

export default SystemSettings;
