import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Home, Users, UserCheck, CreditCard, School, Box, 
  AlertCircle, FileText, CalendarCheck, CalendarDays,
  Bell, Sparkles, Settings, DollarSign, IndianRupee, Megaphone,
  X, ChevronRight
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMobile } from '../../hooks/useMobile';

const MOBILE_NAV_CONFIG = [
  {
    name: "Home",
    icon: Home,
    path: "/dashboard/home"
  },
  {
    name: "Student",
    icon: Users,
    path: "/dashboard/student",
    subLinks: [
      { label: "All Students", path: "/dashboard/student/all" },
      { label: "Admission", path: "/dashboard/student/add" },
    ]
  },
  {
    name: "Employee",
    icon: UserCheck,
    path: "/dashboard/employee",
    subLinks: [
      { label: "All Employees", path: "/dashboard/employee/all" },
      { label: "Payroll", path: "/dashboard/employee/payroll" },
      { label: "Leave", path: "/dashboard/employee/leave" },
    ]
  },
  {
    name: "Notifications",
    icon: Megaphone,
    path: "/dashboard/notifications",
    subLinks: [
      { label: "Announcements", path: "/dashboard/notifications/announcements" },
      { label: "Attendance", path: "/dashboard/notifications/attendance" },
      { label: "Complaints", path: "/dashboard/notifications/complains" },
    ]
  },
  {
    name: "Finance",
    icon: CreditCard,
    path: "/dashboard/finance",
    subLinks: [
      { label: "Income", path: "/dashboard/finance/income/overview" },
      { label: "Expense", path: "/dashboard/finance/expense/overview" },
      { label: "Fees", path: "/dashboard/fees" },
    ]
  },
  {
    name: "Academic",
    icon: School,
    path: "/dashboard/academic",
    subLinks: [
      { label: "Exams", path: "/dashboard/academic/exam" },
      { label: "Events", path: "/dashboard/academic/events" },
      { label: "Attendance", path: "/dashboard/academic/attendance" },
    ]
  },
  {
    name: "Infrastructure",
    icon: Box,
    path: "/dashboard/infra",
    subLinks: [
      { label: "Spaces", path: "/dashboard/infra/spaces" },
      { label: "Materials", path: "/dashboard/infra/materials" },
      { label: "Responsibilities", path: "/dashboard/infra/responsibilities" },
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

export const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const location = useLocation();
  const { isMobile } = useMobile();

  if (!isMobile) return null;

  const isPathActive = (path) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleSection = (name) => {
    setExpandedSection(expandedSection === name ? null : name);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--glass-border)] hover:bg-[var(--primary-glow)] transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu size={20} className="text-[var(--text-main)]" />
      </button>

      {/* Mobile navigation overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Navigation panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-[var(--bg-secondary)] border-r border-[var(--glass-border)] shadow-2xl z-50 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
                    <School size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-main)]">
                      {localStorage.getItem('schoolName') || 'Vidhyam'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Mobile Menu</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation items */}
              <nav className="p-4 space-y-1">
                {MOBILE_NAV_CONFIG.map((item) => {
                  const isActive = isPathActive(item.path);
                  const isExpanded = expandedSection === item.name;
                  const hasSubLinks = item.subLinks && item.subLinks.length > 0;

                  return (
                    <div key={item.name} className="mb-1">
                      {hasSubLinks ? (
                        <>
                          <button
                            onClick={() => toggleSection(item.name)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                              isActive
                                ? 'bg-[var(--primary-color)]/20 text-[var(--primary-color)]'
                                : 'hover:bg-white/5 text-[var(--text-main)]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon size={18} />
                              <span className="font-semibold">{item.name}</span>
                            </div>
                            <ChevronRight
                              size={16}
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="ml-8 mt-1 space-y-1 overflow-hidden"
                              >
                                {item.subLinks.map((sub) => {
                                  const isSubActive = isPathActive(sub.path);
                                  return (
                                    <NavLink
                                      key={sub.label}
                                      to={sub.path}
                                      onClick={() => setIsOpen(false)}
                                      className={`block p-2 pl-8 rounded-lg text-sm transition-colors ${
                                        isSubActive
                                          ? 'text-[var(--primary-color)] font-semibold bg-[var(--primary-color)]/10'
                                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
                                      }`}
                                    >
                                      {sub.label}
                                    </NavLink>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <NavLink
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            isActive
                              ? 'bg-[var(--primary-color)]/20 text-[var(--primary-color)]'
                              : 'hover:bg-white/5 text-[var(--text-main)]'
                          }`}
                        >
                          <item.icon size={18} />
                          <span className="font-semibold">{item.name}</span>
                        </NavLink>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 mt-4">
                <div className="text-xs text-[var(--text-muted)] text-center">
                  Vidhyam School Management System
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;