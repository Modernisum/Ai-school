import React, { Suspense, lazy, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { selectTheme, selectScreenScale } from "./features/settings/settingsSlice";
import { applyTheme } from "./utils/theme";
import { updateScreenScale, initializeScreenScale } from "./utils/screenScale";

// Layout & Critical Paths
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Lazy-loaded top-level pages
const DashboardLayout = lazy(() => import("./features/dashboard/pages/dashboard.jsx"));
const Setup = lazy(() => import("./features/auth/pages/setup.jsx"));
const SchoolLoginPage = lazy(() => import("./features/auth/pages/login.jsx"));

// Lazy-loaded pages
const HomePage = lazy(() => import("./features/dashboard/pages/home.jsx"));
const ComplainsPage = lazy(() => import("./features/infrastructure/pages/complain.jsx"));
const ExamsPage = lazy(() => import("./features/academics/pages/exam.jsx"));
const EventsPage = lazy(() => import("./features/academics/pages/events.jsx"));
const EmployeePage = lazy(() => import("./features/employees/pages/employee.jsx"));
const FeesPage = lazy(() => import("./features/billing/pages/fees.jsx"));
const FinancePage = lazy(() => import("./features/billing/pages/finance.jsx"));
const InfraPage = lazy(() => import("./features/infrastructure/pages/infra.jsx"));
const StudentManager = lazy(() => import("./features/students/pages/student.jsx"));

const DocumentUploadPage = lazy(() => import("./features/documents/pages/DocumentUploadPage.jsx"));
const AddStudentPage = lazy(() => import("./features/students/components/addstudent.jsx"));
const Studentinfo = lazy(() => import("./features/students/components/studentprofile.jsx"));
const SchoolProfilePage = lazy(() => import("./features/infrastructure/pages/schoolprofile.jsx"));
const EmployeeFormPage = lazy(() => import("./features/employees/components/employeeform.jsx"));
const EmployeeProfilePage = lazy(() => import("./features/employees/components/employeeprofile.jsx"));
const PayrollPage = lazy(() => import("./features/employees/pages/payroll.jsx"));
const LeaveManagementPage = lazy(() => import("./features/employees/components/LeaveManagement.jsx"));
const ReferralCouponsPage = lazy(() => import("./features/billing/pages/referralCoupons.jsx"));
const AiStudioPage = lazy(() => import("./features/ai/pages/AiStudio.jsx"));
const TimetableGeneratorPage = lazy(() => import("./features/academics/pages/timetable.jsx"));
const RecoveryPage = lazy(() => import("./features/dashboard/pages/RecoveryPage.jsx"));
const GeneralSettings = lazy(() => import("./features/dashboard/pages/GeneralSettings.jsx"));

const AnnouncementsPage = lazy(() => import("./features/dashboard/pages/announcements.jsx"));
const NotificationsPage = lazy(() => import("./features/dashboard/pages/Notifications.jsx"));

// Lazy Loader
const PageLoader = ({ fullScreen = false }) => (
  <div className={`w-full flex-col items-center justify-center flex ${fullScreen ? 'h-screen bg-slate-950' : 'h-[calc(100vh-100px)]'}`}>
    <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(99, 102, 241, 0.1)', borderTopColor: 'var(--primary-color, #6366f1)' }}></div>
    <div className="mt-4 flex items-center gap-3">
       <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing Interface...</p>
    </div>
  </div>
);


export default function App() {
  const theme = useSelector(selectTheme);
  const screenScale = useSelector(selectScreenScale);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    updateScreenScale(screenScale);
  }, [screenScale]);

  // Initialize font scale on app startup
  useEffect(() => {
    initializeScreenScale();
  }, []);

  return (
    <Router>
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<SchoolLoginPage />} />
          <Route path="/setup" element={<Setup />} />

          {/* Dashboard routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="home" replace />} /> {/* default redirect */}
          <Route path="home" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
          <Route path="complains" element={<Suspense fallback={<PageLoader />}><ComplainsPage /></Suspense>} />
          <Route path="exam" element={<Suspense fallback={<PageLoader />}><ExamsPage /></Suspense>} />
          <Route path="events" element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
          <Route path="employee" element={<Suspense fallback={<PageLoader />}><EmployeePage /></Suspense>} />
          <Route path="fees" element={<Suspense fallback={<PageLoader />}><FeesPage /></Suspense>} />
          <Route path="finance" element={<Suspense fallback={<PageLoader />}><FinancePage /></Suspense>} />
          <Route path="infra" element={<Suspense fallback={<PageLoader />}><InfraPage /></Suspense>} />
          <Route path="student" element={<Suspense fallback={<PageLoader />}><StudentManager /></Suspense>} />
          <Route path="student/profile/:studentId" element={<Suspense fallback={<PageLoader />}><Studentinfo /></Suspense>} />
          <Route path="student/addstudent" element={<Suspense fallback={<PageLoader />}><AddStudentPage /></Suspense>} />

          <Route path="upload" element={<Suspense fallback={<PageLoader />}><DocumentUploadPage /></Suspense>} />
          <Route path="announcements" element={<Suspense fallback={<PageLoader />}><AnnouncementsPage /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
          <Route path="employeeform" element={<Suspense fallback={<PageLoader />}><EmployeeFormPage /></Suspense>} />
          <Route path="employeeprofile" element={<Suspense fallback={<PageLoader />}><EmployeeProfilePage /></Suspense>} />
          <Route path="payroll" element={<Suspense fallback={<PageLoader />}><PayrollPage /></Suspense>} />
          <Route path="leave-management" element={<Suspense fallback={<PageLoader />}><LeaveManagementPage /></Suspense>} />
          <Route path="school-profile" element={<Suspense fallback={<PageLoader />}><SchoolProfilePage /></Suspense>} />
          <Route path="referral-coupons" element={<Suspense fallback={<PageLoader />}><ReferralCouponsPage /></Suspense>} />
          <Route path="ai-studio" element={<Suspense fallback={<PageLoader />}><AiStudioPage /></Suspense>} />
          <Route path="timetable" element={<Suspense fallback={<PageLoader />}><TimetableGeneratorPage /></Suspense>} />
          <Route path="recovery" element={<Suspense fallback={<PageLoader />}><RecoveryPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><GeneralSettings /></Suspense>} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<h1 className="text-white text-center mt-20 text-2xl font-bold">404 - System Offline or Page Not Found</h1>} />
      </Routes>
      </Suspense>
    </Router>
  );
}
