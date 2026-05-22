import React, { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Sidebar from "../../../components/ui/Sidebar";
import MobileNav from "../../../components/ui/MobileNav";
import SessionHandler from "../../auth/components/SessionHandler";
import lazyRetry from "../../../utils/lazyRetry";
import { selectTheme } from "../../settings/settingsSlice";
import { applyThemeEnhanced } from "../../../utils/themeEnhanced";

const SchoolNotifier = lazyRetry(() => import("../../../components/ui/SchoolNotifier"));

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const theme = useSelector(selectTheme);

  useEffect(() => {
    applyThemeEnhanced(theme);
  }, [theme]);

  return (
    <SessionHandler>
      <Suspense fallback={null}>
        <SchoolNotifier />
      </Suspense>
      <div className="flex h-screen bg-[var(--bg-main)] font-sans overflow-hidden selection:bg-primary/30">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div id="dashboard-content-wrapper" className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Floating hamburger menu for mobile viewports */}
          <div className="lg:hidden fixed top-3 left-3 z-50">
            <MobileNav />
          </div>
          <main className="flex-1 overflow-y-auto overflow-x-hidden page-bg">
            <div className="min-h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SessionHandler>
  );
}
