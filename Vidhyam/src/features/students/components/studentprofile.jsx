// src/component/ui/studentprofile.jsx - Complete Student Profile with Documents & Enhanced Attendance
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { PieChart as RPieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import {
  User, Calendar, Clock, Award, ArrowLeft,
  BookOpen, Users, Edit3, Loader, AlertCircle as AlertIcon,
  PieChart, CheckCircle, XCircle, Trophy, Star,
  GraduationCap, Target, TrendingUp, Home, ChevronLeft, ChevronRight,
  CreditCard, DollarSign, Minus, Plus, FileText, MessageSquare,
  Brain, TrendingDown, AlertTriangle, Shield, Zap, Eye, Download,
  File, Image, CreditCard as IdCard, GraduationCap as MarkSheet,
  Upload, ExternalLink, ZoomIn, X as CloseIcon, Calendar as CalendarIcon, Filter
} from 'lucide-react';

import { API_BASE_URL, getSchoolIdFromStorage, DEFAULT_SCHOOL_ID, callApiWithBackoff } from '../../../utils/api';
import { formatDate, formatDateTime, formatTime, formatClassName, formatCurrency } from '../../../utils/helpers';

// Image Preview Modal Component - Memoized
const ImagePreviewModal = memo(({ isOpen, imageUrl, title, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all z-10"
        >
          <CloseIcon size={20} />
        </button>
        <div className="bg-white rounded-lg p-4 max-h-[90vh] overflow-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full h-auto rounded-lg shadow-lg"
            style={{ maxHeight: '70vh' }}
          />
        </div>
      </div>
    </div>
  );
});
ImagePreviewModal.displayName = 'ImagePreviewModal';

// Documents Section Component - Memoized
const DocumentsSection = memo(({ documents, onPreviewImage }) => {
  const getDocumentIcon = (docType) => {
    switch (docType?.toLowerCase()) {
      case 'aadhaar':
        return IdCard;
      case 'marksheet':
        return MarkSheet;
      case 'certificate':
        return Award;
      default:
        return File;
    }
  };

  const getDocumentColor = (docType) => {
    switch (docType?.toLowerCase()) {
      case 'aadhaar':
        return 'from-blue-100 to-indigo-100 border-blue-200';
      case 'marksheet':
        return 'from-green-100 to-emerald-100 border-green-200';
      case 'certificate':
        return 'from-purple-100 to-violet-100 border-purple-200';
      default:
        return 'from-gray-100 to-slate-100 border-gray-200';
    }
  };

  if (!documents || Object.keys(documents).length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 via-white to-slate-50 border-2 border-gray-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <FileText className="mr-3 text-gray-600" size={24} />
          Documents
        </h3>
        <div className="py-8">
          <Upload size={48} className="text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-700 mb-2">No Documents Available</h4>
          <p className="text-gray-500 text-sm">Student documents will appear here when uploaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-slate-50 border-2 border-gray-200 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <FileText className="mr-3 text-gray-600" size={24} />
          Documents
        </h3>
        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {Object.keys(documents).length} documents
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(documents).map(([docType, docData], index) => {
          const IconComponent = getDocumentIcon(docType);
          const colorClass = getDocumentColor(docType);

          return (
            <div
              key={docType}
              className={`bg-gradient-to-r ${colorClass} rounded-xl p-5 hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-80 p-3 rounded-full mr-4">
                    <IconComponent className="text-gray-700" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg capitalize mb-1">
                      {docType.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Uploaded: {formatDate(docData.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {docData.fileUrl && (
                    <button
                      onClick={() => onPreviewImage(docData.fileUrl, `${docType} Document`)}
                      className="p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-lg transition-all text-gray-700 hover:text-blue-600"
                      title="Preview Document"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  {docData.fileUrl && (
                    <a
                      href={docData.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-lg transition-all text-gray-700 hover:text-green-600"
                      title="Open in New Tab"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              {/* Document Details */}
              <div className="space-y-3">
                {/* Aadhaar Details */}
                {docType === 'aadhaar' && (
                  <div className="bg-white bg-opacity-60 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <p className="font-medium text-gray-800">{docData.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">DOB:</span>
                        <p className="font-medium text-gray-800">{docData.dob || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Gender:</span>
                        <p className="font-medium text-gray-800">{docData.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Aadhaar No:</span>
                        <p className="font-medium text-gray-800">{docData.adharNumber || 'N/A'}</p>
                      </div>
                    </div>
                    {docData.fatherName && (
                      <div>
                        <span className="text-gray-600 text-sm">Father's Name:</span>
                        <p className="font-medium text-gray-800">{docData.fatherName}</p>
                      </div>
                    )}
                    {docData.residenceAddress && (
                      <div>
                        <span className="text-gray-600 text-sm">Address:</span>
                        <p className="font-medium text-gray-800 text-sm">{docData.residenceAddress}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Marksheet Details */}
                {docType === 'marksheet' && (
                  <div className="bg-white bg-opacity-60 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Student:</span>
                        <p className="font-medium text-gray-800">{docData.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Class:</span>
                        <p className="font-medium text-gray-800">{docData.className} - {docData.section}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Roll No:</span>
                        <p className="font-medium text-gray-800">{docData.rollNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Serial No:</span>
                        <p className="font-medium text-gray-800">{docData.serialNumber}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Father:</span>
                        <p className="font-medium text-gray-800">{docData.fatherName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Mother:</span>
                        <p className="font-medium text-gray-800">{docData.motherName || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-gray-600 text-sm">School:</span>
                      <p className="font-medium text-gray-800 text-sm">{docData.schoolName}</p>
                      {docData.schoolAddress && (
                        <p className="text-gray-600 text-xs">{docData.schoolAddress}</p>
                      )}
                    </div>

                    <div className="mb-3">
                      <span className="text-gray-600 text-sm">Board:</span>
                      <p className="font-medium text-gray-800">{docData.boardUniversity}</p>
                    </div>

                    {/* Marks Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-green-800">Total Result</span>
                        <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm font-bold">
                          {docData.percentageOrGrade}%
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        <span>Marks: {docData.totalObtainedMarksOrGrade}/{docData.totalMaxMarksOrGrade}</span>
                      </div>
                    </div>

                    {/* Subjects */}
                    {docData.subjects && docData.subjects.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-600 text-sm font-medium">Subject Wise Marks:</span>
                        <div className="mt-2 space-y-1">
                          {docData.subjects.map((subject, subIndex) => (
                            <div key={subIndex} className="flex justify-between items-center bg-white bg-opacity-80 rounded px-2 py-1 text-sm">
                              <span className="font-medium text-gray-800">{subject.subject}</span>
                              <span className="text-gray-700">
                                {subject.obtainedMarksOrGrade}/{subject.maxMarksOrGrade}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
DocumentsSection.displayName = 'DocumentsSection';

// Enhanced Attendance History with Full Data Display - Memoized
const AttendanceHistoryDetailed = memo(({ attendanceHistory }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedView, setSelectedView] = useState('list'); // 'list' or 'detailed'
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Filter attendance history
  const filteredHistory = attendanceHistory.filter(record => {
    if (!filterStartDate && !filterEndDate) return true;
    const recordDate = new Date(record.date);
    if (filterStartDate && new Date(filterStartDate) > recordDate) return false;
    if (filterEndDate && new Date(filterEndDate) < recordDate) return false;
    return true;
  });

  const displayHistory = showAll ? filteredHistory : filteredHistory.slice(0, 8);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Attendance Report', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    if (filterStartDate || filterEndDate) {
      doc.text(`Period: ${filterStartDate || 'Start'} to ${filterEndDate || 'Today'}`, 14, 36);
    }

    const tableColumn = ["Date", "Status", "In Time", "Out Time", "Total Time", "Details/Reason"];
    const tableRows = [];

    filteredHistory.forEach(record => {
      const row = [
        new Date(record.date).toLocaleDateString(),
        record.action === 'present_marked' ? 'Present' : 'Absent',
        record.data?.inTime ? formatTime(record.data.inTime) : '-',
        record.data?.outTime ? formatTime(record.data.outTime) : '-',
        record.data?.totalTime || '-',
        record.data?.reason || '-'
      ];
      tableRows.push(row);
    });

    doc.autoTable({
      startY: 45,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Attendance_Report_${Date.now()}.pdf`);
  };

  if (attendanceHistory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <Calendar className="mr-3 text-blue-600" size={24} />
          Attendance History
        </h3>
        <div className="py-8">
          <CalendarIcon size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No attendance history found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <Calendar className="mr-3 text-blue-600" size={24} />
          Attendance History
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-blue-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${selectedView === 'list'
                ? 'bg-blue-500 text-white'
                : 'text-blue-700 hover:bg-blue-200'
                }`}
            >
              Simple
            </button>
            <button
              onClick={() => setSelectedView('detailed')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${selectedView === 'detailed'
                ? 'bg-blue-500 text-white'
                : 'text-blue-700 hover:bg-blue-200'
                }`}
            >
              Detailed
            </button>
          </div>
          <button
            onClick={downloadPDF}
            className="flex items-center px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition"
          >
            <Download size={14} className="mr-1" />
            PDF
          </button>
          <span className="text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
            {filteredHistory.length} records
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
        <Filter size={16} className="text-gray-400" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">From:</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">To:</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 outline-none"
          />
        </div>
        {(filterStartDate || filterEndDate) && (
          <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="text-xs text-rose-500 hover:text-rose-700">Clear</button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {displayHistory.map((record, index) => {
          const { data: attendanceData, date, action, id } = record;
          const isPresent = action === 'present_marked';

          return (
            <div
              key={id || index}
              className={`rounded-lg border-2 transition-all hover:shadow-md ${isPresent
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300'
                : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 hover:border-red-300'
                }`}
            >
              {selectedView === 'list' ? (
                // Simple List View
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {isPresent ? (
                        <CheckCircle className="text-green-600 mr-3 flex-shrink-0" size={20} />
                      ) : (
                        <XCircle className="text-red-600 mr-3 flex-shrink-0" size={20} />
                      )}
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'
                          })}
                        </p>
                        <p className={`text-sm font-medium ${isPresent ? 'text-green-700' : 'text-red-700'}`}>
                          {isPresent ? 'Present' : 'Absent'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {isPresent ? (
                        <div className="text-gray-600 space-y-1">
                          {attendanceData.inTime && <p className="flex items-center justify-end"><Clock size={12} className="mr-1" />In: {formatTime(attendanceData.inTime)}</p>}
                          {attendanceData.outTime && <p className="flex items-center justify-end"><Clock size={12} className="mr-1" />Out: {formatTime(attendanceData.outTime)}</p>}
                          {attendanceData.totalTime && <p className="font-medium text-green-700 bg-green-100 px-2 py-1 rounded text-xs">{attendanceData.totalTime}</p>}
                        </div>
                      ) : (
                        <div className="text-red-600">
                          {attendanceData.reason && <p className="bg-red-100 px-2 py-1 rounded text-xs">{attendanceData.reason}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Detailed View with All Data
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      {isPresent ? (
                        <div className="bg-green-500 p-2 rounded-full mr-3">
                          <CheckCircle className="text-white" size={20} />
                        </div>
                      ) : (
                        <div className="bg-red-500 p-2 rounded-full mr-3">
                          <XCircle className="text-white" size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-800 text-lg">
                          {new Date(date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
                          })}
                        </p>
                        <p className={`text-sm font-medium ${isPresent ? 'text-green-700' : 'text-red-700'}`}>
                          Status: {isPresent ? 'Present' : 'Absent'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${isPresent
                        ? 'bg-green-200 text-green-800'
                        : 'bg-red-200 text-red-800'
                        }`}>
                        {isPresent ? '✓ Present' : '✗ Absent'}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white bg-opacity-60 rounded-lg p-3">
                      <h5 className="font-medium text-gray-700 mb-2">Record Details</h5>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-600">Record ID:</span> <span className="font-mono text-xs">{id || 'N/A'}</span></p>
                        <p><span className="text-gray-600">Action:</span> <span className="capitalize">{action}</span></p>
                        <p><span className="text-gray-600">Date:</span> {date}</p>
                        <p><span className="text-gray-600">Created:</span> {formatDateTime(record.createdAt)}</p>
                      </div>
                    </div>

                    <div className="bg-white bg-opacity-60 rounded-lg p-3">
                      {isPresent ? (
                        <div>
                          <h5 className="font-medium text-green-700 mb-2">Attendance Data</h5>
                          <div className="space-y-1 text-sm">
                            {attendanceData.inTime && (
                              <p><span className="text-gray-600">In Time:</span> <span className="font-medium">{formatTime(attendanceData.inTime)}</span></p>
                            )}
                            {attendanceData.outTime && (
                              <p><span className="text-gray-600">Out Time:</span> <span className="font-medium">{formatTime(attendanceData.outTime)}</span></p>
                            )}
                            {attendanceData.totalTime && (
                              <p><span className="text-gray-600">Total Time:</span> <span className="font-bold text-green-700">{attendanceData.totalTime}</span></p>
                            )}
                            <p><span className="text-gray-600">Status:</span> <span className="font-medium text-green-700">{attendanceData.status}</span></p>
                            {attendanceData.createdAt && (
                              <p><span className="text-gray-600">Data Created:</span> {formatDateTime(attendanceData.createdAt)}</p>
                            )}
                            {attendanceData.updatedAt && (
                              <p><span className="text-gray-600">Data Updated:</span> {formatDateTime(attendanceData.updatedAt)}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h5 className="font-medium text-red-700 mb-2">Absence Data</h5>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-gray-600">Status:</span> <span className="font-medium text-red-700">{attendanceData.status}</span></p>
                            {attendanceData.reason && (
                              <p><span className="text-gray-600">Reason:</span> <span className="font-medium">{attendanceData.reason}</span></p>
                            )}
                            <p><span className="text-gray-600">Date:</span> {attendanceData.date}</p>
                            {attendanceData.createdAt && (
                              <p><span className="text-gray-600">Data Created:</span> {formatDateTime(attendanceData.createdAt)}</p>
                            )}
                            {attendanceData.updatedAt && (
                              <p><span className="text-gray-600">Data Updated:</span> {formatDateTime(attendanceData.updatedAt)}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raw Data Display (for debugging/complete info) */}
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      View Raw Data
                    </summary>
                    <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(record, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredHistory.length > 8 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
          >
            {showAll ? 'Show Less' : `Show All (${filteredHistory.length})`}
          </button>
        </div>
      )}
    </div>
  );
});
AttendanceHistoryDetailed.displayName = 'AttendanceHistoryDetailed';

// Attendance Calendar using react-calendar - Memoized
const AttendanceCalendar = memo(({ attendanceHistory }) => {
  const [calDate, setCalDate] = useState(new Date());

  const getRecord = (date) => {
    const key = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString().split('T')[0];
    return attendanceHistory.find(r => r.date === key);
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const rec = getRecord(date);
    if (!rec) return '';
    if (rec.action === 'present_marked' || rec.status === 'present') return 'att-present';
    if (rec.action === 'absent_marked' || rec.status === 'absent') return 'att-absent';
    if (rec.status === 'holiday') return 'att-holiday';
    return '';
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const rec = getRecord(date);
    if (!rec) return null;
    const dot =
      rec.action === 'present_marked' || rec.status === 'present' ? '🟢' :
        rec.status === 'holiday' ? '🟡' : '🔴';
    return <div style={{ fontSize: '8px', textAlign: 'center', marginTop: '1px' }}>{dot}</div>;
  };

  return (
    <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <Calendar className="mr-3 text-blue-600" size={24} />
        Attendance Calendar
      </h3>
      <style>{`
        .att-present abbr { background:#dcfce7; border-radius:6px; padding:2px 4px; font-weight:bold; color:#15803d; }
        .att-absent  abbr { background:#fee2e2; border-radius:6px; padding:2px 4px; font-weight:bold; color:#b91c1c; }
        .att-holiday abbr { background:#fef9c3; border-radius:6px; padding:2px 4px; font-weight:bold; color:#92400e; }
        .react-calendar { width:100%; border:none; font-family:inherit; }
        .react-calendar__tile { height:56px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:6px; }
        .react-calendar__navigation button:hover { background:#eff6ff; border-radius:8px; }
      `}</style>
      <ReactCalendar
        onChange={setCalDate}
        value={calDate}
        tileClassName={tileClassName}
        tileContent={tileContent}
      />
      <div className="flex gap-6 mt-4 pt-3 border-t border-blue-100 justify-center text-sm">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Present</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Absent</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-300 inline-block" /> Holiday</span>
      </div>
    </div>
  );
});
AttendanceCalendar.displayName = 'AttendanceCalendar';

// Fees History Component - Memoized
const FeesHistory = memo(({ feesHistory }) => {
  if (feesHistory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <CreditCard className="mr-3 text-green-600" size={24} />
          Fees History
        </h3>
        <div className="py-8">
          <CreditCard size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No fees history found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <CreditCard className="mr-3 text-green-600" size={24} />
          Fees History
        </h3>
        <span className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-full font-medium">
          {feesHistory.length} transactions
        </span>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {feesHistory.map((record, index) => {
          const isPayment = record.action === 'payment';
          const isDiscount = record.action === 'discount';

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${isPayment
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isPayment ? (
                    <div className="bg-green-500 p-2 rounded-full mr-3">
                      <DollarSign className="text-white" size={16} />
                    </div>
                  ) : (
                    <div className="bg-blue-500 p-2 rounded-full mr-3">
                      <Minus className="text-white" size={16} />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 capitalize">{record.details.type}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(record.date)}</p>
                  </div>
                </div>

                <div className="text-right">
                  {isPayment ? (
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-green-700">
                        +{formatCurrency(record.details.amount)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Pending: {formatCurrency(record.details.previousPending)} → {formatCurrency(record.details.newPending)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-blue-700">
                        -{formatCurrency(record.details.discountAmount)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Total: {formatCurrency(record.details.previousTotalFees)} → {formatCurrency(record.details.newTotalFees)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Pending: {formatCurrency(record.details.previousPending)} → {formatCurrency(record.details.newPending)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
FeesHistory.displayName = 'FeesHistory';

// Complains Section Component - Memoized
const ComplainsSection = memo(({ complains }) => {
  const getComplainLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'fixed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (complains.length === 0) {
    return (
      <div className="bg-gradient-to-br from-orange-50 via-white to-red-50 border-2 border-orange-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <MessageSquare className="mr-3 text-orange-600" size={24} />
          Complains & Issues
        </h3>
        <div className="py-8">
          <Shield size={48} className="text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-700 mb-2">No Complains</h4>
          <p className="text-gray-500 text-sm">Great! No complaints or issues reported.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 via-white to-red-50 border-2 border-orange-200 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <MessageSquare className="mr-3 text-orange-600" size={24} />
          Complains & Issues
        </h3>
        <span className="text-sm text-gray-600 bg-orange-100 px-3 py-1 rounded-full font-medium">
          {complains.length} complains
        </span>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {complains.map((complain, index) => (
          <div
            key={complain.id || index}
            className="bg-white border-2 border-orange-200 rounded-lg p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-lg mb-1">{complain.complainName}</h4>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                    {complain.complainType}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getComplainLevelColor(complain.complainLevel)}`}>
                    {complain.complainLevel?.toUpperCase() || 'N/A'} Priority
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complain.status)}`}>
                    {complain.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Created: {formatDate(complain.createdAt)}</p>
                <p>Updated: {formatDate(complain.updatedAt)}</p>
              </div>
            </div>

            <p className="text-gray-700 text-sm mb-3 bg-gray-50 p-3 rounded-lg">
              {complain.reason}
            </p>

            {complain.complainRespect && (
              <div className="flex items-center text-xs text-gray-600">
                <AlertTriangle size={12} className="mr-1" />
                Respect Level: <span className="ml-1 font-medium capitalize">{complain.complainRespect}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
ComplainsSection.displayName = 'ComplainsSection';

// Exam History Component - Memoized
const ExamHistory = memo(({ examHistory }) => {
  const getPerformanceColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'average':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (examHistory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <Brain className="mr-3 text-purple-600" size={24} />
          Exam History
        </h3>
        <div className="py-8">
          <FileText size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No exam history found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-200 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <Brain className="mr-3 text-purple-600" size={24} />
          Exam History
        </h3>
        <span className="text-sm text-gray-600 bg-purple-100 px-3 py-1 rounded-full font-medium">
          {examHistory.length} exams
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {examHistory.map((exam, index) => (
          <div
            key={exam.id || index}
            className="bg-white border-2 border-purple-200 rounded-xl p-5 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-lg mb-2">{exam.examName}</h4>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                    {exam.subjectName}
                  </span>
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium">
                    {exam.examType}
                  </span>
                </div>
              </div>

              {exam.result && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800 mb-1">
                    {exam.result.percentage}%
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(exam.result.performanceStatus)}`}>
                    {exam.result.performanceStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Exam Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar size={14} className="mr-2 text-gray-500" />
                  <span className="text-gray-600">Exam Date:</span>
                  <span className="ml-2 font-medium">{exam.examDate}</span>
                </div>
                <div className="flex items-center text-sm">
                  <User size={14} className="mr-2 text-gray-500" />
                  <span className="text-gray-600">Teacher:</span>
                  <span className="ml-2 font-medium">{exam.conductTeacher}</span>
                </div>
                {exam.paper && (
                  <div className="flex items-center text-sm">
                    <FileText size={14} className="mr-2 text-gray-500" />
                    <span className="text-gray-600">Paper:</span>
                    <span className="ml-2 font-medium">{exam.paper}</span>
                  </div>
                )}
              </div>

              {exam.result && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <TrendingUp size={14} className="mr-2 text-gray-500" />
                    <span className="text-gray-600">Marks:</span>
                    <span className="ml-2 font-medium">
                      {exam.result.obtainMarks}/{exam.result.totalMarks}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar size={14} className="mr-2 text-gray-500" />
                    <span className="text-gray-600">Result Date:</span>
                    <span className="ml-2 font-medium">{exam.result.announceDate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chapters */}
            {exam.chapters && exam.chapters.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Chapters covered:</p>
                <div className="flex flex-wrap gap-1">
                  {exam.chapters.map((chapter, chapterIndex) => (
                    <span
                      key={chapterIndex}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                    >
                      {chapter}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reason if exists */}
            {exam.reason && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertTriangle size={16} className="text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Note:</p>
                    <p className="text-sm text-yellow-700">{exam.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
ExamHistory.displayName = 'ExamHistory';

// Attendance Pie Chart Component — Recharts donut
const AttendancePieChart = ({ attendanceData }) => {
  const { present, absent, total } = attendanceData;

  if (total === 0) {
    return (
      <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <PieChart className="mr-3 text-blue-600" size={24} />
          Attendance Overview
        </h3>
        <div className="py-8">
          <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No attendance records found</p>
        </div>
      </div>
    );
  }

  const presentPct = (present / total * 100).toFixed(1);
  const absentPct = (absent / total * 100).toFixed(1);
  const holiday = attendanceData.holiday || 0;
  const holidayPct = (holiday / total * 100).toFixed(1);

  const data = [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'Absent', value: absent, color: '#ef4444' },
    { name: 'Holiday', value: holiday, color: '#f59e0b' },
  ];

  return (
    <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <PieChart className="mr-3 text-blue-600" size={24} />
        Attendance Overview
      </h3>

      <div style={{ width: '100%', height: 220, position: 'relative' }}>
        <ResponsiveContainer>
          <RPieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
              paddingAngle={4} dataKey="value" stroke="none">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <RTooltip formatter={(v, n) => [`${v} days (${(v / total * 100).toFixed(1)}%)`, n]}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
          </RPieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', lineHeight: '1.2' }}>{total}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Total Days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-green-50 rounded-xl border border-green-100 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="text-green-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Present</p>
            <p className="text-xl font-bold text-green-700 leading-none">{present}</p>
            <p className="text-xs text-green-600">{presentPct}%</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <XCircle className="text-red-500" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Absent</p>
            <p className="text-xl font-bold text-red-600 leading-none">{absent}</p>
            <p className="text-xs text-red-500">{absentPct}%</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Calendar className="text-amber-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Holiday</p>
            <p className="text-xl font-bold text-amber-700 leading-none">{holiday}</p>
            <p className="text-xs text-amber-600">{holidayPct}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
AttendancePieChart.displayName = 'AttendancePieChart';

// Awards Section Component - Memoized
const AwardsSection = memo(({ awards }) => {
  if (awards.length === 0) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 border-2 border-yellow-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <Trophy className="mr-3 text-yellow-600" size={24} />
          Awards & Achievements
        </h3>
        <div className="py-8">
          <Trophy size={48} className="text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-700 mb-2">No Awards Yet</h4>
          <p className="text-gray-500 text-sm">Awards and achievements will appear here when earned.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 border-2 border-yellow-200 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <Trophy className="mr-3 text-yellow-600" size={24} />
          Awards & Achievements
        </h3>
        <span className="text-sm text-gray-600 bg-yellow-100 px-3 py-1 rounded-full font-medium">
          {awards.length} awards
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {awards.map((award, index) => (
          <div key={award.awardId || index} className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-xl p-5 hover:shadow-lg transition-all hover:scale-105 duration-300">
            <div className="flex items-start">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-full mr-4 flex-shrink-0">
                <Award className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2">{award.awardName}</h4>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">{award.awardType}</span>
                  <span className="bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                    <Star size={12} className="mr-1" />{award.position}
                  </span>
                </div>
                <p className="text-gray-700 text-sm mb-3 line-clamp-3">{award.description}</p>
                <p className="text-xs text-gray-500 flex items-center">
                  <Calendar size={12} className="mr-1" />Awarded: {formatDate(award.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
AwardsSection.displayName = 'AwardsSection';

// Main Student Profile Component
export default function Studentinfo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdFromUrl = searchParams.get('studentId');

  // State Management
  const [schoolId, setSchoolId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [awards, setAwards] = useState([]);
  const [feesHistory, setFeesHistory] = useState([]);
  const [complains, setComplains] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [documents, setDocuments] = useState({});
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, holiday: 0, total: 0 });
  const [holidays, setHolidays] = useState([]);

  // Image Preview State
  const [previewImage, setPreviewImage] = useState({ isOpen: false, url: '', title: '' });

  // Stable callback prevents sub-component re-renders on parent state changes
  const handlePreviewImage = useCallback((url, title) => {
    setPreviewImage({ isOpen: true, url, title });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewImage({ isOpen: false, url: '', title: '' });
  }, []);

  // Loading States
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isLoadingAwards, setIsLoadingAwards] = useState(true);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [isLoadingComplains, setIsLoadingComplains] = useState(true);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  // Error States
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Initialize school ID and student ID
  useEffect(() => {
    const foundSchoolId = getSchoolIdFromStorage();
    setSchoolId(foundSchoolId || DEFAULT_SCHOOL_ID);

    if (studentIdFromUrl) {
      setStudentId(studentIdFromUrl);
    }
  }, [studentIdFromUrl]);

  // Load student data when IDs are available
  useEffect(() => {
    if (schoolId && studentId) {
      loadStudentData();
      loadAttendanceHistory();
      loadAwards();
      loadFeesHistory();
      loadComplains();
      loadExamHistory();
      loadDocuments();
      loadHolidays();
    }
  }, [schoolId, studentId]);

  // Auto-hide messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // API Functions
  const loadStudentData = async () => {
    setIsLoadingStudent(true);
    setError(null);

    try {
      const apiUrl = `${API_BASE_URL}/students/${schoolId}/students/${studentId}`;
      console.log('🔍 Loading student data from:', apiUrl);

      const result = await callApiWithBackoff(apiUrl);

      if (result.success && result.data) {
        setStudent(result.data);
        setSuccess(`Student data loaded successfully`);
      } else {
        setError('Student not found');
      }
    } catch (error) {
      setError(`Failed to load student data: ${error.message}`);
    } finally {
      setIsLoadingStudent(false);
    }
  };

  const loadAttendanceHistory = async () => {
    setIsLoadingAttendance(true);

    try {
      // Use operations attendance path (matched with mark_present logic)
      const apiUrl = `${API_BASE_URL}/operations/attendance/${schoolId}/student/${studentId}`;
      console.log('📅 Loading attendance from:', apiUrl);

      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.data)) {
        const sortedHistory = result.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceHistory(sortedHistory);
      } else {
        setAttendanceHistory([]);
      }
    } catch (error) {
      console.error('❌ Failed to load attendance:', error);
      setAttendanceHistory([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const res = await callApiWithBackoff(`${API_BASE_URL}/operations/attendance/${schoolId}/holidays`);
      if (res.success) setHolidays(res.data || []);
    } catch (e) { console.error(e); }
  };

  // Compute attendance stats whenever history or holidays change
  useEffect(() => {
    if (attendanceHistory.length === 0) {
      setAttendanceStats({ present: 0, absent: 0, holiday: 0, total: 0 });
      return;
    }

    const presentCount = attendanceHistory.filter(r => (r.status || r.action) === 'present' || (r.status || r.action) === 'present_marked').length;
    const absentCount = attendanceHistory.filter(r => (r.status || r.action) === 'absent' || (r.status || r.action) === 'absent_marked').length;

    // Calculate Holidays: either from history (if marked manually) or from school-wide holidays in range
    // Range is from earliest attendance date to today
    const dates = attendanceHistory.map(r => new Date(r.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(); // up to today

    let holidayCount = 0;
    let cur = new Date(minDate);
    while (cur <= maxDate) {
      const dStr = cur.toISOString().split('T')[0];
      const isSun = cur.getDay() === 0;
      const isH = holidays.find(h => dStr >= h.fromDate && dStr <= (h.toDate || h.fromDate));

      // If it's a holiday, check if it's NOT already in attendanceHistory as present/absent
      if (isSun || isH) {
        const inHistory = attendanceHistory.find(r => r.date === dStr);
        if (!inHistory || (inHistory.status !== 'present' && inHistory.status !== 'absent')) {
          holidayCount++;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    setAttendanceStats({
      present: presentCount,
      absent: absentCount,
      holiday: holidayCount,
      total: presentCount + absentCount + holidayCount
    });
  }, [attendanceHistory, holidays]);

  const loadAwards = async () => {
    setIsLoadingAwards(true);

    try {
      const apiUrl = `${API_BASE_URL}/award/${schoolId}/students/${studentId}/awards`;
      console.log('🏆 Loading awards from:', apiUrl);

      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.data)) {
        const sortedAwards = result.data.sort((a, b) => {
          const aTime = a.createdAt._seconds || 0;
          const bTime = b.createdAt._seconds || 0;
          return bTime - aTime;
        });
        setAwards(sortedAwards);
        console.log(`🎖️ Loaded ${sortedAwards.length} awards`);
      } else {
        setAwards([]);
      }
    } catch (error) {
      console.error('❌ Failed to load awards:', error);
      setAwards([]);
    } finally {
      setIsLoadingAwards(false);
    }
  };

  const loadFeesHistory = async () => {
    setIsLoadingFees(true);

    try {
      const apiUrl = `${API_BASE_URL}/fees/${schoolId}/student/${studentId}/history`;
      console.log('💰 Loading fees history from:', apiUrl);

      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.data)) {
        const sortedFees = result.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setFeesHistory(sortedFees);
        console.log(`💳 Loaded ${sortedFees.length} fees records`);
      } else {
        setFeesHistory([]);
      }
    } catch (error) {
      console.error('❌ Failed to load fees history:', error);
      setFeesHistory([]);
    } finally {
      setIsLoadingFees(false);
    }
  };

  const loadComplains = async () => {
    setIsLoadingComplains(true);

    try {
      const apiUrl = `${API_BASE_URL}/complains/${schoolId}/student/${studentId}`;
      console.log('🚨 Loading complains from:', apiUrl);

      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.data)) {
        const sortedComplains = result.data.sort((a, b) => {
          const aTime = a.createdAt._seconds || 0;
          const bTime = b.createdAt._seconds || 0;
          return bTime - aTime;
        });
        setComplains(sortedComplains);
        console.log(`📝 Loaded ${sortedComplains.length} complains`);
      } else {
        setComplains([]);
      }
    } catch (error) {
      console.error('❌ Failed to load complains:', error);
      setComplains([]);
    } finally {
      setIsLoadingComplains(false);
    }
  };

  const loadExamHistory = async () => {
    setIsLoadingExams(true);

    try {
      const apiUrl = `${API_BASE_URL}/exam/${schoolId}/students/${studentId}/exams`;
      console.log('📚 Loading exam history from:', apiUrl);

      const result = await callApiWithBackoff(apiUrl);

      if (result.success && Array.isArray(result.data)) {
        const sortedExams = result.data.sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
        setExamHistory(sortedExams);
        console.log(`📖 Loaded ${sortedExams.length} exams`);
      } else {
        setExamHistory([]);
      }
    } catch (error) {
      console.error('❌ Failed to load exam history:', error);
      setExamHistory([]);
    } finally {
      setIsLoadingExams(false);
    }
  };

  const loadDocuments = async () => {
    setIsLoadingDocuments(true);

    try {
      const apiUrl = `${API_BASE_URL}/documentbox/${schoolId}/students/${studentId}/documents`;
      console.log('📄 Loading documents from:', apiUrl);

      const result = await callApiWithBackoff(apiUrl);

      if (result.status === 'success' && result.documents) {
        setDocuments(result.documents);
        console.log(`📋 Loaded ${Object.keys(result.documents).length} documents`);
      } else {
        setDocuments({});
      }
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
      setDocuments({});
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Navigation Functions
  const handleEditStudent = () => {
    navigate(`/dashboard/addstudent?mode=edit&studentId=${studentId}`);
  };

  const handleBackToList = () => {
    navigate('/dashboard/student');
  };

  // Image preview callbacks are defined with useCallback near the top of this component

  // Show loading if no student ID provided
  if (!studentIdFromUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader size={64} className="animate-spin text-blue-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading student profile...</h1>
          <p className="text-gray-600 mb-1">Student ID: </p>
          <p className="text-sm text-gray-500">Waiting for student information...</p>
          <div className="mt-6">
            <button onClick={() => navigate('/dashboard/student')} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm">
              <ArrowLeft size={16} className="inline mr-2" />Back to Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoadingStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-800">Loading student profile...</p>
          <p className="text-sm text-gray-600">Student ID: <span className="font-semibold">{studentId}</span></p>
        </div>
      </div>
    );
  }

  // Error State
  if (!student && !isLoadingStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertIcon size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-800 mb-2">Student Not Found</p>
          <p className="text-gray-600 mb-6">Could not load student with ID: {studentId}</p>
          <button onClick={handleBackToList} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl">
            <ArrowLeft size={16} className="inline mr-2" />Back to Students List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100">
      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={previewImage.isOpen}
        imageUrl={previewImage.url}
        title={previewImage.title}
        onClose={handleClosePreview}
      />

      {/* Success Notification */}
      {success && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 text-green-800 rounded-lg shadow-lg flex items-center max-w-sm">
          <CheckCircle size={18} className="mr-2 flex-shrink-0 text-green-600" />
          <p className="font-medium text-sm">{success}</p>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-gradient-to-r from-red-100 to-rose-100 border-2 border-red-300 text-red-800 rounded-lg shadow-lg flex items-center max-w-sm">
          <AlertIcon size={18} className="mr-2 flex-shrink-0 text-red-600" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={handleBackToList} className="mr-4 p-2 bg-white border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm">
                <ArrowLeft size={20} className="text-blue-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent mb-2">
                  Student Profile
                </h1>
                <p className="text-gray-600 text-sm">
                  Student ID: <span className="font-semibold text-blue-600">{studentId}</span> |
                  School ID: <span className="font-semibold text-blue-600">{schoolId}</span>
                </p>
              </div>
            </div>
            <button onClick={handleEditStudent} className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-red-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm">
              <Edit3 className="mr-2" size={16} />Edit Student
            </button>
          </div>
        </div>

        {/* Student Basic Info */}
        <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-red-500 p-4 rounded-full mr-6 shadow-lg">
              <User className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{student?.name || 'Student Name Not Set'}</h2>
              <p className="text-gray-600">{formatClassName(student?.className)} • Roll No: {student?.rollNumber} • Section: {student?.section}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <BookOpen className="text-blue-600 mr-2" size={20} />
                <span className="text-sm text-gray-600 font-medium">Class</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{formatClassName(student?.className)}</p>
            </div>

            <div className="bg-white border-2 border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <Users className="text-green-600 mr-2" size={20} />
                <span className="text-sm text-gray-600 font-medium">Status</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${student?.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                {student?.status === 'active' ? '✓ Active' : '○ Inactive'}
              </span>
            </div>

            <div className="bg-white border-2 border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <Calendar className="text-purple-600 mr-2" size={20} />
                <span className="text-sm text-gray-600 font-medium">Enrolled</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{formatDate(student?.createdAt)}</p>
            </div>

            <div className="bg-white border-2 border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-2">
                <Clock className="text-orange-600 mr-2" size={20} />
                <span className="text-sm text-gray-600 font-medium">Last Updated</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{formatDate(student?.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        {isLoadingDocuments ? (
          <div className="bg-gradient-to-br from-gray-50 via-white to-slate-50 border-2 border-gray-200 rounded-xl shadow-xl p-6 flex items-center justify-center mb-6">
            <div className="text-center">
              <Loader size={32} className="animate-spin text-gray-600 mx-auto mb-3" />
              <span className="text-gray-600">Loading documents...</span>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <DocumentsSection documents={documents} onPreviewImage={handlePreviewImage} />
          </div>
        )}

        {/* Attendance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            {isLoadingAttendance ? (
              <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6 flex items-center justify-center h-80">
                <div className="text-center">
                  <Loader size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
                  <span className="text-gray-600">Loading attendance...</span>
                </div>
              </div>
            ) : (
              <AttendancePieChart attendanceData={attendanceStats} />
            )}
          </div>

          <div className="lg:col-span-2">
            {isLoadingAttendance ? (
              <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6 flex items-center justify-center h-80">
                <div className="text-center">
                  <Loader size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
                  <span className="text-gray-600">Loading calendar...</span>
                </div>
              </div>
            ) : (
              <AttendanceCalendar attendanceHistory={attendanceHistory} />
            )}
          </div>
        </div>

        {/* Enhanced Attendance History with All Data */}
        {isLoadingAttendance ? (
          <div className="bg-gradient-to-br from-sky-50 via-white to-rose-50 border-2 border-blue-200 rounded-xl shadow-xl p-6 flex items-center justify-center mb-6">
            <div className="text-center">
              <Loader size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
              <span className="text-gray-600">Loading detailed attendance...</span>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <AttendanceHistoryDetailed attendanceHistory={attendanceHistory} />
          </div>
        )}

        {/* Fees and Complains Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            {isLoadingFees ? (
              <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6 flex items-center justify-center h-80">
                <div className="text-center">
                  <Loader size={32} className="animate-spin text-green-600 mx-auto mb-3" />
                  <span className="text-gray-600">Loading fees history...</span>
                </div>
              </div>
            ) : (
              <FeesHistory feesHistory={feesHistory} />
            )}
          </div>

          <div>
            {isLoadingComplains ? (
              <div className="bg-gradient-to-br from-orange-50 via-white to-red-50 border-2 border-orange-200 rounded-xl shadow-xl p-6 flex items-center justify-center h-80">
                <div className="text-center">
                  <Loader size={32} className="animate-spin text-orange-600 mx-auto mb-3" />
                  <span className="text-gray-600">Loading complains...</span>
                </div>
              </div>
            ) : (
              <ComplainsSection complains={complains} />
            )}
          </div>
        </div>

        {/* Exam History Section */}
        {isLoadingExams ? (
          <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-200 rounded-xl shadow-xl p-6 flex items-center justify-center mb-6">
            <div className="text-center">
              <Loader size={32} className="animate-spin text-purple-600 mx-auto mb-3" />
              <span className="text-gray-600">Loading exam history...</span>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <ExamHistory examHistory={examHistory} />
          </div>
        )}

        {/* Awards Section */}
        {isLoadingAwards ? (
          <div className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 border-2 border-yellow-200 rounded-xl shadow-xl p-6 flex items-center justify-center">
            <div className="text-center">
              <Loader size={32} className="animate-spin text-yellow-600 mx-auto mb-3" />
              <span className="text-gray-600">Loading awards...</span>
            </div>
          </div>
        ) : (
          <AwardsSection awards={awards} />
        )}
      </div>
    </div>
  );
}