import React from "react";
import {
  Menu, Home, BarChart2, Settings, LogOut, Plus,
  Users, UserCheck, CreditCard, School, Box, Layers,
  BookOpen, AlertCircle, FileText, CalendarCheck
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Home", icon: Home, path: "/dashboard/home" },
    { name: "Student", icon: Users, path: "/dashboard/student" },
    { name: "Employee", icon: UserCheck, path: "/dashboard/employee" },
    { name: "Fees", icon: CreditCard, path: "/dashboard/fees" },
    { name: "Class", icon: School, path: "/dashboard/class" },
    { name: "Subject", icon: BookOpen, path: "/dashboard/subject" },
    { name: "Space", icon: Box, path: "/dashboard/space" },
    { name: "Materials", icon: Layers, path: "/dashboard/materials" },
    { name: "Attendance", icon: CalendarCheck, path: "/dashboard/attendance" },
    { name: "Exam", icon: FileText, path: "/dashboard/exam" },
    { name: "Complaint", icon: AlertCircle, path: "/dashboard/complains" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("schoolId");
    navigate("/");
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-50 h-screen bg-slate-950 border-r border-white/5 flex flex-col overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/5">
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">MS</span>
              </div>
              <span className="text-sm font-bold text-white whitespace-nowrap tracking-wide">
                ModernSchool
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarOpen && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">MS</span>
          </div>
        )}

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ml-auto text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
        >
          <Menu size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 pb-20">
        {menuItems.map(({ name, icon: Icon, path }) => (
          <NavLink
            key={name}
            to={path}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden
              ${isActive
                ? "bg-indigo-500/20 text-indigo-300"
                : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-bar"
                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-400 rounded-r-full"
                  />
                )}
                <Icon size={18} className={`flex-shrink-0 ${isActive ? "text-indigo-400" : ""}`} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 w-full p-3 border-t border-white/5 bg-slate-950">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all ${!sidebarOpen && "justify-center"}`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-semibold whitespace-nowrap"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
