import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { FileText, CalendarCheck, CalendarDays, History } from "lucide-react";

import ExamsPage from "./exam.jsx";
import EventsPage from "./events.jsx";
import AttendancePage from "./attendance.jsx";
import TimetableGeneratorPage from "./timetable.jsx";

const AcademicModule = () => {
  return (
    <div className="h-full overflow-y-auto p-1 bg-slate-900/10">
      <Routes>
        <Route path="exam" element={<ExamsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="timetable" element={<TimetableGeneratorPage />} />
        <Route path="*" element={<Navigate to="exam" replace />} />
      </Routes>
    </div>
  );
};

export default AcademicModule;
