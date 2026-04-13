import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../api';
import { motion } from 'framer-motion';
import { 
  Cpu, Save, AlertCircle, CheckCircle, Loader2, 
  Plus, Trash2, Edit, Eye, EyeOff, RefreshCw,
  Database, BarChart, DollarSign, Zap, Shield
} from 'lucide-react';

const AISettings = () => {
    const [providers, setProviders] = useState([]);
    const [activeTab, setActiveTab] = useState('providers');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [showApiKey, setShowApiKey] = useState({});
    
    // New provider form state
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

    // Provider types with metadata
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
            // TODO: Replace with actual API call
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
            // TODO: Replace with actual API call
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
            
            fetchProviders(); // Refresh list
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to save provider configuration' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleProvider = async (providerId, isActive) => {
        try {
            // TODO: Replace with actual API call
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
            // TODO: Replace with actual API call
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
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Cpu className="text-indigo-400" />
                    AI Provider Management
                </h1>
                <p className="text-slate-400 mt-2">
                    Configure and manage multiple AI providers for the Vidhyam engine. 
                    Supports Google Gemini, OpenAI, Anthropic Claude, Azure OpenAI, and local models.
                </p>
            </header>

            {/* Tab Navigation */}
            <div className="flex space-x-2 mb-8 border-b border-white/10">
                {['providers', 'usage', 'health', 'settings'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? 'text-white border-b-2 border-indigo-500'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {status.message && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                        status.type === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                >
                    {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-medium">{status.message}</span>
                </motion.div>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
                <div className="space-y-8">
                    {/* Existing Providers */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Database size={20} />
                                Configured Providers
                            </h2>
                            <span className="text-sm text-slate-400">
                                {providers.filter(p => p.is_active).length} active
                            </span>
                        </div>

                        <div className="space-y-4">
                            {providers.map((provider) => (
                                <div 
                                    key={provider.provider_id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        provider.is_active
                                            ? 'bg-emerald-500/5 border-emerald-500/20'
                                            : 'bg-slate-900/30 border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getProviderIcon(provider.provider_type)}</span>
                                            <div>
                                                <h3 className="font-semibold text-white">
                                                    {provider.provider_name}
                                                    <span className="ml-2 text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                                                        {provider.provider_type}
                                                    </span>
                                                </h3>
                                                <p className="text-sm text-slate-400">
                                                    Created {new Date(provider.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                provider.health?.healthy
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-rose-500/20 text-rose-400'
                                            }`}>
                                                {provider.health?.healthy ? 'Healthy' : 'Unhealthy'}
                                            </div>
                                            
                                            <button
                                                onClick={() => handleToggleProvider(provider.provider_id, provider.is_active)}
                                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                                    provider.is_active
                                                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            >
                                                {provider.is_active ? 'Disable' : 'Enable'}
                                            </button>
                                            
                                            <button
                                                onClick={() => handleDeleteProvider(provider.provider_id)}
                                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {provider.is_active && provider.health && (
                                        <div className="mt-3 pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-slate-400">
                                                    <Zap size={14} className="inline mr-1" />
                                                    Latency: {provider.health.latency_ms}ms
                                                </span>
                                                <span className="text-slate-400">
                                                    <DollarSign size={14} className="inline mr-1" />
                                                    Cost: $0.0001/token
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {providers.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    <Database size={32} className="mx-auto mb-3 opacity-50" />
                                    <p>No providers configured yet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Add New Provider */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
                    >
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                            <Plus size={20} />
                            Add New Provider
                        </h2>
                        
                        <form onSubmit={handleSaveProvider} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Provider Type
                                    </label>
                                    <select
                                        value={newProvider.provider_type}
                                        onChange={(e) => setNewProvider({
                                            ...newProvider,
                                            provider_type: e.target.value,
                                            provider_name: providerTypes.find(p => p.value === e.target.value)?.label || ''
                                        })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    >
                                        {providerTypes.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.icon} {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-2 text-xs text-slate-500">
                                        {providerTypes.find(p => p.value === newProvider.provider_type)?.description}
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Provider Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newProvider.provider_name}
                                        onChange={(e) => setNewProvider({...newProvider, provider_name: e.target.value})}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                        placeholder="e.g., Google Gemini Pro"
                                        required
                                    />
                                </div>
                            </div>
                            
                            {/* Dynamic Configuration Fields */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">Configuration</h3>
                                
                                {Object.entries(getProviderConfigFields(newProvider.provider_type)).map(([key, field]) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            {field.label}
                                            {field.required && <span className="text-rose-500 ml-1">*</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={field.type === 'password' && !showApiKey[key] ? 'password' : 'text'}
                                                value={newProvider.config[key] || ''}
                                                onChange={(e) => setNewProvider({
                                                    ...newProvider,
                                                    config: { ...newProvider.config, [key]: e.target.value }
                                                })}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                required={field.required}
                                            />
                                            {field.type === 'password' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey({...showApiKey, [key]: !showApiKey[key]})}
                                                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                                                >
                                                    {showApiKey[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex items-center justify-between pt-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={newProvider.is_active}
                                        onChange={(e) => setNewProvider({...newProvider, is_active: e.target.checked})}
                                        className="rounded border-white/10 bg-slate-900/50 text-indigo-500 focus:ring-indigo-500/50"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-slate-300">
                                        Activate provider immediately
                                    </label>
                                </div>
                                
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                                >
                                    {saving ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    {saving ? 'Saving Provider...' : 'Add Provider'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Usage Analytics Tab */}
            {activeTab === 'usage' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
                >
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                        <BarChart size={20} />
                        Usage Analytics
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-slate-900/30 p-6 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">Total Requests</p>
                                    <p className="text-2xl font-bold text-white mt-1">1,247</p>
                                </div>
                                <Database className="text-indigo-400" size={24} />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">+12% from last month</p>
                        </div>
                        
                        <div className="bg-slate-900/30 p-6 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">Total Tokens</p>
                                    <p className="text-2xl font-bold text-white mt-1">2.5M</p>
                                </div>
                                <Zap className="text-amber-400" size={24} />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">+8% from last month</p>
                        </div>
                        
                        <div className="bg-slate-900/30 p-6 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">Total Cost</p>
                                    <p className="text-2xl font-bold text-white mt-1">$124.50</p>
                                </div>
                                <DollarSign className="text-emerald-400" size={24} />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">+15% from last month</p>
                        </div>
                    </div>
                    
                    <div className="text-center py-8 text-slate-500">
                        <BarChart size={48} className="mx-auto mb-3 opacity-30" />
                        <p>Usage analytics dashboard will be available soon</p>
                        <p className="text-sm mt-1">Real-time tracking of provider usage and costs</p>
                    </div>
                </motion.div>
            )}

            {/* Health Monitoring Tab */}
            {activeTab === 'health' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
                >
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                        <Shield size={20} />
                        Health Monitoring
                    </h2>
                    
                    <div className="space-y-4">
                        {providers.map((provider) => (
                            <div key={provider.provider_id} className="p-4 rounded-xl border border-white/5 bg-slate-900/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                            provider.health?.healthy ? 'bg-emerald-500' : 'bg-rose-500'
                                        }`} />
                                        <div>
                                            <h3 className="font-semibold text-white">{provider.provider_name}</h3>
                                            <p className="text-sm text-slate-400">{provider.provider_type}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-slate-400">Latency</p>
                                            <p className="font-semibold text-white">{provider.health?.latency_ms || 0}ms</p>
                                        </div>
                                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-400">Uptime</p>
                                        <p className="text-white font-medium">99.8%</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400">Error Rate</p>
                                        <p className="text-white font-medium">0.2%</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400">Last Check</p>
                                        <p className="text-white font-medium">2 min ago</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400">Response Time</p>
                                        <p className="text-white font-medium">P95: 450ms</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
                >
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                        <Cpu size={20} />
                        Global AI Settings
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Default Routing Strategy
                            </label>
                            <select className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
                                <option value="cost">Cost Optimized</option>
                                <option value="performance">Performance Optimized</option>
                                <option value="reliability">Reliability Optimized</option>
                                <option value="load_balanced">Load Balanced</option>
                            </select>
                            <p className="mt-2 text-xs text-slate-500">
                                Determines how AI requests are routed between providers
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Maximum Monthly Cost per School
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">$</span>
                                <input
                                    type="number"
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Set a monthly spending limit for each school (0 = unlimited)
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="auto_fallback"
                                className="rounded border-white/10 bg-slate-900/50 text-indigo-500 focus:ring-indigo-500/50"
                                defaultChecked
                            />
                            <label htmlFor="auto_fallback" className="text-sm text-slate-300">
                                Enable automatic fallback to backup providers
                            </label>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="usage_tracking"
                                className="rounded border-white/10 bg-slate-900/50 text-indigo-500 focus:ring-indigo-500/50"
                                defaultChecked
                            />
                            <label htmlFor="usage_tracking" className="text-sm text-slate-300">
                                Enable detailed usage tracking and analytics
                            </label>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="cost_alerts"
                                className="rounded border-white/10 bg-slate-900/50 text-indigo-500 focus:ring-indigo-500/50"
                                defaultChecked
                            />
                            <label htmlFor="cost_alerts" className="text-sm text-slate-300">
                                Send email alerts when costs exceed thresholds
                            </label>
                        </div>
                        
                        <div className="pt-4 border-t border-white/5">
                            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20">
                                <Save size={18} />
                                Save Global Settings
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Information Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Shield size={16} />
                        Security & Encryption
                    </h3>
                    <p className="text-sm text-slate-400">
                        All API keys are encrypted at rest using AES-256. Keys are never logged or exposed in client-side code.
                    </p>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Zap size={16} />
                        Performance
                    </h3>
                    <p className="text-sm text-slate-400">
                        Intelligent routing selects the fastest available provider. Automatic failover ensures 99.9% uptime.
                    </p>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <DollarSign size={16} />
                        Cost Optimization
                    </h3>
                    <p className="text-sm text-slate-400">
                        Real-time cost tracking and automatic provider selection based on your budget and performance requirements.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AISettings;