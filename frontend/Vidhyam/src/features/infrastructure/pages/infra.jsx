import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Box, Package, Briefcase } from 'lucide-react';
import { toast } from 'react-toastify';

import { selectPollingInterval, selectIsOnline, setOnline } from '../../settings/settingsSlice';
import MaterialPage from './MaterialPage';
import ResponsibilityPage from './ResponsibilityPage';
import SpacePage from './SpacePage';

import NoConnection from '../../../components/ui/NoConnection.jsx';

const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
  return null;
};

export default function SpaceManagement({ tab }) {
  const dispatch = useDispatch();
  const schoolId = getSchoolId();
  const pollingInterval = useSelector(selectPollingInterval);
  const isOnline = useSelector(selectIsOnline);
  
  const [activeMainTab, setActiveMainTab] = useState('spaces');

  useEffect(() => {
    if (tab) {
      const tabMap = { 'manifest': 'spaces', 'materials': 'materials', 'protocols': 'responsibilities' };
      setActiveMainTab(tabMap[tab] || tab);
    }
  }, [tab]);

  const handleRetry = () => {
    dispatch(setOnline(true));
    toast.info('Neural Link: Re-attempting connection...');
  };



  return (
    <div className="space-y-1 max-w-full pb-10 overflow-visible">
      {/* Main Content Area */}
      <motion.div
        key={activeMainTab}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="min-h-[500px]"
      >
        {activeMainTab === 'spaces' ? (
          <SpacePage schoolId={schoolId} pollingInterval={pollingInterval} />
        ) : activeMainTab === 'materials' ? (
          <MaterialPage schoolId={schoolId} pollingInterval={pollingInterval} />
        ) : (
          <ResponsibilityPage schoolId={schoolId} pollingInterval={pollingInterval} />
        )}
      </motion.div>
    </div>
  );
}