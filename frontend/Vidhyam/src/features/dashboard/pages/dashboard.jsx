import React, { useState, Suspense, lazy } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../../components/ui/Sidebar";
import TopBar from "../../../components/ui/TopBar";
import SessionHandler from "../../auth/components/SessionHandler";

const SchoolNotifier = lazy(() => import("../../../components/ui/SchoolNotifier"));
const SpotlightSearch = lazy(() => import("../../../components/ui/SpotlightSearch"));

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionHandler>
      <Suspense fallback={null}>
        <SchoolNotifier />
      </Suspense>
      <Suspense fallback={null}>
        <SpotlightSearch />
      </Suspense>
      <div className="flex h-screen bg-slate-950 font-sans overflow-hidden selection:bg-primary/30">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden page-bg">
            {/* Stable outlet — no AnimatePresence here to avoid Suspense conflicts */}
            <div className="min-h-full p-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SessionHandler>
  );
}
