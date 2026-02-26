// src/components/auth/SessionHandler.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, LogIn } from "lucide-react";

const API = process.env.REACT_APP_API_BASE_URL;

export default function SessionHandler({ children }) {
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Use a ref to ensure we don't show the dialog on the very first render
  // when navigating here fresh from a setup/login flow.
  const isFirstCheck = useRef(true);

  useEffect(() => {
    async function verifyToken() {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        // On the first check after page-load, if there's no token, show session expired.
        // But we delay to allow a setup redirect to set the token first.
        if (!isFirstCheck.current) {
          setShowDialog(true);
        }
        isFirstCheck.current = false;
        return;
      }
      isFirstCheck.current = false;

      try {
        const res = await fetch(`${API}/auth/school/verify-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!data.success) {
          localStorage.removeItem("accessToken");
          setShowDialog(true);
        }
      } catch (err) {
        console.error("Verify token failed:", err);
        // Network errors should NOT log the user out - only invalid responses should.
      }
    }

    // A tiny delay on mount allows setup.jsx's token storage to complete before
    // the session handler runs its first check.
    const initialDelay = setTimeout(verifyToken, 500);
    const interval = setInterval(verifyToken, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [location?.pathname]);

  const handleOk = () => {
    setShowDialog(false);
    localStorage.removeItem("accessToken");
    navigate("/");
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(2, 6, 23, 0.75)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="glass-card w-full max-w-sm p-8 text-center border border-white/10 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <ShieldAlert className="w-8 h-8 text-rose-400" />
              </div>

              <h2 className="text-xl font-bold text-white mb-2">Session Expired</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Your session has timed out for security. Please log in again to continue.
              </p>

              <button
                onClick={handleOk}
                className="btn-primary w-full justify-center py-3"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Return to Login
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
