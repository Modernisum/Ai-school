import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Users, UserPlus, Clock, CreditCard, FileCheck } from "lucide-react";

import StudentManager from "./student.jsx";
import AddStudentPage from "../components/addstudent.jsx";
import Studentinfo from "../components/studentprofile.jsx";
import StudentAttendance from "./attendance.jsx";
import StudentFees from "./fees.jsx";
import FormFillDashboard from "./FormFillDashboard.jsx";

const StudentModule = () => {
  return (
    <div className="h-full overflow-y-auto">
      <Routes>
        <Route path="all" element={<StudentManager />} />
        <Route path="add" element={<AddStudentPage />} />
        <Route path="form-fill" element={<FormFillDashboard />} />
        <Route path="leave" element={<AddStudentPage />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="profile/:studentId" element={<Studentinfo />} />
        <Route path="*" element={<Navigate to="all" replace />} />
      </Routes>
    </div>
  );
};

export default StudentModule;
