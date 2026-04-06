// src/components/auth/SessionHandler.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, LogIn } from "lucide-react";
import { useVerifyTokenMutation } from "../api/authApi";
import { logout, selectCurrentToken } from "../authSlice";

export default function SessionHandler({ children }) {
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const token = useSelector(selectCurrentToken);
  const [verifyToken] = useVerifyTokenMutation();
  
  // Use a ref to ensure we don't show the dialog on the very first render
  const isFirstCheck = useRef(true);

  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    async function checkSession() {
      // Backoff if we've had many errors
      if (errorCount > 3) {
        setTimeout(() => setErrorCount(0), 10 * 60000);
        return;
      }

      if (!token) {
        if (!isFirstCheck.current) {
          setShowDialog(true);
        }
        isFirstCheck.current = false;
        return;
      }
      isFirstCheck.current = false;

      try {
        const data = await verifyToken(token).unwrap();
        if (!data.success) {
          dispatch(logout());
          setShowDialog(true);
        }
        setErrorCount(0); // Reset on success
      } catch (err) {
        setErrorCount(prev => prev + 1);
        // Silently handle fetch errors to avoid console noise when backend is down
        const isFetchError = err?.status === 'FETCH_ERROR' || err?.name === 'TypeError';
        if (!isFetchError) {
          console.error("Verify token failed:", err);
        }
      }
    }

    const initialDelay = setTimeout(checkSession, 500);
    const interval = setInterval(checkSession, errorCount > 0 ? 15 * 60 * 1000 : 5 * 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [location?.pathname, token, verifyToken, dispatch, errorCount]);

  const handleOk = () => {
    setShowDialog(false);
    dispatch(logout());
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
