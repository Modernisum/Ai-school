import React, { useState, useEffect } from "react";
import {
  Menu, Home,
  Users, UserCheck, CreditCard, School, Box, Layers,
  AlertCircle, FileText, CalendarCheck, CalendarDays,
  Plus, ChevronRight, UserPlus, ClipboardList,
  Bell, Sparkles, Search, History, Settings, DollarSign, IndianRupee
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Navigation configuration object
const NAV_CONFIG = [
  {
    name: "Student",
    icon: Users,
    path: "/dashboard/student",
    subLinks: [
      { label: "All Students", path: "/dashboard/student/all", icon: Users },
      { label: "Admission", path: "/dashboard/student/add", icon: UserPlus },
    ]
  },
  {
    name: "Employee",
    icon: UserCheck,
    path: "/dashboard/employee",
    subLinks: [
      { label: "All Employees", path: "/dashboard/employee/all", icon: UserCheck },
      { label: "Add Employee", path: "/dashboard/employee/add", icon: UserPlus },
      { label: "Payroll", path: "/dashboard/employee/payroll", icon: CreditCard },
      { label: "Leave", path: "/dashboard/employee/leave", icon: CalendarCheck },
    ]
  },
  {
    name: "Notifications",
    icon: Bell,
    path: "/dashboard/notifications",
    subLinks: [
      { label: "Announcements", path: "/dashboard/announcements", icon: Bell },
      { label: "Complaints", path: "/dashboard/complains", icon: AlertCircle },
    ]
  },
  {
    name: "Finance",
    icon: CreditCard,
    path: "/dashboard/finance",
    subLinks: [
      { label: "Income", path: "/dashboard/finance/income/overview", icon: IndianRupee },
      { label: "Expense", path: "/dashboard/finance/expense/overview", icon: DollarSign },
      { label: "Fees Registry", path: "/dashboard/fees", icon: CreditCard },
      { label: "Referral Coupons", path: "/dashboard/referral-coupons", icon: ClipboardList },
    ]
  },

  {
    name: "Academic",
    icon: School,
    path: "/dashboard/academic",
    subLinks: [
      { label: "Exams", path: "/dashboard/academic/exam", icon: FileText },
      { label: "Events", path: "/dashboard/academic/events", icon: CalendarCheck },
      { label: "Attendance", path: "/dashboard/academic/attendance", icon: CalendarDays },
      { label: "Timetable", path: "/dashboard/academic/timetable", icon: History },
      { label: "Materials", path: "/dashboard/academic/materials", icon: FileText },
    ]
  },
  {
    name: "Infrastructure",
    icon: Box,
    path: "/dashboard/infra",
    subLinks: [
      { label: "Manifest", path: "/dashboard/infra/manifest", icon: Box },
      { label: "Materials", path: "/dashboard/infra/materials", icon: Layers },
      { label: "Protocols", path: "/dashboard/infra/protocols", icon: ClipboardList },
    ]
  },
  {
    name: "AI Studio",
    icon: Sparkles,
    path: "/dashboard/ai-studio"
  },
  {
    name: "Settings",
    icon: Settings,
    path: "/dashboard/settings"
  },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Dynamic width calculation based on screen size
  const getSidebarWidths = () => {
    if (windowWidth >= 1536) return { expanded: 240, collapsed: 64 }; // 2xl
    if (windowWidth >= 1280) return { expanded: 210, collapsed: 60 }; // xl
    if (windowWidth >= 1024) return { expanded: 190, collapsed: 56 }; // lg
    return { expanded: 180, collapsed: 60 }; // md and below
  };

  const { expanded, collapsed } = getSidebarWidths();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      
      // Auto-collapse on smaller screens
      if (width < 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, setSidebarOpen]);

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



  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? expanded : collapsed }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-50 h-screen backdrop-blur-[32px] border-r border-white/5 flex flex-col flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)] overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 -left-20 w-40 h-40 blur-[100px] pointer-events-none opacity-20" style={{ backgroundColor: 'var(--primary-color)' }} />
      <div className="absolute bottom-10 -right-20 w-40 h-40 blur-[100px] pointer-events-none opacity-10" style={{ backgroundColor: 'var(--secondary-color)' }} />

      {/* Logo - Simplified with centered icon */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.03] flex-shrink-0">
        <AnimatePresence initial={false} mode="wait">
          {sidebarOpen ? (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 overflow-hidden"
              onClick={() => navigate("/dashboard/home")}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20 overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600">
                <img 
                  src={localStorage.getItem('schoolLogo') || ""} 
                  alt="S" 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
                <span className="hidden text-white font-black text-sm items-center justify-center">V</span>
              </div>
              <div className="flex flex-col overflow-hidden cursor-pointer max-w-[120px]">
                <span className="text-[calc(13px*var(--scale-factor,1))] font-bold text-white whitespace-nowrap tracking-tight leading-tight truncate">
                  {localStorage.getItem('schoolName') || "Vidhyam Home"}
                </span>
                <span className="text-[calc(9px*var(--scale-factor,1))] whitespace-nowrap leading-tight font-semibold tracking-wider uppercase opacity-70" style={{ color: 'var(--primary-color)' }}>Portal</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="w-8 h-8 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-black/20 overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 cursor-pointer"
              onClick={() => navigate("/dashboard/home")}
            >
              <img 
                src={localStorage.getItem('schoolLogo') || ""} 
                alt="S" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <span className="hidden text-white font-black text-sm items-center justify-center">V</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar toggle button removed per user request */}
      </div>

      {/* Sidebar toggle button removed per user request */}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-0.5 no-scrollbar">
        {NAV_CONFIG.map((item) => {
          const { name, icon: Icon, path, subLinks } = item;
          const sectionActive = isSectionActive(path);
          const subsExpanded = sidebarOpen && sectionActive && !!subLinks;

          return (
            <div key={name} className="relative group">
              {/* Main Nav Button */}
              {item.isAction ? (
                <div
                  onClick={item.onClick}
                  className={`
                    relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all duration-300 group overflow-hidden w-full cursor-pointer
                    text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]
                  `}
                >
                  <Icon
                    size={16}
                    className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110 text-slate-500 group-hover:text-slate-300"
                    style={{ fontSize: 'calc(16px * var(--scale-factor, 1))' }}
                  />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex-1 flex items-center justify-between overflow-hidden"
                      >
                        <span className="text-[12px] font-semibold whitespace-nowrap text-slate-300">
                          {name}
                        </span>
                        <div className="text-[9px] text-slate-600 font-mono">⌘K</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <NavLink
                  to={path}
                  className={({ isActive }) => `
                    relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all duration-300 group overflow-hidden w-full
                    ${sectionActive
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]"
                    }
                  `}
                >
                  {sectionActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full shadow-lg"
                      style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 0 8px var(--primary-glow)' }}
                    />
                  )}

                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
                    style={sectionActive ? { color: 'var(--primary-color)', fontSize: 'calc(18px * var(--scale-factor, 1))' } : { fontSize: 'calc(18px * var(--scale-factor, 1))' }}
                  />

                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex-1 flex items-center justify-between overflow-hidden"
                      >
                        <span className={`text-[calc(13px*var(--scale-factor,1))] font-semibold whitespace-nowrap ${sectionActive ? "text-white" : "text-slate-300"}`}>
                          {name}
                        </span>
                        {subLinks && (
                          <ChevronRight
                            size={13}
                            className={`transition-transform duration-300 ${subsExpanded ? "rotate-90" : "text-slate-600 group-hover:text-slate-400"}`}
                            style={subsExpanded ? { color: 'var(--primary-color)' } : {}}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tooltip for collapsed state */}
                  {!sidebarOpen && (
                    <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 pointer-events-none transition-all duration-200 whitespace-nowrap z-[100] shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-2">
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-white/10 rotate-45" />
                      {name}
                    </div>
                  )}
                </NavLink>
              )}

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
                    <div className="ml-1.5 mt-1 mb-1.5 space-y-0.5 pl-2.5 border-l border-white/[0.04]">
                      {subLinks.map((sub) => {
                        const subActive = isPathActive(sub.path);
                        return (
                          <NavLink
                            key={sub.label}
                            to={sub.path}
                            className={`
                              flex items-center gap-2.5 px-2 py-2 rounded-lg text-[11px] transition-all duration-200
                              ${subActive
                                ? "text-primary font-bold"
                                : "text-slate-500 hover:text-white hover:bg-white/[0.02]"
                              }
                            `}
                          >
                            <sub.icon size={11} className={`flex-shrink-0 ${subActive ? "text-primary" : "text-slate-600"}`} style={{ fontSize: 'calc(11px * var(--scale-factor, 1))' }} />
                            <span className="whitespace-nowrap font-medium tracking-tight text-[calc(11px*var(--scale-factor,1))]">{sub.label}</span>
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

      {/* Bottom section */}
      <div className="mt-auto border-t border-white/[0.03] p-3">
      </div>

    </motion.aside>
  );
}
