import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingDown, Info, Loader2 } from 'lucide-react';
import { getChurnRadar } from '../api';

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
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 className="animate-spin text-accent" size={24} />
        </div>
    );

    return (
        <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="#ef4444" />
                    AI Churn Prediction Radar
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Refreshed daily</span>
            </div>

            {risks.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text3)', padding: '20px 0', fontSize: 13 }}>
                    No schools currently flagged as high risk.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <AnimatePresence>
                        {risks.map((risk, i) => (
                            <motion.div
                                key={risk.schoolId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.05)',
                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                    borderRadius: 12,
                                    padding: 12,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text1)' }}>{risk.schoolName}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>ID: {risk.schoolId}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{risk.probability}%</div>
                                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#ef4444' }}>Churn Risk</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                    {risk.factors.map((factor, idx) => (
                                        <span key={idx} style={{ 
                                            fontSize: 10, 
                                            background: 'rgba(239, 68, 68, 0.12)', 
                                            color: '#ef4444', 
                                            padding: '2px 8px', 
                                            borderRadius: 20,
                                            fontWeight: 600,
                                            border: '1px solid rgba(239, 68, 68, 0.2)'
                                        }}>
                                            {factor}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                        className="btn btn-sm btn-ghost"
                                        style={{ fontSize: 10, padding: '4px 10px' }}
                                        onClick={() => window.location.href = `/schools/${risk.schoolId}`}
                                    >
                                        Inspect School
                                    </button>
                                </div>
                                
                                <div style={{ 
                                    position: 'absolute', 
                                    right: -10, 
                                    bottom: -20, 
                                    opacity: 0.03, 
                                    color: '#ef4444',
                                    transform: 'rotate(-15deg)'
                                }}>
                                    <TrendingDown size={80} />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
            
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Info size={14} color="var(--accent)" />
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text2)' }}>
                    Risks are calculated based on login frequency, complaint volume, and billing delays.
                </p>
            </div>
        </div>
    );
}
