import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../../components/ui/Sidebar";
import TopBar from "../../../components/ui/TopBar";
import SessionHandler from "../../auth/components/SessionHandler";
import lazyRetry from "../../../utils/lazyRetry";

const SchoolNotifier = lazyRetry(() => import("../../../components/ui/SchoolNotifier"));

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <SessionHandler>
      <Suspense fallback={null}>
        <SchoolNotifier />
      </Suspense>
      <div className="flex h-screen bg-[#030712] font-sans overflow-hidden selection:bg-primary/30">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TopBar />
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
