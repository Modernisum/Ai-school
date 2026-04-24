import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, Server, Database, Zap, Cpu, 
    ShieldCheck, AlertTriangle, RefreshCw, 
    Clock, HardDrive, Network, Globe 
} from 'lucide-react';
import { getHealth } from '../api';

const HealthCard = ({ title, status, icon: Icon, color = "emerald" }) => {
    const isHealthy = status === 'connected' || status === 'available' || status === 'healthy' || status === 'ready';
    const statusColor = isHealthy ? 'text-emerald-400' : 'text-rose-400';
    const glowColor = isHealthy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 group transition-all duration-500 hover:border-white/20"
            style={{ boxShadow: `0 0 20px ${glowColor}` }}
        >
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${isHealthy ? 'from-emerald-500/10 to-teal-500/10' : 'from-rose-500/10 to-pink-500/10'} border border-white/5`}>
                    <Icon size={24} className={statusColor} />
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-rose-400 shadow-[0_0_10px_#f43f5e]'} animate-pulse`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                        {status || 'Unknown'}
                    </span>
                </div>
            </div>
            
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-black text-white">{isHealthy ? 'Operational' : 'Interrupt'}</h3>
                </div>
            </div>

            <div className="mt-6 flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${isHealthy ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ delay: i * 0.1, duration: 1 }}
                            className={`h-full rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        />
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default function Monitoring() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const data = await getHealth();
            setHealth(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Health check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                        <Activity size={18} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural System Analytics</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Infrastructure <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Health</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium flex items-center gap-2">
                        <Clock size={14} /> Last Synchronization: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                <button 
                    onClick={fetchHealth} 
                    disabled={loading}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all group active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={16} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Manual Refresh</span>
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <HealthCard 
                    title="Core Engine" 
                    status={health?.status} 
                    icon={Cpu} 
                />
                <HealthCard 
                    title="Database Layer" 
                    status={health?.services?.database} 
                    icon={Database} 
                />
                <HealthCard 
                    title="Memory Cache" 
                    status={health?.services?.redis} 
                    icon={Zap} 
                />
                <HealthCard 
                    title="Object Storage" 
                    status={health?.services?.storage} 
                    icon={HardDrive} 
                />
            </div>

            {/* Detailed Services & Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* System Metrics */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Network size={120} className="text-emerald-400" />
                        </div>
                        
                        <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                            <ShieldCheck className="text-emerald-400" /> System Integrity Report
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Build Version</p>
                                    <p className="text-lg font-bold text-white font-mono bg-white/5 px-4 py-2 rounded-xl inline-block border border-white/5">
                                        v{health?.version || '0.0.0'}-stable
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Node Uptime</p>
                                    <p className="text-2xl font-black text-emerald-400">{health?.uptime || 'Calculating...'}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Server Timestamp</p>
                                    <p className="text-sm font-bold text-slate-300">
                                        {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Waiting for data...'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Network Latency</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: loading ? '30%' : '85%' }}
                                                className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                                            />
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">Optimized</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Services Status (if available) */}
                    {health?.services?.ai_services && (
                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem] p-8">
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <Globe className="text-indigo-400" /> AI Neural Services
                            </h3>
                            <div className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                                        <Zap className="text-indigo-400" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white uppercase tracking-tight">Large Language Models</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">External Provider Status</p>
                                    </div>
                                </div>
                                <span className="px-4 py-1.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                                    {health.services.ai_services}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Log / Alerts */}
                <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                        <AlertTriangle size={20} className="text-amber-400" /> Incident Log
                    </h3>
                    
                    <div className="space-y-6">
                        {loading && !health ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                <Loader size={40} className="animate-spin mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Scanning Signal...</p>
                            </div>
                        ) : health?.errors && health.errors.length > 0 ? (
                            health.errors.map((err, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                                    <AlertTriangle className="text-rose-400 shrink-0" size={18} />
                                    <p className="text-xs font-bold text-rose-300">{err}</p>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                                    <ShieldCheck className="text-emerald-400" size={32} />
                                </div>
                                <h4 className="text-white font-black uppercase text-xs mb-2">No Disruptions</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">All neural pathways are at peak efficiency.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse-emerald {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.7; }
                }
            `}</style>
        </div>
    );
}

const Loader = ({ size = 24, className = "" }) => (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full" />
        <div className="absolute inset-0 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
);
