import React from "react";
import {
  Menu, Home,
  Users, UserCheck, CreditCard, School, Box, Layers,
  BookOpen, AlertCircle, FileText, CalendarCheck,
  Plus, ChevronRight, UserPlus, ClipboardList,
  BookPlus, Bell
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Sub-links for each nav section — these are always visible when the section is active
const SUB_LINKS = {
  Student: [
    { label: "All Students", path: "/dashboard/student", icon: Users },
    { label: "Add Student", path: "/dashboard/student?add=1", icon: UserPlus },
  ],
  Employee: [
    { label: "All Employees", path: "/dashboard/employee", icon: UserCheck },
    { label: "Add Employee", path: "/dashboard/employee?add=1", icon: UserPlus },
  ],
  Class: [
    { label: "All Classes", path: "/dashboard/class", icon: School },
    { label: "Add Class", path: "/dashboard/class?add=1", icon: Plus },
  ],
  Subject: [
    { label: "All Subjects", path: "/dashboard/subject", icon: BookOpen },
    { label: "Add Subject", path: "/dashboard/subject?add=1", icon: BookPlus },
  ],
  Space: [
    { label: "All Spaces", path: "/dashboard/space", icon: Box },
    { label: "Add Space", path: "/dashboard/space?add=1", icon: Plus },
  ],
  Materials: [
    { label: "All Materials", path: "/dashboard/materials", icon: Layers },
    { label: "Add Material", path: "/dashboard/materials?add=1", icon: Plus },
  ],
  Exam: [
    { label: "All Exams", path: "/dashboard/exam", icon: FileText },
    { label: "Add Exam", path: "/dashboard/exam?add=1", icon: Plus },
  ],
  Fees: [
    { label: "Fee Records", path: "/dashboard/fees", icon: CreditCard },
    { label: "Record Fee", path: "/dashboard/fees?add=1", icon: Plus },
  ],
  Attendance: [
    { label: "View Attendance", path: "/dashboard/attendance", icon: CalendarCheck },
    { label: "Mark Attendance", path: "/dashboard/attendance?mark=1", icon: ClipboardList },
  ],
};

const menuItems = [
  { name: "Home", icon: Home, path: "/dashboard/home" },
  { name: "Student", icon: Users, path: "/dashboard/student" },
  { name: "Employee", icon: UserCheck, path: "/dashboard/employee" },
  { name: "Announcements", icon: Bell, path: "/dashboard/announcements" },
  { name: "Fees", icon: CreditCard, path: "/dashboard/fees" },
  { name: "Class", icon: School, path: "/dashboard/class" },
  { name: "Subject", icon: BookOpen, path: "/dashboard/subject" },
  { name: "Space", icon: Box, path: "/dashboard/space" },
  { name: "Materials", icon: Layers, path: "/dashboard/materials" },
  { name: "Exam", icon: FileText, path: "/dashboard/exam" },
  { name: "Complaint", icon: AlertCircle, path: "/dashboard/complains" },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  // A nav item is "active" if current path starts with item's path
  const isSectionActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "?") || location.pathname.startsWith(path + "/");

  const isProfileActive = isSectionActive("/dashboard/school-profile");

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
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-white whitespace-nowrap tracking-wide leading-tight">Vidhyam</span>
                <span className="text-[10px] text-indigo-400 whitespace-nowrap leading-tight font-medium tracking-wide">School Operations</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarOpen && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">V</span>
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
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-0.5 pb-4">
        {menuItems.map((item) => {
          const { name, icon: Icon, path } = item;
          const active = isSectionActive(path);
          const subs = SUB_LINKS[name];
          // Sub-nav is expanded when: sidebar is open AND this section is active
          const subsExpanded = sidebarOpen && active && !!subs;

          return (
            <div key={name}>
              {/* Main Nav Button — always navigates to the page */}
              <NavLink
                to={path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden w-full
                  ${active
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                  }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-bar"
                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-400 rounded-r-full"
                  />
                )}
                <Icon size={18} className={`flex-shrink-0 ${active ? "text-indigo-400" : ""}`} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap flex-1"
                    >
                      {name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Chevron shows when sidebar is open and item has sub-links */}
                {sidebarOpen && subs && (
                  <motion.div
                    animate={{ rotate: subsExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronRight size={13} className="text-slate-600" />
                  </motion.div>
                )}
              </NavLink>

              {/* Sub-links — auto expand when section is active, collapse when inactive */}
              <AnimatePresence>
                {subsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="ml-7 mt-0.5 mb-1 space-y-0.5 pl-3 border-l border-white/[0.06]">
                      {subs.map((sub) => (
                        <NavLink
                          key={sub.label}
                          to={sub.path}
                          className={({ isActive: sa }) =>
                            `flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all
                            ${sa
                              ? "bg-indigo-500/15 text-indigo-300"
                              : "text-slate-500 hover:text-white hover:bg-white/5"
                            }`
                          }
                        >
                          <sub.icon size={13} className="flex-shrink-0 text-indigo-400" />
                          <span className="whitespace-nowrap font-medium">{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* School Profile Button */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => navigate("/dashboard/school-profile")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
            ${isProfileActive
              ? "bg-orange-500/20 text-orange-300"
              : "text-slate-400 hover:text-white hover:bg-white/5"
            } ${!sidebarOpen ? "justify-center" : ""}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-2 transition-all
            ${isProfileActive
              ? "bg-orange-500/30 ring-orange-500/50"
              : "bg-slate-800 ring-slate-700 group-hover:ring-indigo-500/50"
            }`}>
            <School size={16} className={isProfileActive ? "text-orange-400" : "text-slate-400 group-hover:text-white"} />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-start overflow-hidden"
              >
                <span className="text-sm font-semibold whitespace-nowrap leading-tight">Account</span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap leading-tight">Settings & Sign Out</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
