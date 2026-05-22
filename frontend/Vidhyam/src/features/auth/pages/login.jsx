import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  School, AlertTriangle, CheckCircle, MessageSquare, X, Phone,
  Shield, BarChart3, Users, BookOpen, Sparkles, ArrowRight, Eye, EyeOff,
  TrendingUp, Globe, Clock
} from "lucide-react";

import { useLoginMutation, useSubmitSupportMutation } from "../api/authApi";
import { setCredentials } from "../authSlice";
import GlassCard from "../../../components/ui/GlassCard";
import StandardButton from "../../../components/ui/StandardButton";
import { inp } from "../../../components/ui/FormWidget";
import { applyThemeEnhanced } from "../../../utils/themeEnhanced";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const LOGIN_SCHEMA = [
  {
    id: "auth",
    fields: [
      { name: "schoolId",  label: "School ID", type: "text",     required: true, placeholder: "e.g. 474220",  labelIcon: School },
      { name: "password",  label: "Password",  type: "password", required: true, placeholder: "••••••••" },
    ],
  },
];

const SUPPORT_SCHEMA = [
  {
    id: "support",
    fields: [
      { name: "schoolName",  label: "School Name / ID",   type: "text",     required: true, placeholder: "e.g. Springfield High", labelIcon: School },
      { name: "contactInfo", label: "Contact Info",        type: "text",     required: true, placeholder: "Phone or Email",         labelIcon: Phone  },
      { name: "message",     label: "Message",             type: "textarea", required: true, placeholder: "I forgot my login details...", rows: 3 },
    ],
  },
];

// ─── Floating Orbs ────────────────────────────────────────────────────────────
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ x: [0, 40, -30, 0], y: [0, -50, 30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/10 via-indigo-400/5 to-transparent blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -30, 20, 0], y: [0, 40, -35, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-cyan-400/10 via-blue-400/5 to-transparent blur-[100px]"
      />
      <motion.div
        animate={{ x: [0, 25, -40, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-blue-300/15 via-indigo-300/10 to-transparent blur-[120px]"
      />
    </div>
  );
}

// ─── Grid Pattern ─────────────────────────────────────────────────────────────
function GridPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }}
    />
  );
}

// ─── Status Alert ─────────────────────────────────────────────────────────────
function StatusAlert({ message, status }) {
  if (!message) return null;
  const ok = status === "success";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold mb-5 ${
        ok ? "bg-emerald-50 border-emerald-100 text-emerald-700"
           : "bg-rose-50 border-rose-100 text-rose-700"
      }`}
    >
      {ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
      {message}
    </motion.div>
  );
}

// ─── SaaS Metric Badge ────────────────────────────────────────────────────────
function MetricBadge({ icon: Icon, value, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-100 shadow-sm shadow-slate-100/50 backdrop-blur-sm"
    >
      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
        <Icon size={16} className="text-blue-600" />
      </div>
      <div>
        <p className="text-base font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [errorMsg, setErrorMsg]     = useState("");
  const [showSupport, setShowSupport] = useState(false);
  const [supportMsg, setSupportMsg]  = useState("");
  const [supportStatus, setSupportStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Force light theme mode on login page mount
    applyThemeEnhanced({
      mode: "light",
      primary: "#2563eb",
      secondary: "#3b82f6",
      accent: "#06b6d4",
      success: "#059669",
      warning: "#d97706",
      backgroundVia: "#f4f5f7",
    });

    // Disable browser-level scrolling for a perfect single-page fit
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      // Re-enable browser-level scrolling on unmount
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  const [login, { isLoading }]                        = useLoginMutation();
  const [submitSupport, { isLoading: isSupportLoading }] = useSubmitSupportMutation();

  const { register: lr, handleSubmit: hsl, formState: { errors: lErrors } } = useForm();
  const { control: sc, handleSubmit: hss, reset: resetSupport } = useForm();

  const onLogin = async (data) => {
    setErrorMsg("");
    try {
      const res = await login(data).unwrap();
      if (res.success) {
        dispatch(setCredentials({ accessToken: res.accessToken, schoolId: res.schoolId, schoolProfile: { name: res.schoolName } }));
        navigate("/dashboard/home");
      }
    } catch (err) {
      setErrorMsg(err.data?.message || "Invalid credentials or connection error.");
    }
  };

  const onSupport = async (data) => {
    setSupportMsg(""); setSupportStatus("");
    try {
      const res = await submitSupport(data).unwrap();
      if (res.success) {
        setSupportStatus("success");
        setSupportMsg("Request sent! Our admin will contact you shortly.");
        resetSupport();
        setTimeout(() => { setShowSupport(false); setSupportStatus(""); setSupportMsg(""); }, 3000);
      }
    } catch (err) {
      setSupportStatus("error");
      setSupportMsg(err.data?.message || "Failed to submit. Please try again.");
    }
  };

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden flex bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/20 text-slate-800 relative">
      <FloatingOrbs />
      <GridPattern />

      {/* ═══ LEFT PANEL — Branding ═══ */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-6 xl:p-8 h-full overflow-hidden">
        {/* Top Logo Bar */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <School size={18} className="text-white" />
          </div>
          <div>
            <span className="text-base font-black text-slate-900 tracking-tight uppercase italic leading-none">Vidhyam</span>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-0.5">School Management Cloud</p>
          </div>
        </motion.div>

        {/* Center Hero Content */}
        <div className="flex-1 flex flex-col justify-center max-w-xl my-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">Platform Status • Operational</span>
            </div>

            <h1 className="text-2xl xl:text-3xl 2xl:text-4xl font-black text-slate-900 leading-[1.15] tracking-tight">
              The Modern Way to
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">Manage Your School</span>
            </h1>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed max-w-lg">
              All-in-one cloud platform for admissions, attendance, fees, academics,
              and analytics — trusted by <span className="text-slate-800 font-semibold">500+ schools</span> nationwide.
            </p>
          </motion.div>

          {/* Metrics Row */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-5 text-xs text-slate-500 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900">500+</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Schools</span>
            </div>
            <div className="w-px h-3 bg-slate-200 self-center" />
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900">50K+</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Active Users</span>
            </div>
            <div className="w-px h-3 bg-slate-200 self-center" />
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900">99.9%</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Uptime</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Trust Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center gap-4 text-[8px] text-slate-400 font-bold uppercase tracking-widest pt-3 border-t border-slate-100"
        >
          <span className="flex items-center gap-1.5"><Shield size={10} className="text-emerald-600" /> SOC 2 Compliant</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-emerald-600" /> GDPR Ready</span>
          <span className="flex items-center gap-1.5 ml-auto text-slate-400"><Clock size={9} /> v3.2.1</span>
        </motion.div>
      </div>

      {/* ═══ RIGHT PANEL — Login Form ═══ */}
      <div className="w-full lg:w-[45%] h-full flex flex-col justify-between items-center px-6 py-4 lg:py-6 xl:py-8 relative">
        {/* Divider line */}
        <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

        {/* Decorative corner accent */}
        <div className="hidden lg:block absolute top-12 right-12 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl" />

        <div className="flex-1 flex flex-col justify-center w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/10"
            >
              <School size={16} className="text-white" />
            </motion.div>
            <div className="text-left">
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase italic leading-none">Vidhyam</h1>
              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">School Management Cloud</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-4 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign in</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your credentials to access the dashboard</p>
            </motion.div>
          </div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/5 via-blue-600/5 to-cyan-500/5 rounded-2xl blur-xl opacity-60" />
            <div className="relative p-5 sm:p-6 lg:p-7 rounded-2xl bg-white border border-slate-100 shadow-xl backdrop-blur-xl">
              <AnimatePresence>{errorMsg && <StatusAlert message={errorMsg} status="error" />}</AnimatePresence>

              <form onSubmit={hsl(onLogin)} className="space-y-3.5">
                {/* School ID Field */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
                    <School size={10} className="text-blue-500" />
                    School ID
                  </label>
                  <div className="relative group">
                    <input
                      {...lr("schoolId", { required: "School ID is required" })}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all duration-300"
                      placeholder="Enter your school ID"
                    />
                  </div>
                  {lErrors.schoolId && (
                    <p className="text-[10px] font-semibold text-rose-500 ml-1">{lErrors.schoolId.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
                    <Shield size={10} className="text-blue-500" />
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      {...lr("password", { required: "Password is required" })}
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 pr-11 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all duration-300"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {lErrors.password && (
                    <p className="text-[10px] font-semibold text-rose-500 ml-1">{lErrors.password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <StandardButton
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  rightIcon={ArrowRight}
                  className="w-full !py-2.2 !text-xs !font-bold mt-2"
                >
                  {isLoading ? "Authenticating..." : "Sign In"}
                </StandardButton>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white">Secure Access</span>
                </div>
              </div>

              {/* Help Links */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowSupport(true)}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors group"
                >
                  <MessageSquare size={12} className="group-hover:text-blue-600 transition-colors" />
                  Forgot credentials?
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-[400px] flex items-center justify-between mt-4 pt-3 border-t border-slate-100"
        >
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            Powered by Modernisum
          </p>
          <div className="flex items-center gap-1 text-[9px] text-slate-400">
            <Shield size={10} className="text-emerald-600" />
            <span className="font-bold uppercase tracking-widest">256-bit SSL</span>
          </div>
        </motion.div>
      </div>

      {/* ═══ Support Modal ═══ */}
      <AnimatePresence>
        {showSupport && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-900/30"
            onClick={() => setShowSupport(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[400px]"
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/5 via-blue-600/5 to-cyan-500/5 rounded-2xl blur-xl" />
                <div className="relative p-6 sm:p-7 rounded-2xl bg-white border border-slate-100 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Need Help?</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Admin will recover your access.</p>
                    </div>
                    <StandardButton variant="ghost" size="sm" icon={X} onClick={() => setShowSupport(false)} className="!p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50" />
                  </div>

                  <AnimatePresence>{supportMsg && <StatusAlert message={supportMsg} status={supportStatus} />}</AnimatePresence>

                  {supportStatus !== "success" && (
                    <form onSubmit={hss(onSupport)} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">School Name / ID</label>
                        <input
                          {...sc.register("schoolName", { required: true })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          placeholder="e.g. Springfield High"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Contact Info</label>
                        <input
                          {...sc.register("contactInfo", { required: true })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          placeholder="Phone or Email"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Message</label>
                        <textarea
                          {...sc.register("message", { required: true })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                          rows={3}
                          placeholder="I forgot my login details..."
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <StandardButton variant="ghost" size="sm" onClick={() => setShowSupport(false)} className="flex-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50">
                          Cancel
                        </StandardButton>
                        <StandardButton type="submit" variant="primary" size="sm" isLoading={isSupportLoading} className="flex-1">
                          Send Message
                        </StandardButton>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
