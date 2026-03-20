// src/features/students/components/studentprofile.jsx - Refactored for performance and maintainability
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader, AlertCircle as AlertIcon, 
  CheckCircle, User as UserIcon
} from 'lucide-react';

import { getSchoolIdFromStorage, DEFAULT_SCHOOL_ID } from '../../../utils/api';
import { formatClassName } from '../../../utils/helpers';
import { useGetStudentProfileQuery, useGetStudentAttendanceQuery, useGetStudentFeesQuery, useGetStudentComplainsQuery, useGetStudentAwardsQuery, useGetStudentExamsQuery, useGetStudentDocumentsQuery } from '../api/studentApi';

// Lazy load modular sections
const ImagePreviewModal = lazy(() => import('./ImagePreviewModal'));
const IdentitySection = lazy(() => import('./sections/IdentitySection'));
const DocumentsSection = lazy(() => import('./sections/DocumentsSection'));
const AttendanceSection = lazy(() => import('./sections/AttendanceSection'));
const FeesTimeline = lazy(() => import('./sections/FeesTimeline'));
const ComplainsSection = lazy(() => import('./sections/ComplainsSection'));
const PerformanceSection = lazy(() => import('./sections/PerformanceSection'));

// Loading component for Suspense
const SectionLoader = ({ title }) => (
  <div className="bg-white border-2 border-gray-100 rounded-xl p-8 flex flex-col items-center justify-center animate-pulse">
    <Loader className="animate-spin text-blue-500 mb-3" size={32} />
    <span className="text-gray-400 font-medium text-sm">Loading {title}...</span>
  </div>
);

// Main Student Profile Component
export default function Studentinfo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  const schoolId = getSchoolIdFromStorage() || DEFAULT_SCHOOL_ID;

  // Notification State
  const [notification, setNotification] = useState({ type: null, message: null });
  const [previewImage, setPreviewImage] = useState({ isOpen: false, url: '', title: '' });

  // RTK Query Hooks
  const { data: profileData, isLoading: isLoadingProfile, error: profileError } = 
    useGetStudentProfileQuery({ schoolId, studentId }, { skip: !studentId });
  
  const { data: attendanceData, isLoading: isLoadingAttendance } = 
    useGetStudentAttendanceQuery({ schoolId, studentId }, { skip: !studentId });
  
  const { data: feesData, isLoading: isLoadingFees } = 
    useGetStudentFeesQuery({ schoolId, studentId }, { skip: !studentId });
  
  const { data: complainsData, isLoading: isLoadingComplains } = 
    useGetStudentComplainsQuery({ schoolId, studentId }, { skip: !studentId });
  
  const { data: awardsData, isLoading: isLoadingAwards } = 
    useGetStudentAwardsQuery({ schoolId, studentId }, { skip: !studentId });
  
  const { data: examsData, isLoading: isLoadingExams } = 
    useGetStudentExamsQuery({ schoolId, studentId }, { skip: !studentId });
  
  const { data: documentsData, isLoading: isLoadingDocuments } = 
    useGetStudentDocumentsQuery({ schoolId, studentId }, { skip: !studentId });

  // Callbacks
  const handlePreviewImage = useCallback((url, title) => {
    setPreviewImage({ isOpen: true, url, title });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewImage({ isOpen: false, url: '', title: '' });
  }, []);

  const handleBackToList = () => navigate('/dashboard/student');
  const handleEditStudent = () => navigate(`/dashboard/student/addstudent?mode=edit&studentId=${studentId}`);

  // Notification Auto-hide
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => setNotification({ type: null, message: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle Profile Error
  useEffect(() => {
    if (profileError) {
      setNotification({ type: 'error', message: 'Failed to load student profile' });
    }
  }, [profileError]);

  if (!studentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertIcon size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Missing Student ID</h1>
          <p className="text-gray-600 mb-6">Please select a student from the list to view their profile.</p>
          <button onClick={handleBackToList} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium">
            <ArrowLeft size={16} className="inline mr-2" />Back to Students
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-800">Loading profile...</p>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mt-1">{studentId}</p>
        </div>
      </div>
    );
  }

  if (profileError || !profileData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border-t-4 border-red-500">
          <AlertIcon size={56} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-8">We couldn't find a student with ID <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-red-600">{studentId}</span> in your school.</p>
          <button onClick={handleBackToList} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg">
            <ArrowLeft size={20} />
            BACK TO LISTING
          </button>
        </div>
      </div>
    );
  }

  const student = profileData.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Suspense fallback={null}>
        <ImagePreviewModal
          isOpen={previewImage.isOpen}
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={handleClosePreview}
        />
      </Suspense>

      {/* Notifications */}
      {notification.message && (
        <div className={`fixed top-6 right-6 z-[60] p-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3 animate-slide-in-right ${
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          {notification.type === 'error' ? <AlertIcon size={20} /> : <CheckCircle size={20} />}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToList}
              className="p-3 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm group"
            >
              <ArrowLeft className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Student <span className="text-blue-600">Profile</span></h1>
              <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                ID: <span className="text-gray-900 font-bold">{studentId}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                School: <span className="text-gray-900 font-bold">{schoolId}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={handleEditStudent}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-200 hover:bg-gray-800 hover:scale-[1.02] transition-all"
          >
            <UserIcon size={20} />
            EDIT PROFILE
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* Identity Section - Full Width */}
          <div className="col-span-12">
            <Suspense fallback={<SectionLoader title="identity" />}>
              <IdentitySection 
                student={student.student} 
                studentId={studentId} 
                schoolId={schoolId} 
                onEdit={handleEditStudent} 
              />
            </Suspense>
          </div>

          {/* Left Column - 8/12 on large screens */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <Suspense fallback={<SectionLoader title="attendance" />}>
              <AttendanceSection 
                attendance={attendanceData?.data || []} 
                isLoading={isLoadingAttendance} 
              />
            </Suspense>

            <Suspense fallback={<SectionLoader title="performance" />}>
              <PerformanceSection 
                exams={examsData?.data || []} 
                awards={awardsData?.data || []}
                isLoading={isLoadingExams || isLoadingAwards}
              />
            </Suspense>

            <Suspense fallback={<SectionLoader title="documents" />}>
              <DocumentsSection 
                documents={documentsData?.documents || {}} 
                onPreviewImage={handlePreviewImage}
                isLoading={isLoadingDocuments}
              />
            </Suspense>
          </div>

          {/* Right Column - 4/12 on large screens */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <Suspense fallback={<SectionLoader title="fees" />}>
              <FeesTimeline 
                fees={feesData?.data || []} 
                isLoading={isLoadingFees} 
              />
            </Suspense>

            <Suspense fallback={<SectionLoader title="complains" />}>
              <ComplainsSection 
                complains={complainsData?.data || []} 
                isLoading={isLoadingComplains} 
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
