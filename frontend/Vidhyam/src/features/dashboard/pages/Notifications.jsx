import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, CalendarCheck } from 'lucide-react';
import AnnouncementsPage from './announcements';
import ComplainManagement from '../../infrastructure/pages/complain';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('announcements');

  const tabs = [
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'complaints', label: 'Complaints', icon: AlertCircle },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex items-center gap-1 p-2 bg-white/5 border-b border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon size={16} className={isActive ? 'text-primary' : 'text-slate-500'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'announcements' && <AnnouncementsPage />}
            {activeTab === 'complaints' && <ComplainManagement />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
