import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import InfraPage from "./infra.jsx";

const InfraModule = () => {
  return (
    <div className="h-full bg-slate-900/10 p-1 overflow-y-auto">
      <Routes>
        <Route path="manifest" element={<InfraPage tab="manifest" />} />
        <Route path="materials" element={<InfraPage tab="materials" />} />
        <Route path="protocols" element={<InfraPage tab="protocols" />} />
        <Route path="*" element={<Navigate to="/dashboard/infra/manifest" replace />} />
      </Routes>
    </div>
  );
};

export default InfraModule;
