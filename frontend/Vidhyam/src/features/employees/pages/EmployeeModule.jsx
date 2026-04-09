import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UserCheck, CreditCard, CalendarCheck } from "lucide-react";
import SecondaryNav from "../../../components/ui/SecondaryNav";
import PageLoader from "../../../components/ui/PageLoader";

const EmployeePage = lazy(() => import("../pages/employee.jsx"));
const EmployeeProfilePage = lazy(() => import("../components/employeeprofile.jsx"));
const PayrollPage = lazy(() => import("../pages/payroll.jsx"));
const LeaveManagementPage = lazy(() => import("../components/LeaveManagement.jsx"));

const EmployeeModule = () => {
  const tabs = [
    { label: "All Employees", path: "/dashboard/employee/all", icon: UserCheck },
    { label: "Payroll", path: "/dashboard/employee/payroll", icon: CreditCard },
    { label: "Leave", path: "/dashboard/employee/leave", icon: CalendarCheck },
  ];

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] overflow-hidden">
      <SecondaryNav type="employee" tabs={tabs} />
      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/10">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="all" element={<EmployeePage />} />
            <Route path="profile/:employeeId" element={<EmployeeProfilePage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="leave" element={<LeaveManagementPage />} />
            <Route path="*" element={<Navigate to="all" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export default EmployeeModule;
