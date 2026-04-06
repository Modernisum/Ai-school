import React, { useEffect, useState, memo } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, AlertTriangle, AlertCircle, X, Check } from "lucide-react";
import { API_BASE_URL, getSchoolIdFromStorage } from "../../utils/api";
import { setOnline, selectIsOnline } from '../../features/settings/settingsSlice';

const API = API_BASE_URL;

const SchoolNotifier = memo(() => {
    const dispatch = useDispatch();
    const isOnline = useSelector(selectIsOnline);
    const [notif, setNotif] = useState(null);
    const [loading, setLoading] = useState(false);
    const schoolId = getSchoolIdFromStorage();

    const [errorCount, setErrorCount] = useState(0);

    useEffect(() => {
        if (!schoolId) return;

        const checkNotif = async () => {
            // If we've had too many errors or we are offline, wait
            if (errorCount > 5 || !isOnline) {
                // Try to recover after 5 minutes
                if (errorCount > 5) {
                    setTimeout(() => setErrorCount(0), 5 * 60000);
                }
                return;
            }

            try {
                const res = await fetch(`${API}/school/${schoolId}/notification`);
                if (!res.ok) {
                    setErrorCount(prev => prev + 1);
                    return;
                }
                setErrorCount(0); // Reset on success
                dispatch(setOnline(true));

                const data = await res.json();
                if (data.success && data.data) {
                    // data.data could be null if no notification
                    setNotif(data.data);
                } else {
                    setNotif(null);
                }
            } catch (err) {
                setErrorCount(prev => prev + 1);
                // Silently handle fetch errors
                const isFetchError = err?.name === 'TypeError' || err?.message?.includes('fetch');
                if (isFetchError) {
                    dispatch(setOnline(false));
                } else if (!isFetchError) {
                    console.error("Failed to check notifications:", err);
                }
            }
        };

        // Check immediately, then every 60 seconds
        const delay = setTimeout(checkNotif, 2000);
        const interval = setInterval(checkNotif, errorCount > 0 ? 120000 : 60000);

        return () => {
            clearTimeout(delay);
            clearInterval(interval);
        };
    }, [schoolId, errorCount, isOnline, dispatch]);

    const handleDismiss = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/school/${schoolId}/notification`, {
                method: "DELETE",
            });
            if (res.ok) {
                setNotif(null);
            }
        } catch (err) {
            // Silently handle fetch errors to avoid console noise when backend is down
            if (err.name !== "TypeError") {
                console.error("Failed to clear notification:", err);
            }
        }
        setLoading(false);
    };

    if (!notif) return null;

    // Determine styles and icon based on notification type
    const type = notif.type || "info";
    let Icon = BellRing;
    let bgClass = "bg-slate-900 border-primary/30 shadow-primary/20";
    let iconBg = "bg-primary/10 text-primary border-primary/20";
    let btnClass = "bg-primary hover:brightness-110 text-white";

    if (type === "warning") {
        Icon = AlertTriangle;
        bgClass = "bg-slate-900 border-warning/30 shadow-warning/20";
        iconBg = "bg-warning/10 text-warning border-warning/20";
        btnClass = "bg-warning hover:brightness-110 text-white";
    } else if (type === "error") {
        Icon = AlertCircle;
        bgClass = "bg-slate-900 border-accent/30 shadow-accent/20";
        iconBg = "bg-accent/10 text-accent border-accent/20";
        btnClass = "bg-accent hover:brightness-110 text-white";
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: "rgba(2, 6, 23, 0.8)", backdropFilter: "blur(4px)" }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={`w-full max-w-md p-6 rounded-2xl border ${bgClass}`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className="text-lg font-bold text-white mb-2 leading-none">
                                {notif.title || "Message from Super Admin"}
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                                {notif.message}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button
                            onClick={handleDismiss}
                            disabled={loading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${btnClass}`}
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            {loading ? "Acknowledging..." : "I Understand"}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default SchoolNotifier;
