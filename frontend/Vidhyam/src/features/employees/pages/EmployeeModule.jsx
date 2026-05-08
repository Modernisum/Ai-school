import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UserCheck, CreditCard, CalendarCheck, IndianRupee } from "lucide-react";

import EmployeePage from "./employee.jsx";
import EmployeeProfilePage from "../components/employeeprofile.jsx";
import AddEmployeePage from "../components/AddEmployeePage.jsx";
import PayrollPage from "./payroll.jsx";
import SalaryPage from "./salary.jsx";
import LeaveManagementPage from "../components/LeaveManagement.jsx";

const EmployeeModule = () => {
  return (
    <div className="h-full overflow-y-auto p-1 bg-slate-900/10 text-white text-micro">
      <Routes>
        <Route path="all" element={<EmployeePage />} />
        <Route path="add" element={<AddEmployeePage />} />
        <Route path="profile/:employeeId" element={<EmployeeProfilePage />} />
        <Route path="salary" element={<SalaryPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="leave" element={<AddEmployeePage />} />
        <Route path="*" element={<Navigate to="all" replace />} />
      </Routes>
    </div>
  );
};

export default EmployeeModule;
