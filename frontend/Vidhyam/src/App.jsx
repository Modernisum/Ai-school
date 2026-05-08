import React, { Suspense, lazy, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { selectTheme, selectScreenScale } from "./features/settings/settingsSlice";
import { applyThemeEnhanced, initializeTheme } from "./utils/themeEnhanced";
import { updateScreenScale, initializeScreenScale } from "./utils/screenScale";
import lazyRetry from "./utils/lazyRetry";
import { createLazyRoute } from "./utils/lazyEnhanced.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Layout & Critical Paths
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PageLoader from "./components/ui/PageLoader.jsx";

// Eagerly load core feature routers for reliability
import AcademicModule from "./features/academics/pages/AcademicModule.jsx";
import StudentModule from "./features/students/pages/StudentModule.jsx";
import EmployeeModule from "./features/employees/pages/EmployeeModule.jsx";
import InfraModule from "./features/infrastructure/pages/InfraModule.jsx";
import FinanceModule from "./features/billing/pages/FinanceModule.jsx";
import NotificationsPage from "./features/dashboard/pages/Notifications.jsx";

import DashboardLayout from "./features/dashboard/pages/dashboard.jsx";
import HomePage from "./features/dashboard/pages/home.jsx";

// Lazy-loaded top-level pages with enhanced loading
const SchoolLoginPage = createLazyRoute(() => import("./features/auth/pages/login.jsx"), {
  prefetch: true,
  prefetchOnHover: true
});

// Lazy-loaded sub-pages with enhanced loading
const ComplainsPage = createLazyRoute(() => import("./features/infrastructure/pages/complain.jsx"));
const FeesPage = createLazyRoute(() => import("./features/billing/pages/fees.jsx"));
// const DocumentUploadPage = createLazyRoute(() => import("./features/documents/pages/DocumentUploadPage.jsx"));
const EmployeeProfilePage = createLazyRoute(() => import("./features/employees/components/employeeprofile.jsx"));
const PayrollPage = createLazyRoute(() => import("./features/employees/pages/payroll.jsx"));
const LeaveManagementPage = createLazyRoute(() => import("./features/employees/components/LeaveManagement.jsx"));
const SchoolProfilePage = createLazyRoute(() => import("./features/infrastructure/pages/schoolprofile.jsx"));
const ReferralCouponsPage = createLazyRoute(() => import("./features/billing/pages/referralCoupons.jsx"));
const AiStudioPage = createLazyRoute(() => import("./features/ai/pages/AiStudio.jsx"), {
  prefetch: false, // AI Studio might be heavy, load on demand
  prefetchOnHover: true
});
const RecoveryPage = createLazyRoute(() => import("./features/dashboard/pages/RecoveryPage.jsx"));
const GeneralSettings = createLazyRoute(() => import("./features/dashboard/pages/GeneralSettings.jsx"));

export default function App() {
  const theme = useSelector(selectTheme);
  const screenScale = useSelector(selectScreenScale);

  useEffect(() => {
    applyThemeEnhanced(theme);
  }, [theme]);

  useEffect(() => {
    // Initialize theme system
    const cleanupTheme = initializeTheme();
    
    // Initialize screen scale
    const cleanupScale = initializeScreenScale();
    
    // Cleanup both on unmount
    return () => {
      cleanupTheme?.();
      cleanupScale?.();
    };
  }, []);

  return (
    <Router>
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<SchoolLoginPage />} />


          {/* Dashboard routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />

            {/* Feature Modules (Eagerly Loaded Frames) */}
            <Route path="academic/*" element={<AcademicModule />} />
            <Route path="employee/*" element={<EmployeeModule />} />
            <Route path="finance/*" element={<FinanceModule />} />
            <Route path="infra/*" element={<InfraModule />} />
            <Route path="student/*" element={<StudentModule />} />
            <Route path="notifications/*" element={<NotificationsPage />} />

            {/* Standalone Pages (Lazy Loaded) */}
            <Route path="fees" element={<Suspense fallback={<PageLoader />}><FeesPage /></Suspense>} />
            {/* <Route path="upload" element={<Suspense fallback={<PageLoader />}><DocumentUploadPage /></Suspense>} /> */}
            <Route path="employeeprofile" element={<Suspense fallback={<PageLoader />}><EmployeeProfilePage /></Suspense>} />
            <Route path="payroll" element={<Suspense fallback={<PageLoader />}><PayrollPage /></Suspense>} />
            <Route path="leave-management" element={<Suspense fallback={<PageLoader />}><LeaveManagementPage /></Suspense>} />
            <Route path="school-profile" element={<Suspense fallback={<PageLoader />}><SchoolProfilePage /></Suspense>} />
            <Route path="referral-coupons" element={<Suspense fallback={<PageLoader />}><ReferralCouponsPage /></Suspense>} />
            <Route path="ai-studio" element={<Suspense fallback={<PageLoader />}><AiStudioPage /></Suspense>} />
            <Route path="recovery" element={<Suspense fallback={<PageLoader />}><RecoveryPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><GeneralSettings /></Suspense>} />

            {/* Global Redirects */}
            <Route path="announcements" element={<Navigate to="/dashboard/notifications/announcements" replace />} />
            <Route path="complains" element={<Navigate to="/dashboard/notifications/complains" replace />} />
            <Route path="exam" element={<Navigate to="/dashboard/academic/exam" replace />} />
            <Route path="events" element={<Navigate to="/dashboard/academic/events" replace />} />
            <Route path="attendance" element={<Navigate to="/dashboard/academic/attendance" replace />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<h1 className="text-white text-center mt-20 text-2xl font-bold">404 - System Offline or Page Not Found</h1>} />
        </Routes>
      </Suspense>
      <ToastContainer theme="dark" position="bottom-right" autoClose={3000} />
    </Router>
  );
}
