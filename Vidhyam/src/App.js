// src/App.js
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout & Critical Paths
import DashboardLayout from "./features/dashboard/pages/dashboard.jsx";
import Setup from "./features/auth/pages/setup.jsx";
import SchoolLoginPage from "./features/auth/pages/login.jsx";

// Lazy-loaded pages
const HomePage = lazy(() => import("./features/dashboard/pages/home.jsx"));
const ClassesPage = lazy(() => import("./features/academics/pages/class.jsx"));
const ComplainsPage = lazy(() => import("./features/infrastructure/pages/complain.jsx"));
const ExamsPage = lazy(() => import("./features/academics/pages/exam.jsx"));
const EmployeePage = lazy(() => import("./features/employees/pages/employee.jsx"));
const FeesPage = lazy(() => import("./features/billing/pages/fees.jsx"));
const MaterialsPage = lazy(() => import("./features/academics/pages/Materials.jsx"));
const SchoolPage = lazy(() => import("./features/infrastructure/pages/school.jsx"));
const SpacePage = lazy(() => import("./features/infrastructure/pages/space.jsx"));
const StudentManager = lazy(() => import("./features/students/pages/student.jsx"));
const SubjectPage = lazy(() => import("./features/academics/pages/subject.jsx"));
const DocumentUploadPage = lazy(() => import("./features/documents/pages/upload.jsx"));
const Studentinfo = lazy(() => import("./features/students/components/studentprofile.jsx"));
const SchoolProfilePage = lazy(() => import("./features/infrastructure/pages/schoolprofile.jsx"));
const EmployeeFormPage = lazy(() => import("./features/employees/components/employeeform.jsx"));
const EmployeeProfilePage = lazy(() => import("./features/employees/components/employeeprofile.jsx"));
const AttendanceManager = lazy(() => import("./features/academics/pages/attendance.jsx"));

// Lazy Loader
const PageLoader = () => (
  <div className="w-full h-[calc(100vh-100px)] flex flex-col items-center justify-center">
    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    <p className="mt-4 text-slate-400 font-medium animate-pulse">Loading module...</p>
  </div>
);


export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<SchoolLoginPage />} />
        <Route path="/setup" element={<Setup />} />

        {/* Dashboard routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="home" replace />} /> {/* default redirect */}
          <Route path="home" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
          <Route path="class" element={<Suspense fallback={<PageLoader />}><ClassesPage /></Suspense>} />
          <Route path="complains" element={<Suspense fallback={<PageLoader />}><ComplainsPage /></Suspense>} />
          <Route path="exam" element={<Suspense fallback={<PageLoader />}><ExamsPage /></Suspense>} />
          <Route path="employee" element={<Suspense fallback={<PageLoader />}><EmployeePage /></Suspense>} />
          <Route path="fees" element={<Suspense fallback={<PageLoader />}><FeesPage /></Suspense>} />
          <Route path="materials" element={<Suspense fallback={<PageLoader />}><MaterialsPage /></Suspense>} />
          <Route path="school" element={<Suspense fallback={<PageLoader />}><SchoolPage /></Suspense>} />
          <Route path="space" element={<Suspense fallback={<PageLoader />}><SpacePage /></Suspense>} />
          <Route path="student" element={<Suspense fallback={<PageLoader />}><StudentManager /></Suspense>} />
          <Route path="subject" element={<Suspense fallback={<PageLoader />}><SubjectPage /></Suspense>} />
          <Route path="upload" element={<Suspense fallback={<PageLoader />}><DocumentUploadPage /></Suspense>} />
          <Route path="announcements" element={<Suspense fallback={<PageLoader />}><AttendanceManager /></Suspense>} />
          <Route path="employeeform" element={<Suspense fallback={<PageLoader />}><EmployeeFormPage /></Suspense>} />
          <Route path="employeeprofile" element={<Suspense fallback={<PageLoader />}><EmployeeProfilePage /></Suspense>} />
          <Route path="attendance" element={<Suspense fallback={<PageLoader />}><AttendanceManager /></Suspense>} />
          <Route path="school-profile" element={<Suspense fallback={<PageLoader />}><SchoolProfilePage /></Suspense>} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}
