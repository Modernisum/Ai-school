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
    { label: "Leave Management", path: "/dashboard/leave-management", icon: CalendarCheck },
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
    { label: "Referral Coupons", path: "/dashboard/referral-coupons", icon: ClipboardList },
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
  { name: "Subject", icon: BookOpen, path: "/dashboard/subject" },
  { name: "Space", icon: Box, path: "/dashboard/space" },
  { name: "Materials", icon: Layers, path: "/dashboard/materials" },
  { name: "Exam", icon: FileText, path: "/dashboard/exam" },
  { name: "Complaint", icon: AlertCircle, path: "/dashboard/complains" },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Robust active state detection
  const isPathActive = (path) => {
    if (!path) return false;
    const [pathname, search] = path.split('?');
    const isMainPathMatch = location.pathname === pathname;

    if (search) {
      const currentParams = new URLSearchParams(location.search);
      const targetParams = new URLSearchParams(search);
      let paramsMatch = true;
      targetParams.forEach((value, key) => {
        if (currentParams.get(key) !== value) paramsMatch = false;
      });
      return isMainPathMatch && paramsMatch;
    }

    // For main links without search params, they are only active if the pathname matches EXACTLY
    // AND there are no 'add' or 'mark' parameters in the current search.
    const currentParams = new URLSearchParams(location.search);
    const hasSpecialParam = currentParams.has('add') || currentParams.has('mark');
    return isMainPathMatch && !hasSpecialParam;
  };

  const isSectionActive = (path) => {
    if (!path) return false;
    // Match exact path or sub-paths starting with the path followed by a slash (to avoid /employee matching /employeeform)
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isProfileActive = isSectionActive("/dashboard/school-profile");

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 76 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-50 h-screen bg-slate-950 border-r border-white/5 flex flex-col overflow-hidden flex-shrink-0 shadow-2xl"
    >
      {/* Glow Effect */}
      <div className="absolute top-0 -left-20 w-40 h-40 bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-40 h-40 bg-violet-500/10 blur-[100px] pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-20 border-b border-white/[0.03]">
        <AnimatePresence initial={false} mode="wait">
          {sidebarOpen ? (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 overflow-hidden"
              onClick={() => navigate("/dashboard/home")}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                <span className="text-white font-black text-lg tracking-tighter">V</span>
              </div>
              <div className="flex flex-col overflow-hidden cursor-pointer">
                <span className="text-sm font-bold text-white whitespace-nowrap tracking-tight leading-tight">Vidhyam</span>
                <span className="text-[10px] text-indigo-400 whitespace-nowrap leading-tight font-semibold tracking-wider uppercase opacity-80">Management</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20"
              onClick={() => navigate("/dashboard/home")}
            >
              <span className="text-white font-black text-lg">V</span>
            </motion.div>
          )}
        </AnimatePresence>

        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-500 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all group"
          >
            <Menu size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}
      </div>

      {!sidebarOpen && (
        <div className="flex justify-center py-4 border-b border-white/[0.03]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
          >
            <Menu size={18} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          const { name, icon: Icon, path } = item;
          const sectionActive = isSectionActive(path);
          const subs = SUB_LINKS[name];
          const subsExpanded = sidebarOpen && sectionActive && !!subs;

          return (
            <div key={name} className="relative group">
              {/* Main Nav Button */}
              <NavLink
                to={path}
                className={({ isActive }) => `
                  relative flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 group overflow-hidden w-full
                  ${sectionActive
                    ? "bg-gradient-to-r from-indigo-500/15 to-transparent text-indigo-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]"
                  }
                `}
              >
                {sectionActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  />
                )}

                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-transform duration-300 group-hover:scale-110 
                    ${sectionActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`}
                />

                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex-1 flex items-center justify-between overflow-hidden"
                    >
                      <span className={`text-[13px] font-semibold whitespace-nowrap ${sectionActive ? "text-indigo-100" : "text-slate-300"}`}>
                        {name}
                      </span>
                      {subs && (
                        <ChevronRight
                          size={13}
                          className={`transition-transform duration-300 ${subsExpanded ? "rotate-90 text-indigo-400" : "text-slate-600 group-hover:text-slate-400"}`}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {!sidebarOpen && (
                  <div className="absolute left-16 px-2 py-1 bg-slate-800 text-white text-[11px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl border border-white/10">
                    {name}
                  </div>
                )}
              </NavLink>

              {/* Sub-links */}
              <AnimatePresence>
                {subsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 mt-1.5 mb-2 space-y-1 pl-3 border-l-2 border-white/[0.04]">
                      {subs.map((sub) => {
                        const subActive = isPathActive(sub.path);
                        return (
                          <NavLink
                            key={sub.label}
                            to={sub.path}
                            className={`
                              flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-200
                              ${subActive
                                ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                : "text-slate-500 hover:text-white hover:bg-white/[0.03]"
                              }
                            `}
                          >
                            <sub.icon size={12} className={`flex-shrink-0 ${subActive ? "text-indigo-400" : "text-slate-600"}`} />
                            <span className="whitespace-nowrap font-medium tracking-tight">{sub.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* School Profile Button */}
      <div className="p-4 border-t border-white/[0.03] bg-slate-950/50 backdrop-blur-md">
        <button
          onClick={() => navigate("/dashboard/school-profile")}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 group relative
            ${isProfileActive
              ? "bg-gradient-to-r from-orange-500/20 to-transparent text-orange-200"
              : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
            } ${!sidebarOpen ? "justify-center" : ""}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300
            ${isProfileActive
              ? "bg-orange-500/30 shadow-lg shadow-orange-500/20 scale-105"
              : "bg-slate-900 border border-white/[0.05] group-hover:scale-105 group-hover:bg-slate-800"
            }`}>
            <School size={18} className={isProfileActive ? "text-orange-400" : "text-slate-400 group-hover:text-white"} />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col items-start overflow-hidden ml-1"
              >
                <span className="text-sm font-bold whitespace-nowrap leading-tight">School Profile</span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap font-medium tracking-tight group-hover:text-slate-400 transition-colors">Settings & Logout</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
