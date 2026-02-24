import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./component/ui/sidebar";
import SessionHandler from "./component/auth/sessionHandler";
import SchoolNotifier from "./component/ui/SchoolNotifier";
import { AnimatePresence, motion } from "framer-motion";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <SessionHandler>
      <SchoolNotifier />
      <div className="flex h-screen bg-slate-900 font-sans overflow-hidden selection:bg-indigo-500/30">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">

          {/* Subtle Background Decor */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </SessionHandler>
  );
}
