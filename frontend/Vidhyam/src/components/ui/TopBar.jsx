import {
  Bell, School, ChevronDown,
  LayoutDashboard, Truck, Star, MoreHorizontal,
  Briefcase, Utensils, Plane, Zap, Wrench, Film,
  AlertCircle, Megaphone,
  UserCheck, Box, Layers, ClipboardList,
  Users, UserPlus, Clock, CreditCard,
  IndianRupee, CalendarCheck,
  FileText, CalendarDays, History, CheckCircle, BookOpen, BarChart3, GitMerge, FileCheck,
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

  const tabs = [];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('students')) return 'Students';
    if (path.includes('employees')) return 'Employees';
    if (path.includes('academic')) return 'Academics';
    if (path.includes('infra')) return 'Infrastructure';
    if (path.includes('billing')) return 'Billing';
    if (path.includes('ai')) return 'AI Studio';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('school-profile')) return 'School Profile';
    return 'Vidhyam';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--glass-border)] bg-[var(--bg-topbar)] backdrop-blur-xl">
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
                className="flex items-center gap-0.5 p-0.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)]"
              >
                {tabs.map((tab) => (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                        isActive
                          ? 'bg-[var(--primary-color)] text-white shadow-md'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
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
                className="text-sm font-bold text-[var(--text-main)] tracking-wide"
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
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-[var(--bg-secondary)] transition-all border border-transparent hover:border-[var(--glass-border)]"
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
                    className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-[var(--glass-border)]">
                      <p className="font-semibold text-[var(--text-main)] text-sm">{schoolName}</p>
                      <p className="text-xs text-[var(--text-muted)]">Administrator</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/dashboard/school-profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
                      >
                        <User size={15} /> School Profile
                      </Link>
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
                      >
                        <Settings size={15} /> Settings
                      </Link>
                    </div>
                    <div className="p-2 border-t border-[var(--glass-border)]">
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
