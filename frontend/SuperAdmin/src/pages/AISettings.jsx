import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../api';
import { motion } from 'framer-motion';
import {
  Cpu, Save, AlertCircle, CheckCircle, Loader2,
  Plus, Trash2, Edit, Eye, EyeOff, RefreshCw,
  Database, BarChart, DollarSign, Zap, Shield
} from 'lucide-react';
import { GlassCard, StandardButton, StatusBadge, HealthDot } from '../components/ui/';

const AISettings = () => {
    const [providers, setProviders] = useState([]);
    const [activeTab, setActiveTab] = useState('providers');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [showApiKey, setShowApiKey] = useState({});

    const [newProvider, setNewProvider] = useState({
        provider_type: 'google_gemini',
        provider_name: '',
        config: {
            api_key: '',
            model: 'gemini-1.5-pro',
            endpoint: '',
            organization_id: '',
            deployment_name: ''
        },
        is_active: true
    });

    const providerTypes = [
        { value: 'google_gemini', label: 'Google Gemini', icon: '🔮', description: 'Google\'s Gemini models' },
        { value: 'openai', label: 'OpenAI', icon: '🤖', description: 'GPT-3.5, GPT-4, and other OpenAI models' },
        { value: 'anthropic', label: 'Anthropic Claude', icon: '🧠', description: 'Claude models from Anthropic' },
        { value: 'azure_openai', label: 'Azure OpenAI', icon: '☁️', description: 'Azure-hosted OpenAI models' },
        { value: 'local_model', label: 'Local Model', icon: '🏠', description: 'Self-hosted models (Llama, Mistral)' },
    ];

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            setLoading(true);
            const mockProviders = [
                {
                    provider_id: 1,
                    provider_type: 'google_gemini',
                    provider_name: 'Google Gemini Pro',
                    config: { api_key: '••••••••', model: 'gemini-1.5-pro' },
                    is_active: true,
                    created_at: '2024-01-15T10:30:00Z',
                    health: { healthy: true, latency_ms: 120 }
                }
            ];
            setProviders(mockProviders);
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Failed to load providers' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProvider = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus({ type: '', message: '' });

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            setStatus({ type: 'success', message: 'Provider configuration saved successfully' });
            setNewProvider({
                provider_type: 'google_gemini',
                provider_name: '',
                config: {
                    api_key: '',
                    model: 'gemini-1.5-pro',
                    endpoint: '',
                    organization_id: '',
                    deployment_name: ''
                },
                is_active: true
            });

            fetchProviders();
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to save provider configuration' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleProvider = async (providerId, isActive) => {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            setProviders(providers.map(p =>
                p.provider_id === providerId
                    ? { ...p, is_active: !isActive }
                    : p
            ));

            setStatus({
                type: 'success',
                message: `Provider ${isActive ? 'disabled' : 'enabled'} successfully`
            });
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to update provider status' });
        }
    };

    const handleDeleteProvider = async (providerId) => {
        if (!window.confirm('Are you sure you want to delete this provider?')) return;

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            setProviders(providers.filter(p => p.provider_id !== providerId));
            setStatus({ type: 'success', message: 'Provider deleted successfully' });
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to delete provider' });
        }
    };

    const getProviderIcon = (type) => {
        const provider = providerTypes.find(p => p.value === type);
        return provider?.icon || '🔧';
    };

    const getProviderConfigFields = (type) => {
        const fields = {
            api_key: { label: 'API Key', type: 'password', required: true },
            model: { label: 'Model', type: 'text', required: true },
        };

        switch (type) {
            case 'openai':
                fields.organization_id = { label: 'Organization ID', type: 'text', required: false };
                break;
            case 'azure_openai':
                fields.endpoint = { label: 'Endpoint URL', type: 'url', required: true };
                fields.deployment_name = { label: 'Deployment Name', type: 'text', required: true };
                fields.api_version = { label: 'API Version', type: 'text', required: true, defaultValue: '2023-12-01-preview' };
                break;
            case 'anthropic':
                fields.api_version = { label: 'API Version', type: 'text', required: true, defaultValue: '2023-06-01' };
                break;
            case 'local_model':
                fields.endpoint = { label: 'Model Endpoint', type: 'url', required: true };
                fields.api_key = { label: 'API Key (Optional)', type: 'password', required: false };
                break;
        }

        return fields;
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
                    <Cpu className="text-primary" />
                    AI Provider Management
                </h1>
                <p className="page-sub">
                    Configure and manage multiple AI providers for the Vidhyam engine.
                    Supports Google Gemini, OpenAI, Anthropic Claude, Azure OpenAI, and local models.
                </p>
            </header>

            <div className="tabs" style={{ marginBottom: 'var(--space-8)' }}>
                {['providers', 'usage', 'health', 'settings'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

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

            {activeTab === 'providers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                    <GlassCard hover={false}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Database size={20} />
                                Configured Providers
                            </h2>
                            <span className="text-sm text-secondary">
                                {providers.filter(p => p.is_active).length} active
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {providers.map((provider) => (
                                <div
                                    key={provider.provider_id}
                                    className="flex items-center justify-between"
                                    style={{
                                        padding: 'var(--space-4)',
                                        borderRadius: 'var(--radius-xl)',
                                        transition: 'all var(--duration-fast) var(--ease-out)',
                                        background: provider.is_active
                                            ? 'color-mix(in srgb, var(--color-success) 5%, transparent)'
                                            : 'var(--surface-layer2)',
                                        borderColor: provider.is_active
                                            ? 'color-mix(in srgb, var(--color-success) 20%, transparent)'
                                            : 'var(--border-subtle)',
                                        border: '1px solid',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span style={{ fontSize: '1.5rem' }}>{getProviderIcon(provider.provider_type)}</span>
                                        <div>
                                            <h3 style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                                {provider.provider_name}
                                                <span
                                                    className="text-xs"
                                                    style={{
                                                        marginLeft: 'var(--space-2)',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        background: 'var(--surface-layer3)',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {provider.provider_type}
                                                </span>
                                            </h3>
                                            <p className="text-sm text-secondary">
                                                Created {new Date(provider.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <StatusBadge
                                            status={provider.health?.healthy ? 'active' : 'blocked'}
                                            label={provider.health?.healthy ? 'Healthy' : 'Unhealthy'}
                                        />

                                        <button
                                            onClick={() => handleToggleProvider(provider.provider_id, provider.is_active)}
                                            className={`btn btn-xs ${provider.is_active ? 'btn-outline' : 'btn-secondary'}`}
                                            style={provider.is_active ? {
                                                background: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
                                                color: 'color-mix(in srgb, var(--color-warning) 80%, white)',
                                                borderColor: 'color-mix(in srgb, var(--color-warning) 25%, transparent)',
                                            } : undefined}
                                        >
                                            {provider.is_active ? 'Disable' : 'Enable'}
                                        </button>

                                        <button
                                            onClick={() => handleDeleteProvider(provider.provider_id)}
                                            className="btn btn-ghost btn-icon btn-xs"
                                            style={{ color: 'var(--text-secondary)' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = 'color-mix(in srgb, var(--color-danger) 70%, white)';
                                                e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 10%, transparent)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {provider.is_active && provider.health && (
                                        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', width: '100%' }}>
                                            <div className="flex items-center gap-4 text-sm text-secondary">
                                                <span>
                                                    <Zap size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                    Latency: {provider.health.latency_ms}ms
                                                </span>
                                                <span>
                                                    <DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                    Cost: $0.0001/token
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {providers.length === 0 && (
                                <div className="text-center text-tertiary" style={{ padding: 'var(--space-8)' }}>
                                    <Database size={32} style={{ margin: '0 auto var(--space-3)', opacity: 0.5, display: 'block' }} />
                                    <p>No providers configured yet</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard hover={false}>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                            <Plus size={20} />
                            Add New Provider
                        </h2>

                        <form onSubmit={handleSaveProvider} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="form-group">
                                    <label className="form-label">
                                        Provider Type
                                    </label>
                                    <select
                                        value={newProvider.provider_type}
                                        onChange={(e) => setNewProvider({
                                            ...newProvider,
                                            provider_type: e.target.value,
                                            provider_name: providerTypes.find(p => p.value === e.target.value)?.label || ''
                                        })}
                                        className="form-select"
                                    >
                                        {providerTypes.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.icon} {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="form-hint">
                                        {providerTypes.find(p => p.value === newProvider.provider_type)?.description}
                                    </p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Provider Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newProvider.provider_name}
                                        onChange={(e) => setNewProvider({...newProvider, provider_name: e.target.value})}
                                        className="form-input"
                                        placeholder="e.g., Google Gemini Pro"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <h3 className="text-lg" style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>Configuration</h3>

                                {Object.entries(getProviderConfigFields(newProvider.provider_type)).map(([key, field]) => (
                                    <div key={key} className="form-group">
                                        <label className="form-label">
                                            {field.label}
                                            {field.required && <span className="text-danger" style={{ marginLeft: 4 }}>*</span>}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={field.type === 'password' && !showApiKey[key] ? 'password' : 'text'}
                                                value={newProvider.config[key] || ''}
                                                onChange={(e) => setNewProvider({
                                                    ...newProvider,
                                                    config: { ...newProvider.config, [key]: e.target.value }
                                                })}
                                                className="form-input mono"
                                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                required={field.required}
                                            />
                                            {field.type === 'password' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey({...showApiKey, [key]: !showApiKey[key]})}
                                                    className="btn btn-ghost btn-icon btn-xs"
                                                    style={{ position: 'absolute', right: 8, top: 8, color: 'var(--text-secondary)' }}
                                                >
                                                    {showApiKey[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between" style={{ paddingTop: 'var(--space-4)' }}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={newProvider.is_active}
                                        onChange={(e) => setNewProvider({...newProvider, is_active: e.target.checked})}
                                        style={{ accentColor: 'var(--color-primary)' }}
                                    />
                                    <label htmlFor="is_active" className="text-sm text-secondary">
                                        Activate provider immediately
                                    </label>
                                </div>

                                <StandardButton
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    isLoading={saving}
                                    disabled={saving}
                                    icon={Save}
                                >
                                    {saving ? 'Saving Provider...' : 'Add Provider'}
                                </StandardButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}

            {activeTab === 'usage' && (
                <GlassCard hover={false}>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                        <BarChart size={20} />
                        Usage Analytics
                    </h2>

                    <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="stat-card primary">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-secondary">Total Requests</p>
                                    <p className="text-2xl font-bold" style={{ marginTop: 4, color: 'var(--text-primary)' }}>1,247</p>
                                </div>
                                <Database className="text-primary" size={24} />
                            </div>
                            <p className="text-xs text-tertiary" style={{ marginTop: 'var(--space-2)' }}>+12% from last month</p>
                        </div>

                        <div className="stat-card warning">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-secondary">Total Tokens</p>
                                    <p className="text-2xl font-bold" style={{ marginTop: 4, color: 'var(--text-primary)' }}>2.5M</p>
                                </div>
                                <Zap className="text-warning" size={24} />
                            </div>
                            <p className="text-xs text-tertiary" style={{ marginTop: 'var(--space-2)' }}>+8% from last month</p>
                        </div>

                        <div className="stat-card success">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-secondary">Total Cost</p>
                                    <p className="text-2xl font-bold" style={{ marginTop: 4, color: 'var(--text-primary)' }}>$124.50</p>
                                </div>
                                <DollarSign className="text-success" size={24} />
                            </div>
                            <p className="text-xs text-tertiary" style={{ marginTop: 'var(--space-2)' }}>+15% from last month</p>
                        </div>
                    </div>

                    <div className="text-center text-tertiary" style={{ padding: 'var(--space-8)' }}>
                        <BarChart size={48} style={{ margin: '0 auto var(--space-3)', opacity: 0.3, display: 'block' }} />
                        <p>Usage analytics dashboard will be available soon</p>
                        <p className="text-sm" style={{ marginTop: 4 }}>Real-time tracking of provider usage and costs</p>
                    </div>
                </GlassCard>
            )}

            {activeTab === 'health' && (
                <GlassCard hover={false}>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                        <Shield size={20} />
                        Health Monitoring
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {providers.map((provider) => (
                            <div
                                key={provider.provider_id}
                                style={{
                                    padding: 'var(--space-4)',
                                    borderRadius: 'var(--radius-xl)',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--surface-layer2)',
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <HealthDot status={provider.health?.healthy ? 'healthy' : 'critical'} size={12} />
                                        <div>
                                            <h3 style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{provider.provider_name}</h3>
                                            <p className="text-sm text-secondary">{provider.provider_type}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div style={{ textAlign: 'right' }}>
                                            <p className="text-sm text-secondary">Latency</p>
                                            <p style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{provider.health?.latency_ms || 0}ms</p>
                                        </div>
                                        <button className="btn btn-ghost btn-icon btn-xs">
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 text-sm" style={{ marginTop: 'var(--space-4)' }}>
                                    <div>
                                        <p className="text-secondary">Uptime</p>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>99.8%</p>
                                    </div>
                                    <div>
                                        <p className="text-secondary">Error Rate</p>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>0.2%</p>
                                    </div>
                                    <div>
                                        <p className="text-secondary">Last Check</p>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>2 min ago</p>
                                    </div>
                                    <div>
                                        <p className="text-secondary">Response Time</p>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>P95: 450ms</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {activeTab === 'settings' && (
                <GlassCard hover={false}>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                        <Cpu size={20} />
                        Global AI Settings
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                        <div className="form-group">
                            <label className="form-label">
                                Default Routing Strategy
                            </label>
                            <select className="form-select">
                                <option value="cost">Cost Optimized</option>
                                <option value="performance">Performance Optimized</option>
                                <option value="reliability">Reliability Optimized</option>
                                <option value="load_balanced">Load Balanced</option>
                            </select>
                            <p className="form-hint">
                                Determines how AI requests are routed between providers
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Maximum Monthly Cost per School
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 12, top: 9, color: 'var(--text-secondary)' }}>$</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ paddingLeft: 28 }}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <p className="form-hint">
                                Set a monthly spending limit for each school (0 = unlimited)
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="auto_fallback"
                                style={{ accentColor: 'var(--color-primary)' }}
                                defaultChecked
                            />
                            <label htmlFor="auto_fallback" className="text-sm text-secondary">
                                Enable automatic fallback to backup providers
                            </label>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="usage_tracking"
                                style={{ accentColor: 'var(--color-primary)' }}
                                defaultChecked
                            />
                            <label htmlFor="usage_tracking" className="text-sm text-secondary">
                                Enable detailed usage tracking and analytics
                            </label>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="cost_alerts"
                                style={{ accentColor: 'var(--color-primary)' }}
                                defaultChecked
                            />
                            <label htmlFor="cost_alerts" className="text-sm text-secondary">
                                Send email alerts when costs exceed thresholds
                            </label>
                        </div>

                        <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
                            <StandardButton variant="primary" size="lg" icon={Save}>
                                Save Global Settings
                            </StandardButton>
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="grid grid-cols-3 gap-6" style={{ marginTop: 'var(--space-8)' }}>
                <GlassCard hover={false}>
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
                        <Shield size={16} />
                        Security & Encryption
                    </h3>
                    <p className="text-sm text-secondary">
                        All API keys are encrypted at rest using AES-256. Keys are never logged or exposed in client-side code.
                    </p>
                </GlassCard>

                <GlassCard hover={false}>
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
                        <Zap size={16} />
                        Performance
                    </h3>
                    <p className="text-sm text-secondary">
                        Intelligent routing selects the fastest available provider. Automatic failover ensures 99.9% uptime.
                    </p>
                </GlassCard>

                <GlassCard hover={false}>
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
                        <DollarSign size={16} />
                        Cost Optimization
                    </h3>
                    <p className="text-sm text-secondary">
                        Real-time cost tracking and automatic provider selection based on your budget and performance requirements.
                    </p>
                </GlassCard>
            </div>
        </div>
    );
};

export default AISettings;
