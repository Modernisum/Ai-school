import React, { useState, useEffect } from "react";
import { Bell, User, ChevronDown, Search, School } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function TopBar() {
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [schoolName, setSchoolName] = useState("School Name");

  // Derive page title from location
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard/home')) return 'Home';
    if (path.includes('/dashboard/student')) return 'Students';
    if (path.includes('/dashboard/employee')) return 'Employees';
    if (path.includes('/dashboard/finance')) return 'Finance';
    if (path.includes('/dashboard/academic')) return 'Academic';
    if (path.includes('/dashboard/exam')) return 'Exams';
    if (path.includes('/dashboard/events')) return 'Events';
    if (path.includes('/dashboard/attendance')) return 'Attendance';
    if (path.includes('/dashboard/timetable')) return 'Timetable';
    if (path.includes('/dashboard/academic/materials')) return 'Academic Materials';
    if (path.includes('/dashboard/announcements')) return 'Announcements';
    if (path.includes('/dashboard/settings')) return 'Settings';
    if (path.includes('/dashboard/infra')) return 'Infrastructure';
    if (path.includes('/dashboard/ai-studio')) return 'AI Studio';
    return 'Dashboard';
  };
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New Announcement", message: "Annual Sports Day is scheduled for next week", time: "2 hours ago", read: false },
    { id: 2, title: "Fee Reminder", message: "Last date for fee submission is approaching", time: "1 day ago", read: false },
    { id: 3, title: "Holiday Notice", message: "School will remain closed on Monday", time: "2 days ago", read: true },
    { id: 4, title: "Exam Schedule", message: "Final exam schedule has been published", time: "3 days ago", read: true },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  // Load school name from localStorage
  useEffect(() => {
    const schoolData = localStorage.getItem("schoolData");
    if (schoolData) {
      try {
        const parsed = JSON.parse(schoolData);
        if (parsed.name) {
          setSchoolName(parsed.name);
        }
      } catch (e) {
        console.error("Error parsing school data:", e);
      }
    }
  }, []);

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Search */}
        <div className="flex-1 flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} style={{ fontSize: 'calc(18px * var(--scale-factor, 1))' }} />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 w-48 sm:w-64 transition-all"
              style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}
            />
          </div>
        </div>

        {/* Center - Page Title */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.h1
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-base font-bold text-white tracking-widest uppercase italic"
              style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}
            >
              {getPageTitle()}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Right side - Notifications and Profile */}
        <div className="flex-1 flex items-center justify-end gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <Bell size={20} className="text-slate-300 group-hover:text-white transition-colors" style={{ fontSize: 'calc(20px * var(--scale-factor, 1))' }} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-96 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white" style={{ fontSize: 'calc(16px * var(--scale-factor, 1))' }}>
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                          style={{ fontSize: 'calc(12px * var(--scale-factor, 1))' }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? 'bg-primary' : 'bg-slate-600'}`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-white" style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}>
                                  {notification.title}
                                </h4>
                                <span className="text-xs text-slate-500" style={{ fontSize: 'calc(11px * var(--scale-factor, 1))' }}>
                                  {notification.time}
                                </span>
                              </div>
                              <p className="text-slate-400 text-sm" style={{ fontSize: 'calc(13px * var(--scale-factor, 1))' }}>
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="mx-auto text-slate-600 mb-3" size={32} style={{ fontSize: 'calc(32px * var(--scale-factor, 1))' }} />
                        <p className="text-slate-500" style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}>
                          No notifications yet
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-white/10">
                    <button
                      onClick={() => window.location.href = '/dashboard/announcements'}
                      className="w-full py-2.5 text-center text-primary hover:text-primary/80 transition-colors font-medium"
                      style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}
                    >
                      View all announcements
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* School Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
                <School size={16} className="text-white" style={{ fontSize: 'calc(16px * var(--scale-factor, 1))' }} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white whitespace-nowrap" style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}>
                  {schoolName}
                </div>
                <div className="text-xs text-slate-500" style={{ fontSize: 'calc(11px * var(--scale-factor, 1))' }}>
                  School Profile
                </div>
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} style={{ fontSize: 'calc(16px * var(--scale-factor, 1))' }} />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
                        <School size={18} className="text-white" style={{ fontSize: 'calc(18px * var(--scale-factor, 1))' }} />
                      </div>
                      <div>
                        <div className="font-bold text-white" style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}>
                          {schoolName}
                        </div>
                        <div className="text-xs text-slate-500" style={{ fontSize: 'calc(11px * var(--scale-factor, 1))' }}>
                          Administrator
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <a
                      href="/dashboard/school-profile"
                      className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}
                    >
                      <User size={16} style={{ fontSize: 'calc(16px * var(--scale-factor, 1))' }} />
                      School Profile
                    </a>
                    <a
                      href="/dashboard/settings"
                      className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}
                    >
                      <School size={16} style={{ fontSize: 'calc(16px * var(--scale-factor, 1))' }} />
                      Settings
                    </a>
                  </div>

                  <div className="p-4 border-t border-white/10">
                    <button
                      onClick={() => {
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("schoolId");
                        localStorage.removeItem("schoolData");
                        window.location.href = "/";
                      }}
                      className="w-full py-2.5 px-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors font-medium"
                      style={{ fontSize: 'calc(14px * var(--scale-factor, 1))' }}
                    >
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}