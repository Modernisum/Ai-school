import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingDown, Info, Loader2 } from 'lucide-react';
import { getChurnRadar } from '../api';
import GlassCard from './ui/GlassCard.jsx';

export default function ChurnRadar() {
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getChurnRadar().then(res => {
            if (res.success) setRisks(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <GlassCard className="flex items-center justify-center" style={{ padding: 40 }}>
            <div className="spinner" />
        </GlassCard>
    );

    return (
        <GlassCard className="mb-4" dangerBorder>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle size={18} className="text-danger" />
                    AI Churn Prediction Radar
                </h3>
                <span className="text-xs text-tertiary">Refreshed daily</span>
            </div>

            {risks.length === 0 ? (
                <p className="text-center text-tertiary text-sm" style={{ padding: '20px 0' }}>
                    No schools currently flagged as high risk.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    <AnimatePresence>
                        {risks.map((risk, i) => (
                            <motion.div
                                key={risk.schoolId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="churn-risk-card"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="text-sm font-semibold">{risk.schoolName}</div>
                                        <div className="text-xs text-tertiary">ID: {risk.schoolId}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-extrabold text-danger">{risk.probability}%</div>
                                        <div className="text-xs font-bold uppercase text-danger">Churn Risk</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1 mb-2">
                                    {risk.factors.map((factor, idx) => (
                                        <span key={idx} className="churn-factor-tag">
                                            {factor}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => window.location.href = `/schools/${risk.schoolId}`}
                                    >
                                        Inspect School
                                    </button>
                                </div>
                                
                                <div className="churn-risk-watermark">
                                    <TrendingDown size={80} />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
            
            <div className="mt-4 flex items-center gap-2" style={{ padding: '10px 12px', background: 'var(--surface-layer3)', borderRadius: 'var(--radius-md)' }}>
                <Info size={14} className="text-primary" />
                <p className="text-xs text-secondary">
                    Risks are calculated based on login frequency, complaint volume, and billing delays.
                </p>
            </div>
        </GlassCard>
    );
}
