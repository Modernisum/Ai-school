import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, AlertTriangle, AlertCircle, X, Check } from "lucide-react";

const API = process.env.REACT_APP_API_BASE_URL;

export default function SchoolNotifier() {
    const [notif, setNotif] = useState(null);
    const [loading, setLoading] = useState(false);
    const schoolId = localStorage.getItem("schoolId");

    useEffect(() => {
        if (!schoolId) return;

        const checkNotif = async () => {
            try {
                const res = await fetch(`${API}/school/${schoolId}/notification`);
                if (!res.ok) return;
                const data = await res.json();
                if (data.success && data.data) {
                    // data.data could be null if no notification
                    setNotif(data.data);
                } else {
                    setNotif(null);
                }
            } catch (err) {
                console.error("Failed to check notifications:", err);
            }
        };

        // Check immediately, then every 60 seconds
        const delay = setTimeout(checkNotif, 2000);
        const interval = setInterval(checkNotif, 60000);

        return () => {
            clearTimeout(delay);
            clearInterval(interval);
        };
    }, [schoolId]);

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
            console.error("Failed to clear notification:", err);
        }
        setLoading(false);
    };

    if (!notif) return null;

    // Determine styles and icon based on notification type
    const type = notif.type || "info";
    let Icon = BellRing;
    let bgClass = "bg-slate-900 border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)]";
    let iconBg = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    let btnClass = "bg-indigo-500 hover:bg-indigo-600 text-white";

    if (type === "warning") {
        Icon = AlertTriangle;
        bgClass = "bg-slate-900 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]";
        iconBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        btnClass = "bg-amber-500 hover:bg-amber-600 text-white";
    } else if (type === "error") {
        Icon = AlertCircle;
        bgClass = "bg-slate-900 border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]";
        iconBg = "bg-rose-500/10 text-rose-400 border-rose-500/20";
        btnClass = "bg-rose-500 hover:bg-rose-600 text-white";
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
}
