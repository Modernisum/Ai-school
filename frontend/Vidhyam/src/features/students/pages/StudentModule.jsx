import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
import SecondaryNav from "../../../components/ui/SecondaryNav";
import PageLoader from "../../../components/ui/PageLoader";

const StudentManager = lazy(() => import("../pages/student.jsx"));
const AddStudentPage = lazy(() => import("../components/addstudent.jsx"));
const Studentinfo = lazy(() => import("../components/studentprofile.jsx"));

const StudentModule = () => {
  const tabs = [
    { label: "All Students", path: "/dashboard/student/all", icon: Users },
    { label: "Admission", path: "/dashboard/student/add", icon: UserPlus },
  ];

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] overflow-hidden">
      <SecondaryNav type="student" tabs={tabs} />
      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/10">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="all" element={<StudentManager />} />
            <Route path="add" element={<AddStudentPage />} />
            <Route path="profile/:studentId" element={<Studentinfo />} />
            <Route path="*" element={<Navigate to="all" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export default StudentModule;
