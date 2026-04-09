import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Layers, ClipboardList } from "lucide-react";
import SecondaryNav from "../../../components/ui/SecondaryNav";
import PageLoader from "../../../components/ui/PageLoader";

const InfraPage = lazy(() => import("./infra.jsx"));

const InfraModule = () => {
  const tabs = [
    { label: "Manifest", path: "/dashboard/infra/manifest", icon: Box },
    { label: "Materials", path: "/dashboard/infra/materials", icon: Layers },
    { label: "Responsibility", path: "/dashboard/infra/protocols", icon: ClipboardList },
  ];

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] overflow-hidden">
      <SecondaryNav type="infra" tabs={tabs} />
      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/10">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="manifest" element={<InfraPage tab="manifest" />} />
            <Route path="materials" element={<InfraPage tab="materials" />} />
            <Route path="protocols" element={<InfraPage tab="protocols" />} />
            <Route path="*" element={<Navigate to="manifest" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export default InfraModule;
