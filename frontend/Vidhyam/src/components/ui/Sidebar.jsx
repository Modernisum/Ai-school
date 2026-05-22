import React, { useState, useEffect } from "react";
import {
  Home, X, ChevronRight, Sparkles, Settings,
  Users, UserCheck, CreditCard, School, Box, Layers,
  AlertCircle, FileText, CalendarCheck, CalendarDays,
  UserPlus, ClipboardList, DollarSign, IndianRupee,
  Megaphone, History, Bot, Palette, CheckCircle, BookOpen, BarChart3, GitMerge, FileCheck,
  User, LogOut, Briefcase
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMobile } from "../../hooks/useMobile";
import { useSelector } from "react-redux";
import { selectTheme } from "../../features/settings/settingsSlice";
import { SimpleThemeToggle } from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

const NAV_CONFIG = [
  {
    section: "CORE",
    items: [
      {
        name: "Dashboard",
        icon: Home,
        path: "/dashboard/home",
      },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      {
        name: "Students",
        icon: Users,
        path: "/dashboard/student",
        subLinks: [
          { label: "All Students", path: "/dashboard/student/all", icon: Users },
          { label: "Admission", path: "/dashboard/student/add", icon: UserPlus },
          { label: "Form Fill", path: "/dashboard/student/form-fill", icon: FileCheck },
        ],
      },
      {
        name: "Employees",
        icon: UserCheck,
        path: "/dashboard/employee",
        subLinks: [
          { label: "All Employees", path: "/dashboard/employee/all", icon: UserCheck },
          { label: "Add Employee", path: "/dashboard/employee/add", icon: UserPlus },
          { label: "Payroll", path: "/dashboard/employee/payroll", icon: CreditCard },
          { label: "Leave", path: "/dashboard/employee/leave", icon: CalendarCheck },
        ],
      },
      {
        name: "Academic",
        icon: School,
        path: "/dashboard/academic",
        subLinks: [
          { label: "Exams", path: "/dashboard/academic/exam", icon: FileText },
          { label: "Exam Approval", path: "/dashboard/academic/teacher-approval", icon: CheckCircle },
          { label: "Syllabus Planner", path: "/dashboard/academic/syllabus-planner", icon: BookOpen },
          { label: "Period Plans", path: "/dashboard/academic/period-plans", icon: BarChart3 },
          { label: "Change Approvals", path: "/dashboard/academic/change-approval", icon: GitMerge },
          { label: "Events", path: "/dashboard/academic/events", icon: CalendarCheck },
          { label: "Attendance", path: "/dashboard/academic/attendance", icon: CalendarDays },
          { label: "Timetable", path: "/dashboard/academic/timetable", icon: History },
        ],
      },
      {
        name: "Finance",
        icon: IndianRupee,
        path: "/dashboard/finance",
        subLinks: [
          { label: "Income", path: "/dashboard/finance/income/overview", icon: IndianRupee },
          { label: "Expense", path: "/dashboard/finance/expense/overview", icon: DollarSign },
          { label: "Fees", path: "/dashboard/fees", icon: CreditCard },
          { label: "Referrals", path: "/dashboard/referral-coupons", icon: ClipboardList },
        ],
      },
      {
        name: "Infrastructure",
        icon: Box,
        path: "/dashboard/infra",
        subLinks: [
          { label: "Spaces", path: "/dashboard/infra/spaces", icon: Box },
          { label: "Materials", path: "/dashboard/infra/materials", icon: Layers },
          { label: "Responsibilities", path: "/dashboard/infra/responsibilities", icon: Briefcase },
        ],
      },
    ],
  },
  {
    section: "PLATFORM",
    items: [
      {
        name: "AI Studio",
        icon: Bot,
        path: "/dashboard/ai-studio",
        badge: "NEW",
      },
      {
        name: "School Profile",
        icon: User,
        path: "/dashboard/school-profile",
      },
      {
        name: "Settings",
        icon: Settings,
        path: "/dashboard/settings",
      },
    ],
  },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, width: windowWidth } = useMobile();

  const getSidebarWidths = () => {
    if (windowWidth >= 1536) return { expanded: 240, collapsed: 64 };
    if (windowWidth >= 1280) return { expanded: 220, collapsed: 60 };
    if (windowWidth >= 1024) return { expanded: 200, collapsed: 56 };
    return { expanded: 180, collapsed: 56 };
  };

  const { expanded, collapsed } = getSidebarWidths();

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      const handleOutside = (e) => {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(e.target)) setSidebarOpen(false);
      };
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
      window.addEventListener('popstate', () => setSidebarOpen(false));
      return () => {
        document.removeEventListener('mousedown', handleOutside);
        document.removeEventListener('touchstart', handleOutside);
        window.removeEventListener('popstate', () => setSidebarOpen(false));
      };
    }
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    if (windowWidth < 1024 && sidebarOpen) setSidebarOpen(false);
  }, [windowWidth]);

  const isSectionActive = (path) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isSubActive = (path) => {
    if (!path) return false;
    const [pathname] = path.split('?');
    return location.pathname === pathname;
  };

  return (
    <>
      {isMobile && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? expanded : collapsed,
          x: isMobile && !sidebarOpen ? -expanded : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sidebar-container relative z-50 h-screen flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          background: 'var(--bg-sidebar)',
          backdropFilter: 'blur(var(--glass-blur, 24px))',
          borderRight: '1px solid var(--glass-border)',
          boxShadow: 'var(--panel-shadow)',
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 -left-10 w-32 h-32 rounded-full blur-[80px] pointer-events-none opacity-20" style={{ background: 'var(--primary-color)' }} />

        {/* ── Logo ── */}
        <div className="flex items-center h-14 px-3 border-b border-white/[0.04] flex-shrink-0">
          <AnimatePresence initial={false} mode="wait">
            {sidebarOpen ? (
              <motion.div
                key="logo-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate("/dashboard/home")}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
                  <span className="text-white font-black text-sm">V</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white leading-tight truncate">
                    {localStorage.getItem('schoolName') || "Vidhyam"}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-widest opacity-60" style={{ color: 'var(--primary-color)' }}>Portal</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 cursor-pointer"
                onClick={() => navigate("/dashboard/home")}
              >
                <span className="text-white font-black text-sm">V</span>
              </motion.div>
            )}
          </AnimatePresence>

          {sidebarOpen && (
            <div className="flex-shrink-0 mr-1.5">
              <NotificationBell sidebarOpen={true} compact={true} />
            </div>
          )}

          {isMobile && sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 ml-1">
              <X size={18} />
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <ChevronRight size={14} className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-4 no-scrollbar">
          {/* Notification Bell when collapsed */}
          {!sidebarOpen && (
            <div className="relative group/sidebar mb-2">
              <NotificationBell sidebarOpen={false} compact={true} />
            </div>
          )}

          {NAV_CONFIG.map((group) => (
            <div key={group.section}>
              {sidebarOpen && (
                <div className="px-2.5 mb-1">
                  <span className="text-[9px] font-black text-[var(--text-muted)] opacity-60 tracking-[0.15em] uppercase">{group.section}</span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const { name, icon: Icon, path, subLinks, badge } = item;
                  const active = isSectionActive(path);
                  const subsExpanded = sidebarOpen && active && !!subLinks;

                  return (
                    <div key={name} className="relative group/sidebar">
                      <NavLink
                        to={path}
                        className={`
                          relative flex items-center gap-2.5 rounded-xl transition-all duration-200 overflow-hidden border border-transparent
                          ${active
                            ? 'sidebar-item-active font-semibold'
                            : 'sidebar-item-inactive'
                          }
                          ${sidebarOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
                        `}
                      >
                        {active && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-xl sidebar-active-bg"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <Icon size={18} className={`relative flex-shrink-0 transition-colors ${active ? 'text-[var(--primary-color)]' : ''}`} />
                        <AnimatePresence>
                          {sidebarOpen && (
                            <motion.div
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              className="flex-1 flex items-center justify-between min-w-0 relative"
                            >
                              <span className={`text-[13px] font-semibold truncate ${active ? 'text-white' : ''}`}>{name}</span>
                              <div className="flex items-center gap-1">
                                {badge && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-[var(--primary-color)] text-white tracking-wider">{badge}</span>
                                )}
                                {subLinks && (
                                  <ChevronRight size={12} className={`transition-transform ${subsExpanded ? 'rotate-90 text-[var(--primary-color)]' : 'text-slate-600'}`} />
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {!sidebarOpen && (
                          <div className="absolute left-[calc(100%+10px)] px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg opacity-0 group-hover/sidebar:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-[100] border border-white/10 shadow-xl">
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
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="ml-3 pl-3 py-0.5 space-y-0.5 border-l border-white/[0.06]">
                              {subLinks.map((sub) => {
                                const subActive = isSubActive(sub.path);
                                return (
                                  <NavLink
                                    key={sub.label}
                                    to={sub.path}
                                    className={`
                                      flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
                                      ${subActive
                                        ? 'sidebar-subitem-active'
                                        : 'sidebar-subitem-inactive'
                                      }
                                    `}
                                  >
                                    <sub.icon size={12} className="flex-shrink-0" />
                                    <span className="truncate">{sub.label}</span>
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
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="border-t border-[var(--glass-border)] p-2 flex-shrink-0 flex flex-col gap-2">
          {sidebarOpen ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center flex-shrink-0">
                  <School size={14} className="text-[var(--text-main)]" style={{ opacity: 0.8 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--text-main)] truncate">{localStorage.getItem('schoolName') || "School"}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">Administrator</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                <School size={14} className="text-[var(--text-main)]" style={{ opacity: 0.8 }} />
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}
