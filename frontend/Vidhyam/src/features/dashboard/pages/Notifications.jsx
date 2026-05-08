import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AnnouncementsPage from './announcements';
import ComplainManagement from '../../infrastructure/pages/complain';

export default function NotificationsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Navigate to="announcements" replace />} />
          <Route path="announcements" element={<AnnouncementsPage activeTab="announcements" />} />
          <Route path="attendance" element={<AnnouncementsPage activeTab="attendance" />} />
          <Route path="complains" element={<ComplainManagement />} />
        </Routes>
      </div>
    </div>
  );
}
