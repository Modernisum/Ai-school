import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function AuthPage() {
  const [form, setForm] = useState({ schoolId: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Support Modal State
  const [showSupport, setShowSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({ schoolName: "", contactInfo: "", message: "" });
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportStatus, setSupportStatus] = useState(""); // 'success' | 'error'

  const navigate = useNavigate();

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setIsSupportLoading(true);
    setSupportMessage("");
    setSupportStatus("");

    try {
      const res = await fetch(`${API_BASE}/auth/school/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportForm),
      });
      const data = await res.json();
      if (data.success) {
        setSupportStatus("success");
        setSupportMessage("Request sent successfully! Super Admin will contact you shortly.");
        // Reset form
        setSupportForm({ schoolName: "", contactInfo: "", message: "" });
        // Close modal after delay
        setTimeout(() => {
          setShowSupport(false);
          setSupportStatus("");
          setSupportMessage("");
        }, 3000);
      } else {
        setSupportStatus("error");
        setSupportMessage(data.message || "Failed to submit request.");
      }
    } catch (err) {
      setSupportStatus("error");
      setSupportMessage("Connection error while submitting request.");
    } finally {
      setIsSupportLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/school/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("schoolId", data.schoolId);
        navigate("/dashboard/home");
      } else {
        setMessage(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: "2s" }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 md:p-10 m-4 shadow-2xl">

          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4"
            >
              <span className="text-2xl font-bold text-white tracking-widest">V</span>
            </motion.div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Vidhyam
            </h2>
            <p className="text-sm font-medium text-indigo-400 mt-1 font-semibold tracking-wide">
              School Operations Platform
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to manage your institution
            </p>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <p className="text-sm text-rose-400 font-medium text-center">{message}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">School ID</label>
              <input
                type="text"
                name="schoolId"
                placeholder="e.g. 474220"
                value={form.schoolId}
                onChange={handleChange}
                className="input-dark"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="input-dark"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-4 flex items-center justify-center"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Sign In"}
            </motion.button>

            <div className="text-center mt-4 pt-2">
              <button
                type="button"
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={() => setShowSupport(true)}
              >
                Forgot Password or School ID?
              </button>
            </div>
          </form>

        </div>
      </motion.div>

      {/* Support Request Modal */}
      <AnimatePresence>
        {showSupport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(2, 6, 23, 0.8)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                type="button"
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                onClick={() => setShowSupport(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              <h3 className="text-xl font-bold text-white mb-2">Need Help?</h3>
              <p className="text-sm text-slate-400 mb-6">
                Leave a message and the Super Admin will contact you to recover your account.
              </p>

              {supportMessage && (
                <div className={`mb-4 p-3 rounded-xl border text-sm text-center ${supportStatus === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {supportMessage}
                </div>
              )}

              {supportStatus !== 'success' && (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">School Name / ID</label>
                    <input
                      type="text"
                      required
                      value={supportForm.schoolName}
                      onChange={e => setSupportForm({ ...supportForm, schoolName: e.target.value })}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                      placeholder="e.g. Springfield High"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Contact Info</label>
                    <input
                      type="text"
                      required
                      value={supportForm.contactInfo}
                      onChange={e => setSupportForm({ ...supportForm, contactInfo: e.target.value })}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                      placeholder="Phone or Email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Message</label>
                    <textarea
                      required
                      rows={3}
                      value={supportForm.message}
                      onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium resize-none"
                      placeholder="I forgot my login details..."
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button type="button" onClick={() => setShowSupport(false)} className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-slate-800 text-slate-300 hover:bg-slate-700 w-1/3">Cancel</button>
                    <button type="submit" disabled={isSupportLoading} className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-indigo-500 hover:bg-indigo-600 text-white w-2/3 flex items-center justify-center">
                      {isSupportLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : "Send Message"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
