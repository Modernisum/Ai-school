// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout
import DashboardLayout from "./dashboard.jsx";

// Pages (non-dashboard)
import Setup from "./pages/setup.jsx";
import SchoolLoginPage from "./pages/login.jsx";

// Dashboard pages
import HomePage from "./pages/home.jsx";
import ClassesPage from "./pages/class.jsx";
import ComplainsPage from "./pages/complain.jsx";
import ExamsPage from "./pages/exam.jsx";
import EmployeePage from "./pages/employee.jsx";
import FeesPage from "./pages/fees.jsx";
import MaterialsPage from "./pages/Materials.jsx";
import SchoolPage from "./pages/school.jsx";
import SpacePage from "./pages/space.jsx";
import StudentManager from "./pages/student.jsx";
import SubjectPage from "./pages/subject.jsx";
import DocumentUploadPage from "./component/module/upload.jsx";
import Studentinfo from "./component/ui/studentprofile.jsx";

import EmployeeFormPage from "./component/ui/employeeform.jsx";
import EmployeeProfilePage from "./component/ui/employeeprofile.jsx";
import AttendanceManager from "./pages/attendance.jsx";


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
          <Route path="home" element={<HomePage />} />
          
          <Route path="class" element={<ClassesPage />} />
          <Route path="complains" element={<ComplainsPage />} />
          <Route path="exam" element={<ExamsPage />} />
          <Route path="employee" element={<EmployeePage />} />
          <Route path="fees" element={<FeesPage />} /> {/* ✅ now nested */}
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="school" element={<SchoolPage />} />
          <Route path="space" element={<SpacePage />} />
          <Route path="student" element={<StudentManager />} />
          <Route path="subject" element={<SubjectPage />} />
          <Route path="upload" element={<DocumentUploadPage />} />
          <Route path="employeeform" element={<EmployeeFormPage />} />
          <Route path="employeeprofile" element={<EmployeeProfilePage />} />
          <Route path="attendance" element={<AttendanceManager />} />
        
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}
