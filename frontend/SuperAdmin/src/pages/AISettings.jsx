import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../api';
import { motion } from 'framer-motion';
import { Cpu, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const AISettings = () => {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await getConfig('GEMINI_API_KEY');
            if (res.success) {
                setApiKey(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus({ type: '', message: '' });
        try {
            const res = await updateConfig('GEMINI_API_KEY', apiKey);
            if (res.success) {
                setStatus({ type: 'success', message: 'Gemini API Key updated successfully' });
            } else {
                setStatus({ type: 'error', message: res.message || 'Failed to update API Key' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Network error occurred' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Cpu className="text-indigo-400" />
                    AI Configuration
                </h1>
                <p className="text-slate-400 mt-2">Manage global AI parameters and API keys for the Vidhyam engine.</p>
            </header>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Gemini Pro API Key
                        </label>
                        <div className="relative">
                            <input 
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                placeholder="Enter your Gemini API Key..."
                            />
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            This key is used for task generation, OCR processing, and student assistance. 
                            Never share this key with anyone.
                        </p>
                    </div>

                    {status.message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 ${
                            status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            <span className="text-sm font-medium">{status.message}</span>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
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
                            {saving ? 'Saving Changes...' : 'Update API Key'}
                        </button>
                    </div>
                </form>
            </motion.div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="text-white font-semibold mb-2">Security Note</h3>
                    <p className="text-sm text-slate-400">
                        API keys are stored encrypted in the primary system configuration table. 
                        Changing the key affects all schools immediately.
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <h3 className="text-white font-semibold mb-2">Engine Compatibility</h3>
                    <p className="text-sm text-slate-400">
                        Currently supports Gemini 1.5 Pro and Flash. Ensure your key has 
                        sufficient quota for peak usage times.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AISettings;
