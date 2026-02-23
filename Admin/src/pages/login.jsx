// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function AuthPage() {
  const [form, setForm] = useState({ schoolId: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
        navigate("/dashboard");
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
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4"
            >
              <span className="text-2xl font-bold text-white tracking-widest">MS</span>
            </motion.div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-sm font-medium text-slate-400 mt-2">
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
          </form>

        </div>
      </motion.div>
    </div>
  );
}
