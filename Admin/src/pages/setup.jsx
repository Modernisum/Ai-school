import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  School,
  MapPin,
  TrendingUp,
  Award,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  AlertCircle
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE_URL + "/setup/school";

export default function SchoolSetup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    schoolName: "",
    affiliatedBoard: "",
    classLevel: "",
    schoolAddress: "",
    password: "",
    confirmPassword: "",
  });

  const boards = ["CBSE", "ICSE", "IB", "State Board", "Cambridge"];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateStep = (currentStep) => {
    setError("");
    if (currentStep === 1 && !form.schoolName.trim()) {
      setError("Please enter your school's name");
      return false;
    }
    if (currentStep === 2 && (!form.affiliatedBoard || !form.classLevel)) {
      setError("Please select a board and class level");
      return false;
    }
    if (currentStep === 3 && !form.schoolAddress.trim()) {
      setError("Please enter the school address");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: form.schoolName,
          schoolAddress: form.schoolAddress,
          classLevel: parseInt(form.classLevel, 10),
          affiliatedBoard: form.affiliatedBoard,
          password: form.password,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to complete setup");
      }

      const resData = await response.json();

      const schoolId = resData.schoolId || resData.data?.schoolId || resData.id;
      localStorage.setItem("schoolName", form.schoolName);
      localStorage.setItem("schoolAddress", form.schoolAddress);

      if (schoolId) {
        localStorage.setItem("schoolId", schoolId);
      }

      if (resData.accessToken) {
        localStorage.setItem("accessToken", resData.accessToken);
      }

      localStorage.setItem("boardName", form.affiliatedBoard);
      localStorage.setItem("maxClassLevel", form.classLevel);

      // Add a slight delay for the success animation to be visible
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);

    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  // Animation variants
  const fadeInVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="page-bg flex justify-center items-center p-6 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card w-full max-w-4xl min-h-[600px] flex flex-col md:flex-row shadow-2xl overflow-hidden z-10 border border-white/10 relative"
      >
        {/* Left Section: Branding & Progress */}
        <div className="w-full md:w-5/12 bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden">

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <School className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">ModernSchool</h1>
            </div>

            <div className="mb-4">
              <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
                Establish your <br />
                <span className="text-gradient">digital campus.</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mt-4">
                Let's configure your institution's core details to construct a tailored administrative environment.
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="relative z-10 mt-12 hidden md:block">
            <div className="space-y-6">
              {[
                { num: 1, label: "Institution Identity" },
                { num: 2, label: "Academic Structure" },
                { num: 3, label: "Campus Location" },
                { num: 4, label: "Security Setup" }
              ].map((s) => (
                <div key={s.num} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${step > s.num
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : step === s.num
                        ? "bg-indigo-500/20 border-indigo-400 text-indigo-300"
                        : "bg-slate-800 border-slate-700 text-slate-500"
                    }`}>
                    {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-semibold">{s.num}</span>}
                  </div>
                  <span className={`text-sm font-medium transition-colors duration-300 ${step >= s.num ? "text-slate-200" : "text-slate-500"
                    }`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section: Form Content */}
        <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-slate-900/40 relative">

          <AnimatePresence mode="wait">

            {/* STEP 1: School Name */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-sm mx-auto"
              >
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">What is the name of your institution?</h3>
                  <p className="text-slate-400 text-sm">This will be displayed across all reports and portals.</p>
                </div>

                <div className="space-y-5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <School className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      name="schoolName"
                      value={form.schoolName}
                      onChange={handleChange}
                      className="input-dark pl-12 h-14 text-base"
                      placeholder="e.g. Cambridge International School"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button onClick={handleNext} className="btn-primary py-3 px-6 w-full md:w-auto justify-center">
                      Continue Setup <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Board & Level */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-sm mx-auto"
              >
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6">
                    <Award className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Academic Structure</h3>
                  <p className="text-slate-400 text-sm">Define your educational board curriculum and highest class capacity.</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Affiliated Board</label>
                    <div className="relative">
                      <select
                        name="affiliatedBoard"
                        value={form.affiliatedBoard}
                        onChange={handleChange}
                        className="input-dark h-14 text-base appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="text-slate-500">Select Educational Board</option>
                        {boards.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <Award className="h-5 w-5 text-slate-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Highest Class Level</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <TrendingUp className="h-5 w-5 text-slate-500" />
                      </div>
                      <input
                        type="number"
                        name="classLevel"
                        value={form.classLevel}
                        onChange={handleChange}
                        className="input-dark pl-12 h-14 text-base"
                        placeholder="e.g. 10 or 12"
                        min="1"
                        max="12"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between gap-4">
                    <button onClick={handleBack} className="btn-secondary py-3 px-6 h-14">
                      Back
                    </button>
                    <button onClick={handleNext} className="btn-primary py-3 px-6 h-14 flex-1 justify-center">
                      Continue Setup <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Address */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-sm mx-auto"
              >
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                    <MapPin className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Campus Location</h3>
                  <p className="text-slate-400 text-sm">Where is this institution physically located?</p>
                </div>

                <div className="space-y-5">
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-500" />
                    </div>
                    <textarea
                      name="schoolAddress"
                      value={form.schoolAddress}
                      onChange={handleChange}
                      className="input-dark pl-12 py-4 text-base resize-none"
                      placeholder="Enter full campus address, including city and zip code"
                      rows={5}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between gap-4">
                    <button onClick={handleBack} className="btn-secondary py-3 px-6 h-14">
                      Back
                    </button>
                    <button onClick={handleNext} className="btn-primary py-3 px-6 h-14 flex-1 justify-center">
                      Continue Setup <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Password & Completion */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-sm mx-auto"
              >
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <Lock className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Secure Your Account</h3>
                  <p className="text-slate-400 text-sm">Final step! Create a strong Master Admin password.</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500" />
                      </div>
                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        className="input-dark pl-12 h-14 text-base"
                        placeholder="Admin master password"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500 opacity-50" />
                      </div>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        className="input-dark pl-12 h-14 text-base"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  <div className="pt-6 flex items-center justify-between gap-4">
                    <button onClick={handleBack} className="btn-secondary py-3 px-6 h-14" disabled={loading}>
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary py-3 px-6 h-14 flex-1 justify-center bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/25"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          Initializing...
                        </>
                      ) : (
                        <>Finish Configuration <CheckCircle2 className="w-4 h-4 ml-1" /></>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
