import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { FileText, CalendarCheck, CalendarDays, History } from "lucide-react";
import SecondaryNav from "../../../components/ui/SecondaryNav";
import PageLoader from "../../../components/ui/PageLoader";

const ExamsPage = lazy(() => import("../pages/exam.jsx"));
const EventsPage = lazy(() => import("../pages/events.jsx"));
const AttendancePage = lazy(() => import("../pages/attendance.jsx"));
const TimetableGeneratorPage = lazy(() => import("../pages/timetable.jsx"));
const MaterialsPage = lazy(() => import("../pages/Materials.jsx"));

const AcademicModule = () => {
  const tabs = [
    { label: "Exams", path: "/dashboard/academic/exam", icon: FileText },
    { label: "Events", path: "/dashboard/academic/events", icon: CalendarCheck },
    { label: "Attendance", path: "/dashboard/academic/attendance", icon: CalendarDays },
    { label: "Timetable", path: "/dashboard/academic/timetable", icon: History },
    { label: "Materials", path: "/dashboard/academic/materials", icon: FileText },
  ];

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] overflow-hidden">
      <SecondaryNav type="academic" tabs={tabs} />
      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/10">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="exam" element={<ExamsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="timetable" element={<TimetableGeneratorPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="*" element={<Navigate to="exam" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export default AcademicModule;
