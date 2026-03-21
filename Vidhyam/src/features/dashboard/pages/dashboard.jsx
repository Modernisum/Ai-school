import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../../components/ui/Sidebar";
import SessionHandler from "../../auth/components/SessionHandler";
import SchoolNotifier from "../../../components/ui/SchoolNotifier";
import SpotlightSearch from "../../../components/ui/SpotlightSearch";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <SessionHandler>
      <SchoolNotifier />
      <SpotlightSearch />
      <div className="flex h-screen bg-slate-950 font-sans overflow-hidden selection:bg-primary/30">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden page-bg">
          {/* Stable outlet — no AnimatePresence here to avoid Suspense conflicts */}
          <div className="min-h-full p-0">
            <Outlet />
          </div>
        </main>
      </div>
    </SessionHandler>
  );
}
