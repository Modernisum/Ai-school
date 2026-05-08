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
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-transparent blur-[150px]"
      />
      <motion.div
        animate={{ x: [0, -30, 20, 0], y: [0, 40, -35, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-cyan-500/20 via-blue-500/10 to-transparent blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, 25, -40, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-primary/25 via-blue-500/10 to-transparent blur-[140px]"
      />
    </div>
  );
}

// ─── Grid Pattern ─────────────────────────────────────────────────────────────
function GridPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
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
        ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
           : "bg-rose-500/10 border-rose-500/20 text-rose-400"
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
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/20 flex items-center justify-center">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <p className="text-lg font-black text-white tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
function TestimonialCard({ quote, author, role, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm"
    >
      <div className="absolute -top-2 -left-2 text-4xl text-primary/20 leading-none font-serif">"</div>
      <p className="text-xs text-slate-400 leading-relaxed italic mt-2">{quote}</p>
      <div className="mt-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-[10px] font-black text-white">
          {author.charAt(0)}
        </div>
        <div>
          <p className="text-[11px] font-bold text-white">{author}</p>
          <p className="text-[9px] text-slate-500 font-medium">{role}</p>
        </div>
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
    <div className="min-h-screen flex bg-[#07080b] relative overflow-hidden">
      <FloatingOrbs />
      <GridPattern />

      {/* ═══ LEFT PANEL — Branding ═══ */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-10 xl:p-14 2xl:p-18">
        {/* Top Logo Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/25">
            <School size={22} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-black text-white tracking-tight uppercase italic leading-none">Vidhyam</span>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-0.5">School Management Cloud</p>
          </div>
        </motion.div>

        {/* Center Hero Content */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-blue-600/10 to-cyan-500/10 border border-blue-500/20 mb-7">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Platform Status • Operational</span>
            </div>

            <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-white leading-[1.05] tracking-tight">
              The Modern Way to
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">Manage Your School</span>
            </h1>

            <p className="text-sm text-slate-400 mt-4 leading-relaxed max-w-lg">
              All-in-one cloud platform for admissions, attendance, fees, academics,
              and analytics — trusted by <span className="text-white font-semibold">500+ schools</span> nationwide.
            </p>
          </motion.div>

          {/* Metrics Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-3 gap-3 mt-10"
          >
            <MetricBadge icon={Users} value="500+" label="Schools Onboarded" />
            <MetricBadge icon={TrendingUp} value="50K+" label="Active Users" />
            <MetricBadge icon={Globe} value="99.9%" label="Uptime SLA" />
          </motion.div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-8 max-w-md"
          >
            <TestimonialCard
              quote="Vidhyam transformed how we handle admissions and fee tracking. Our admin workload dropped by 60%."
              author="Priya Sharma"
              role="Principal, Delhi Public School"
              delay={0.5}
            />
          </motion.div>
        </div>

        {/* Bottom Trust Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex items-center gap-8 text-[10px] text-slate-600 font-bold uppercase tracking-widest"
        >
          <span className="flex items-center gap-1.5"><Shield size={12} className="text-emerald-500/60" /> SOC 2 Compliant</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500/60" /> GDPR Ready</span>
          <span className="flex items-center gap-1.5"><BarChart3 size={12} className="text-emerald-500/60" /> Real-time Sync</span>
          <span className="flex items-center gap-1.5 ml-auto text-slate-700"><Clock size={10} /> v3.2.1</span>
        </motion.div>
      </div>

      {/* ═══ RIGHT PANEL — Login Form ═══ */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 relative">
        {/* Divider line */}
        <div className="hidden lg:block absolute left-0 top-[8%] bottom-[8%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        {/* Decorative corner accent */}
        <div className="hidden lg:block absolute top-12 right-12 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 shadow-xl mb-4"
            >
              <School size={24} className="text-white" />
            </motion.div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Vidhyam</h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.35em] mt-1">School Management Cloud</p>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl font-black text-white tracking-tight">Sign in</h2>
              <p className="text-sm text-slate-400 mt-1.5">Enter your credentials to access the dashboard</p>
            </motion.div>
          </div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-blue-600/20 to-cyan-500/20 rounded-2xl blur-xl opacity-60" />
            <div className="relative p-8 rounded-2xl bg-[#0c0e14] border border-white/[0.08] shadow-2xl backdrop-blur-xl">
              <AnimatePresence>{errorMsg && <StatusAlert message={errorMsg} status="error" />}</AnimatePresence>

              <form onSubmit={hsl(onLogin)} className="space-y-5">
                {/* School ID Field */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
                    <School size={10} className="text-blue-400" />
                    School ID
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                    <input
                      {...lr("schoolId", { required: "School ID is required" })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/20 transition-all duration-300"
                      placeholder="Enter your school ID"
                    />
                  </div>
                  {lErrors.schoolId && (
                    <p className="text-[10px] font-semibold text-rose-400 ml-1">{lErrors.schoolId.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
                    <Shield size={10} className="text-blue-400" />
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                    <input
                      {...lr("password", { required: "Password is required" })}
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/20 transition-all duration-300"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {lErrors.password && (
                    <p className="text-[10px] font-semibold text-rose-400 ml-1">{lErrors.password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <StandardButton
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  rightIcon={ArrowRight}
                  className="w-full !py-3 !text-sm !font-bold"
                >
                  {isLoading ? "Authenticating..." : "Sign In"}
                </StandardButton>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-[9px] font-bold text-slate-600 uppercase tracking-widest bg-[#0c0e14]">Secure Access</span>
                </div>
              </div>

              {/* Help Links */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowSupport(true)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-400 transition-colors group"
                >
                  <MessageSquare size={13} className="group-hover:text-blue-400 transition-colors" />
                  Forgot credentials?
                </button>
              </div>
            </div>
          </motion.div>

          {/* Bottom Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex items-center justify-between"
          >
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">
              Powered by Modernisum
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-700">
              <Shield size={10} className="text-emerald-500/50" />
              <span className="font-bold uppercase tracking-widest">256-bit SSL Encrypted</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ═══ Support Modal ═══ */}
      <AnimatePresence>
        {showSupport && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/70"
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
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-blue-600/20 to-cyan-500/20 rounded-2xl blur-xl" />
                <div className="relative p-7 rounded-2xl bg-[#0c0e14] border border-white/[0.08] shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Need Help?</h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Admin will recover your access.</p>
                    </div>
                    <StandardButton variant="ghost" size="sm" icon={X} onClick={() => setShowSupport(false)} className="!p-2" />
                  </div>

                  <AnimatePresence>{supportMsg && <StatusAlert message={supportMsg} status={supportStatus} />}</AnimatePresence>

                  {supportStatus !== "success" && (
                    <form onSubmit={hss(onSupport)} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">School Name / ID</label>
                        <input
                          {...sc.register("schoolName", { required: true })}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all"
                          placeholder="e.g. Springfield High"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Contact Info</label>
                        <input
                          {...sc.register("contactInfo", { required: true })}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all"
                          placeholder="Phone or Email"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Message</label>
                        <textarea
                          {...sc.register("message", { required: true })}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all resize-none"
                          rows={3}
                          placeholder="I forgot my login details..."
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <StandardButton variant="ghost" size="sm" onClick={() => setShowSupport(false)} className="flex-1">
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
