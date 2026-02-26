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
  AlertCircle,
  Globe,
  Hash,
  Users,
  Calendar,
  Plus,
  X
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE_URL + "/setup/school";

const CLASS_LEVELS = [
  { label: "Primary (Up to Class 5)", value: 5, description: "Pre-Nursery to Class 5" },
  { label: "Junior (Up to Class 8)", value: 8, description: "Pre-Nursery to Class 8" },
  { label: "High School (Up to Class 10)", value: 10, description: "Pre-Nursery to Class 10" },
  { label: "Intermediate (Up to Class 12)", value: 12, description: "Pre-Nursery to Class 12" },
];

const BOARDS = ["CBSE", "ICSE", "State Board (UP)", "State Board (MP)", "State Board (Rajasthan)", "State Board (Maharashtra)", "State Board (Bihar)", "NIOS", "IB", "Cambridge (IGCSE)"];
const MEDIUMS = ["Hindi Medium", "English Medium", "Bilingual (Hindi + English)", "Urdu Medium", "Other"];

export default function SchoolSetup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    schoolName: "",
    affiliatedBoard: "",
    affiliationNumber: "",
    medium: "",
    classLevel: "",
    sinceEstablished: "",
    directors: [""],     // Array of director names
    schoolAddress: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDirectorChange = (index, value) => {
    const updated = [...form.directors];
    updated[index] = value;
    setForm({ ...form, directors: updated });
  };

  const addDirector = () => {
    if (form.directors.length < 5) {
      setForm({ ...form, directors: [...form.directors, ""] });
    }
  };

  const removeDirector = (index) => {
    const updated = form.directors.filter((_, i) => i !== index);
    setForm({ ...form, directors: updated.length ? updated : [""] });
  };

  const validateStep = (currentStep) => {
    setError("");
    if (currentStep === 1 && !form.schoolName.trim()) {
      setError("Please enter your school's name");
      return false;
    }
    if (currentStep === 2 && (!form.affiliatedBoard || !form.classLevel || !form.medium)) {
      setError("Please fill in all required fields (Board, Medium, and Class Level)");
      return false;
    }
    if (currentStep === 3 && !form.schoolAddress.trim()) {
      setError("Please enter the school address");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) { setStep(step - 1); setError(""); }
  };

  const handleSubmit = async () => {
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters long"); return; }

    setLoading(true);
    setError("");

    try {
      const selectedLevel = CLASS_LEVELS.find(l => l.value === parseInt(form.classLevel));
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: form.schoolName,
          schoolAddress: form.schoolAddress,
          classLevel: parseInt(form.classLevel),
          classLevelLabel: selectedLevel?.label || "",
          affiliatedBoard: form.affiliatedBoard,
          affiliationNumber: form.affiliationNumber,
          medium: form.medium,
          sinceEstablished: form.sinceEstablished,
          directors: form.directors.filter(d => d.trim()),
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
      localStorage.setItem("boardName", form.affiliatedBoard);
      localStorage.setItem("medium", form.medium);
      localStorage.setItem("maxClassLevel", form.classLevel);

      if (schoolId) localStorage.setItem("schoolId", schoolId);
      if (resData.accessToken) localStorage.setItem("accessToken", resData.accessToken);

      setTimeout(() => { window.location.href = "/dashboard/home"; }, 800);
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  const fadeInVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  };

  const ErrorBox = ({ msg }) => msg ? (
    <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <p>{msg}</p>
    </div>
  ) : null;

  const stepsConfig = [
    { num: 1, label: "Institution Identity" },
    { num: 2, label: "Academic Structure" },
    { num: 3, label: "Campus Location" },
    { num: 4, label: "Security Setup" },
  ];

  return (
    <div className="page-bg flex justify-center items-center p-6 relative overflow-hidden">
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
        {/* Left Side: Branding & Stepper */}
        <div className="w-full md:w-5/12 bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <School className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">Vidhyam</h1>
            </div>
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
                Establish your <br />
                <span className="text-gradient">digital campus.</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mt-4">
                Configure your institution's core details to build a tailored administrative environment.
              </p>
            </div>
          </div>
          <div className="relative z-10 mt-12 hidden md:block">
            <div className="space-y-6">
              {stepsConfig.map((s) => (
                <div key={s.num} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${step > s.num ? "bg-indigo-500 border-indigo-500 text-white" : step === s.num ? "bg-indigo-500/20 border-indigo-400 text-indigo-300" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                    {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-semibold">{s.num}</span>}
                  </div>
                  <span className={`text-sm font-medium transition-colors duration-300 ${step >= s.num ? "text-slate-200" : "text-slate-500"}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-center bg-slate-900/40 relative overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* STEP 1: School Identity */}
            {step === 1 && (
              <motion.div key="step1" variants={fadeInVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-sm mx-auto">
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Institution Identity</h3>
                  <p className="text-slate-400 text-sm">Enter the official name and director details of your institution.</p>
                </div>

                <div className="space-y-4">
                  {/* School Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">School Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><School className="h-5 w-5 text-slate-500" /></div>
                      <input type="text" name="schoolName" value={form.schoolName} onChange={handleChange} className="input-dark pl-12 h-14 text-base" placeholder="e.g. Vidhyam Public School" autoFocus />
                    </div>
                  </div>

                  {/* Established Year */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Since Established</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-slate-500" /></div>
                      <input type="number" name="sinceEstablished" value={form.sinceEstablished} onChange={handleChange} className="input-dark pl-12 h-14 text-base" placeholder="e.g. 1998" min="1800" max="2025" />
                    </div>
                  </div>

                  {/* Directors */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1 mb-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Director(s)</label>
                      {form.directors.length < 5 && (
                        <button type="button" onClick={addDirector} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Add Director
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {form.directors.map((director, idx) => (
                        <div key={idx} className="relative flex items-center gap-2">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Users className="h-4 w-4 text-slate-500" /></div>
                          <input
                            type="text"
                            value={director}
                            onChange={e => handleDirectorChange(idx, e.target.value)}
                            className="input-dark pl-10 h-12 text-sm flex-1"
                            placeholder={`Director ${idx + 1} name`}
                          />
                          {form.directors.length > 1 && (
                            <button type="button" onClick={() => removeDirector(idx)} className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <ErrorBox msg={error} />

                  <div className="pt-4 flex justify-end">
                    <button onClick={handleNext} className="btn-primary py-3 px-6 w-full md:w-auto justify-center">
                      Continue Setup <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Academic Structure */}
            {step === 2 && (
              <motion.div key="step2" variants={fadeInVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-sm mx-auto">
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-5">
                    <Award className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Academic Structure</h3>
                  <p className="text-slate-400 text-sm">Board affiliation, medium of instruction, and class level.</p>
                </div>

                <div className="space-y-4">
                  {/* Affiliated Board */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Affiliated Board *</label>
                    <div className="relative">
                      <select name="affiliatedBoard" value={form.affiliatedBoard} onChange={handleChange} className="input-dark h-12 text-sm appearance-none cursor-pointer">
                        <option value="" disabled>Select Educational Board</option>
                        {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Award className="h-4 w-4 text-slate-500" /></div>
                    </div>
                  </div>

                  {/* Affiliation Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Affiliation Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Hash className="h-4 w-4 text-slate-500" /></div>
                      <input type="text" name="affiliationNumber" value={form.affiliationNumber} onChange={handleChange} className="input-dark pl-10 h-12 text-sm" placeholder="e.g. 2110001" />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Medium of Instruction *</label>
                    <div className="relative">
                      <select name="medium" value={form.medium} onChange={handleChange} className="input-dark h-12 text-sm appearance-none cursor-pointer">
                        <option value="" disabled>Select Medium</option>
                        {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Globe className="h-4 w-4 text-slate-500" /></div>
                    </div>
                  </div>

                  {/* Class Level */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Class Level *</label>
                    <div className="relative">
                      <select name="classLevel" value={form.classLevel} onChange={handleChange} className="input-dark h-12 text-sm appearance-none cursor-pointer">
                        <option value="" disabled>Select Highest Class Level</option>
                        {CLASS_LEVELS.map(l => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><TrendingUp className="h-4 w-4 text-slate-500" /></div>
                    </div>
                    {form.classLevel && (
                      <p className="text-xs text-indigo-400 ml-1">
                        {CLASS_LEVELS.find(l => l.value === parseInt(form.classLevel))?.description}
                      </p>
                    )}
                  </div>

                  <ErrorBox msg={error} />

                  <div className="pt-4 flex items-center justify-between gap-4">
                    <button onClick={handleBack} className="btn-secondary py-3 px-6 h-12">Back</button>
                    <button onClick={handleNext} className="btn-primary py-3 px-6 h-12 flex-1 justify-center">Continue Setup <ArrowRight className="w-4 h-4 ml-1" /></button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Address */}
            {step === 3 && (
              <motion.div key="step3" variants={fadeInVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-sm mx-auto">
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                    <MapPin className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Campus Location</h3>
                  <p className="text-slate-400 text-sm">Where is this institution physically located?</p>
                </div>
                <div className="space-y-5">
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none"><MapPin className="h-5 w-5 text-slate-500" /></div>
                    <textarea name="schoolAddress" value={form.schoolAddress} onChange={handleChange} className="input-dark pl-12 py-4 text-base resize-none" placeholder="Enter full campus address, including city and pin code" rows={5} />
                  </div>
                  <ErrorBox msg={error} />
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <button onClick={handleBack} className="btn-secondary py-3 px-6 h-14">Back</button>
                    <button onClick={handleNext} className="btn-primary py-3 px-6 h-14 flex-1 justify-center">Continue Setup <ArrowRight className="w-4 h-4 ml-1" /></button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Password */}
            {step === 4 && (
              <motion.div key="step4" variants={fadeInVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-sm mx-auto">
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
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-500" /></div>
                      <input type="password" name="password" value={form.password} onChange={handleChange} className="input-dark pl-12 h-14 text-base" placeholder="Admin master password" />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-500 opacity-50" /></div>
                      <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="input-dark pl-12 h-14 text-base" placeholder="Confirm password" />
                    </div>
                  </div>
                  <ErrorBox msg={error} />
                  <div className="pt-6 flex items-center justify-between gap-4">
                    <button onClick={handleBack} className="btn-secondary py-3 px-6 h-14" disabled={loading}>Back</button>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary py-3 px-6 h-14 flex-1 justify-center bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/25">
                      {loading ? (
                        <><svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>Initializing...</>
                      ) : (<>Finish Configuration <CheckCircle2 className="w-4 h-4 ml-1" /></>)}
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
