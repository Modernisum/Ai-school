// EditStudentForm.jsx - Premium form for looking up and editing students
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Search, User, ArrowRight, Loader, Shield, Hash, SearchCode } from "lucide-react";

export default function EditStudentForm() {
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEditStudent = () => {
    if (studentId.trim()) {
      setIsLoading(true);
      // Simulate/Show loading for better UX before navigation
      setTimeout(() => {
        navigate(`/dashboard/student/addstudent?mode=edit&studentId=${studentId.trim().toUpperCase()}`);
      }, 600);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && studentId.trim()) {
      handleEditStudent();
    }
  };

  return (
    <div className="relative group overflow-hidden glass-card rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 border border-white/5 hover:border-emerald-500/30">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
            <Edit className="text-emerald-400" size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Edit Student</h2>
            <p className="text-sm text-slate-500">Update existing academic records</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
              <Hash size={12} className="text-emerald-500" />
              Student Unique ID
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Search size={18} />
              </div>
              <input 
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter Student ID (e.g. S000001)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300 font-mono"
              />
            </div>
          </div>

          <button 
            onClick={handleEditStudent}
            disabled={!studentId.trim() || isLoading}
            className="w-full relative overflow-hidden group/btn px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-emerald-900/20 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader size={20} className="animate-spin" />
                  <span>Searching...</span>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <SearchCode size={20} className="group-hover/btn:scale-110 transition-transform" />
                  <span>Fetch Record</span>
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="mt-8 flex items-start gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <Shield size={16} className="text-emerald-500 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Verify the <span className="text-emerald-400 font-semibold">Student ID</span> carefully. Editing allows modification of personal details, subjects, and fee structures.
          </p>
        </div>
      </div>
    </div>
  );
}
