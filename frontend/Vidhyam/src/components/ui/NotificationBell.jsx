import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertCircle, CheckCircle, Loader2, MessageCircle, Box } from "lucide-react";
import { useGetUnreadCountQuery, useMarkAllReadMutation } from "../../features/dashboard/api/notificationApi";
import { getSchoolIdFromStorage } from "../../utils/api";
import { useWebSockets, MESSAGE_TYPES } from "../../hooks/useWebSockets";

function NotificationBell({ sidebarOpen = true, compact = false }) {
  const navigate = useNavigate();
  const schoolId = getSchoolIdFromStorage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const { data: unreadData } = useGetUnreadCountQuery(schoolId, { skip: !schoolId });
  const [markAllRead, { isLoading: markingAllRead }] = useMarkAllReadMutation();

  const unreadCount = unreadData?.data?.count || 0;

  // WebSocket for real-time notification push
  const { connected: wsConnected, lastMessage } = useWebSockets(schoolId, {
    vehicleId: null,
    onMessage: (msg) => {
      if (msg.type === MESSAGE_TYPES.NOTIFICATION || msg.payload?.category) {
        setNotifications((prev) => [msg.payload || msg, ...prev]);
      }
    },
  });

  // Sync lastMessage WebSocket notification into list
  useEffect(() => {
    if (!lastMessage) return;
    if (
      lastMessage.type === MESSAGE_TYPES.NOTIFICATION ||
      lastMessage.payload?.category
    ) {
      const notif = lastMessage.payload || lastMessage;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    }
  }, [lastMessage, wsConnected]);

  // Fetch notifications on dropdown open
  const fetchNotifications = useCallback(async () => {
    if (!schoolId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/school/${schoolId}/system/notifications?user_id=${encodeURIComponent(
          "self"
        )}&unread_only=true&limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, loading]);

  useEffect(() => {
    if (dropdownOpen) fetchNotifications();
  }, [dropdownOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    await markAllRead(schoolId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await fetch(
        `/api/school/${schoolId}/system/notifications/${notificationId}/read`,
        { method: "POST" }
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleClick = (notif) => {
    const notifId = notif.id || notif._id;
    if (notifId) handleMarkRead(notifId);
    setDropdownOpen(false);
    if (notif.category === "MATERIAL_SHORTAGE") {
      const spaceName = notif.data?.spaceName;
      if (spaceName) {
        navigate(`/dashboard/infra/spaces/detail/${spaceName}`);
      } else {
        navigate("/dashboard/infra/spaces");
      }
    } else {
      navigate("/dashboard/notifications/announcements");
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/20";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20";
      case "success":
        return "bg-green-500/10 border-green-500/20";
      default:
        return "bg-blue-500/10 border-blue-500/20";
    }
  };

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`
            relative p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all
            ${dropdownOpen ? 'text-white bg-white/5' : ''}
            ${!sidebarOpen ? 'mx-auto flex items-center justify-center w-10 h-10' : ''}
          `}
          aria-label="Notifications"
        >
          <Bell size={18} className="relative flex-shrink-0" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-slate-950 animate-pulse" />
          )}
          {!sidebarOpen && (
            <div className="absolute left-[calc(100%+10px)] px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg opacity-0 hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-[100] border border-white/10 shadow-xl group-hover/sidebar:opacity-100">
              Notifications
            </div>
          )}
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-[90]"
                onClick={() => setDropdownOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
              >
                {/* Header */}
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">
                    Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    {wsConnected && (
                      <span className="flex items-center gap-1 text-[10px] text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live
                      </span>
                    )}
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingAllRead || unreadCount === 0}
                      className="text-[11px] text-[var(--primary-color)] hover:underline disabled:opacity-40"
                    >
                      {markingAllRead ? "Marking..." : "Mark all read"}
                    </button>
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {loading ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      {wsConnected ? "No notifications yet" : "Connecting..."}
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id || notif._id || Math.random()}
                        onClick={() => handleClick(notif)}
                        className={`w-full p-3 text-left hover:bg-white/5 transition-colors flex gap-3 items-start ${
                          !notif.isRead ? "bg-white/[0.02]" : ""
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {notif.category === "MATERIAL_SHORTAGE" ? (
                            <Box size={16} className="text-amber-400" />
                          ) : notif.category === "complaint" ? (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          ) : notif.category === "announcement" ? (
                            <MessageCircle className="w-4 h-4 text-blue-400" />
                          ) : notif.severity === "critical" ||
                            notif.severity === "danger" ? (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            getSeverityIcon(notif.severity)
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">
                            {notif.title || notif.type || "Notification"}
                          </p>
                          <p className="text-slate-400 text-[11px] line-clamp-2 mt-0.5">
                            {notif.message || notif.body || notif.content}
                          </p>
                          <p className="text-slate-500 text-[10px] mt-1">
                            {notif.createdAt
                              ? new Date(notif.createdAt).toLocaleTimeString()
                              : "Just now"}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] shrink-0 mt-1.5" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/dashboard/notifications/announcements");
                    }}
                    className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  >
                    View all notifications →
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {sidebarOpen ? (
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`
            relative flex w-full items-center gap-2.5 rounded-xl transition-all duration-200 overflow-hidden border border-transparent text-left
            ${dropdownOpen
              ? 'sidebar-item-active font-semibold text-[var(--primary-color)]'
              : 'sidebar-item-inactive hover:bg-white/5'
            }
            px-2.5 py-2
          `}
          aria-label="Notifications"
        >
          {dropdownOpen && (
            <div className="absolute inset-0 rounded-xl sidebar-active-bg" />
          )}
          <Bell size={18} className={`relative flex-shrink-0 transition-colors ${dropdownOpen ? 'text-[var(--primary-color)]' : 'text-slate-400'}`} />
          <div className="flex-1 flex items-center justify-between min-w-0 relative">
            <span className={`text-[13px] font-semibold truncate ${dropdownOpen ? 'text-white' : ''}`}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-500 text-white tracking-wider">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </button>
      ) : (
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`
            relative flex items-center justify-center w-full rounded-xl transition-all duration-200 overflow-hidden border border-transparent py-2
            ${dropdownOpen
              ? 'sidebar-item-active text-[var(--primary-color)]'
              : 'sidebar-item-inactive hover:bg-white/5'
            }
          `}
          aria-label="Notifications"
        >
          <Bell size={18} className={`transition-colors ${dropdownOpen ? 'text-[var(--primary-color)]' : 'text-slate-400'}`} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 text-[10px] flex items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-[#030712]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <div className="absolute left-[calc(100%+10px)] px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg opacity-0 hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-[100] border border-white/10 shadow-xl group-hover/sidebar:opacity-100">
            Notifications
          </div>
        </button>
      )}

      <AnimatePresence>
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-[90]"
              onClick={() => setDropdownOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
            >
              {/* Header */}
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">
                  Notifications
                </h3>
                <div className="flex items-center gap-2">
                  {wsConnected && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Live
                    </span>
                  )}
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAllRead || unreadCount === 0}
                    className="text-[11px] text-[var(--primary-color)] hover:underline disabled:opacity-40"
                  >
                    {markingAllRead ? "Marking..." : "Mark all read"}
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {loading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    {wsConnected ? "No notifications yet" : "Connecting..."}
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id || notif._id || Math.random()}
                      onClick={() => handleClick(notif)}
                      className={`w-full p-3 text-left hover:bg-white/5 transition-colors flex gap-3 items-start ${
                        !notif.isRead ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {notif.category === "MATERIAL_SHORTAGE" ? (
                          <Box size={16} className="text-amber-400" />
                        ) : notif.category === "complaint" ? (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        ) : notif.category === "announcement" ? (
                          <MessageCircle className="w-4 h-4 text-blue-400" />
                        ) : notif.severity === "critical" ||
                          notif.severity === "danger" ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          getSeverityIcon(notif.severity)
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {notif.title || notif.type || "Notification"}
                        </p>
                        <p className="text-slate-400 text-[11px] line-clamp-2 mt-0.5">
                          {notif.message || notif.body || notif.content}
                        </p>
                        <p className="text-slate-500 text-[10px] mt-1">
                          {notif.createdAt
                            ? new Date(notif.createdAt).toLocaleTimeString()
                            : "Just now"}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/dashboard/notifications/announcements");
                  }}
                  className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  View all notifications →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;