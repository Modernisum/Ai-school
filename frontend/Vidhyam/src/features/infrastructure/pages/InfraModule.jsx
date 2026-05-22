import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import InfraPage from "./infra.jsx";

const InfraModule = () => {
  return (
    <div className="h-full bg-slate-900/10 p-1 overflow-y-auto">
      <Routes>
        <Route path=":tab" element={<InfraPage />} />
        <Route path="*" element={<Navigate to="/dashboard/infra/spaces" replace />} />
      </Routes>
    </div>
  );
};

export default InfraModule;
