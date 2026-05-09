import {
  Bell, School, ChevronDown,
  LayoutDashboard, Truck, Star, MoreHorizontal,
  Briefcase, Utensils, Plane, Zap, Wrench, Film,
  AlertCircle, Megaphone,
  UserCheck, Box, Layers, ClipboardList,
  Users, UserPlus, Clock, CreditCard,
  IndianRupee, CalendarCheck,
  FileText, CalendarDays, History,
  Settings, LogOut, User
} from "lucide-react";
import { SimpleThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import NotificationBell from "./NotificationBell";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import GlobalSearchSelect from "./GlobalSearchSelect";

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [schoolName, setSchoolName] = useState("School");

  const profileRef = useRef(null);

  useEffect(() => {
    const data = localStorage.getItem("schoolData");
    if (data) {
      try {
        const p = JSON.parse(data);
        if (p.name) setSchoolName(p.name);
      } catch { /* ignore */ }
    }
  }, []);

  const getModuleTabs = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/notifications')) {
      return [
        { label: 'Announcements', path: '/dashboard/notifications/announcements', icon: Megaphone },
        { label: 'Attendance', path: '/dashboard/notifications/attendance', icon: UserCheck },
        { label: 'Complaints', path: '/dashboard/notifications/complains', icon: AlertCircle },
      ];
    }
    if (path.includes('/dashboard/infra')) {
      return [
        { label: "Manifest", path: "/dashboard/infra/manifest", icon: Box },
        { label: "Materials", path: "/dashboard/infra/materials", icon: Layers },
        { label: "Protocols", path: "/dashboard/infra/protocols", icon: ClipboardList },
      ];
    }
    if (path.includes('/dashboard/student')) {
      return [
        { label: "All Students", path: "/dashboard/student/all", icon: Users },
        { label: "Admission", path: "/dashboard/student/add", icon: UserPlus },
        { label: "Leave", path: "/dashboard/student/leave", icon: Clock },
        { label: "Attendance", path: "/dashboard/student/attendance", icon: Clock },
        { label: "Fees", path: "/dashboard/student/fees", icon: CreditCard },
      ];
    }
    if (path.includes('/dashboard/employee')) {
      return [
        { label: "All", path: "/dashboard/employee/all", icon: UserCheck },
        { label: "Salary", path: "/dashboard/employee/salary", icon: IndianRupee },
        { label: "Payroll", path: "/dashboard/employee/payroll", icon: CreditCard },
        { label: "Leave", path: "/dashboard/employee/leave", icon: CalendarCheck },
      ];
    }
    if (path.includes('/dashboard/academic')) {
      return [
        { label: "Exams", path: "/dashboard/academic/exam", icon: FileText },
        { label: "Events", path: "/dashboard/academic/events", icon: CalendarCheck },
        { label: "Attendance", path: "/dashboard/academic/attendance", icon: CalendarDays },
        { label: "Timetable", path: "/dashboard/academic/timetable", icon: History },
      ];
    }
    if (path.includes('/dashboard/finance')) {
      if (path.includes('/finance/expense')) {
        return [
          { label: 'Overview', path: '/dashboard/finance/expense/overview', icon: LayoutDashboard },
          { label: 'Salary', path: '/dashboard/finance/expense/salary', icon: Briefcase },
          { label: 'Infra', path: '/dashboard/finance/expense/infra', icon: Box },
          { label: 'Food', path: '/dashboard/finance/expense/food', icon: Utensils },
          { label: 'Travel', path: '/dashboard/finance/expense/travel', icon: Plane },
          { label: 'Utilities', path: '/dashboard/finance/expense/utilities', icon: Zap },
          { label: 'Maintenance', path: '/dashboard/finance/expense/maintenance', icon: Wrench },
          { label: 'Entertainment', path: '/dashboard/finance/expense/entertainment', icon: Film },
          { label: 'Transport', path: '/dashboard/finance/expense/transport', icon: Truck },
          { label: 'Events', path: '/dashboard/finance/expense/events', icon: Star },
        ];
      }
      return [
        { label: 'Overview', path: '/dashboard/finance/income/overview', icon: LayoutDashboard },
        { label: 'Fees', path: '/dashboard/finance/income/fees', icon: CreditCard },
        { label: 'Admission', path: '/dashboard/finance/income/admission', icon: UserPlus },
        { label: 'Transport', path: '/dashboard/finance/income/transport', icon: Truck },
        { label: 'Events', path: '/dashboard/finance/income/events', icon: Star },
        { label: 'Other', path: '/dashboard/finance/income/other', icon: MoreHorizontal },
      ];
    }
    return [];
  };

  const tabs = getModuleTabs();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/notifications')) return 'Notifications';
    if (path.startsWith('/dashboard/home')) return 'Dashboard';
    if (path.startsWith('/dashboard/student')) return 'Students';
    if (path.startsWith('/dashboard/employee')) return 'Employees';
    if (path.startsWith('/dashboard/finance')) return 'Finance';
    if (path.startsWith('/dashboard/academic')) return 'Academic';
    if (path.startsWith('/dashboard/infra')) return 'Infrastructure';
    if (path.startsWith('/dashboard/ai-studio')) return 'AI Studio';
    if (path.startsWith('/dashboard/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.04] bg-[rgba(3,7,18,0.85)] backdrop-blur-xl">
      <div className="flex items-center justify-between h-12 px-4">
        {/* Left */}
        <div className="flex items-center gap-3 flex-1">
          <MobileNav />
        </div>

        {/* Center — page title or module tabs */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
          <AnimatePresence mode="wait">
            {tabs.length > 0 ? (
              <motion.div
                key="tabs"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                {tabs.map((tab) => (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                        isActive
                          ? 'bg-[var(--primary-color)] text-white shadow-md shadow-primary/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`
                    }
                  >
                    {tab.icon && <tab.icon size={13} />}
                    <span className="hidden xl:inline">{tab.label}</span>
                  </NavLink>
                ))}
              </motion.div>
            ) : (
              <motion.h1
                key="title"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm font-bold text-white tracking-wide"
              >
                {getPageTitle()}
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        {/* Right — actions */}
        <div className="flex items-center justify-end gap-1 flex-1">
          <SimpleThemeToggle />

          {/* Notifications — Centralized */}
          <NotificationBell />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <School size={14} className="text-white" />
              </div>
              <ChevronDown size={12} className={`text-slate-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-white/5">
                      <p className="font-semibold text-white text-sm">{schoolName}</p>
                      <p className="text-xs text-slate-500">Administrator</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/dashboard/school-profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <User size={15} /> School Profile
                      </Link>
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Settings size={15} /> Settings
                      </Link>
                    </div>
                    <div className="p-2 border-t border-white/5">
                      <button
                        onClick={() => { localStorage.clear(); navigate("/"); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <GlobalSearchSelect onExpandChange={setIsSearchExpanded} />
          </div>
        </div>
      </div>
    </header>
  );
}
