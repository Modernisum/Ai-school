import React, { useState, memo } from 'react';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { PieChart as RPieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { 
  Calendar, CheckCircle, XCircle, Clock, Download, Filter, 
  ChevronLeft, ChevronRight, PieChart as PieChartIcon 
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatTime, formatDateTime } from '../../../../utils/helpers';

// Attendance Pie Chart Sub-component
const AttendanceStats = ({ attendanceStats }) => {
  const { present, absent, holiday, total } = attendanceStats;
  
  if (total === 0) return null;

  const data = [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'Absent', value: absent, color: '#ef4444' },
    { name: 'Holiday', value: holiday, color: '#f59e0b' },
  ];

  return (
    <div className="bg-white border-2 border-blue-100 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <PieChartIcon className="mr-2 text-blue-600" size={20} />
        Overview
      </h3>
      <div className="h-48 relative">
        <ResponsiveContainer>
          <RPieChart>
            <Pie 
              data={data} 
              innerRadius={50} 
              outerRadius={70} 
              paddingAngle={4} 
              dataKey="value" 
              stroke="none"
            >
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <RTooltip />
          </RPieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-800">{total}</span>
          <span className="text-xs text-gray-500">Total</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="bg-green-50 p-2 rounded-lg">
          <p className="text-xs text-green-600 font-medium">Present</p>
          <p className="text-lg font-bold text-green-700">{present}</p>
        </div>
        <div className="bg-red-50 p-2 rounded-lg">
          <p className="text-xs text-red-600 font-medium">Absent</p>
          <p className="text-lg font-bold text-red-700">{absent}</p>
        </div>
        <div className="bg-amber-50 p-2 rounded-lg">
          <p className="text-xs text-amber-600 font-medium">Holiday</p>
          <p className="text-lg font-bold text-amber-700">{holiday}</p>
        </div>
      </div>
    </div>
  );
};

// Attendance Calendar Sub-component
const AttendanceGrid = ({ attendanceHistory }) => {
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

  return (
    <div className="bg-white border-2 border-blue-100 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Calendar className="mr-2 text-blue-600" size={20} />
        Calendar
      </h3>
      <style>{`
        .att-present abbr { background:#dcfce7; border-radius:6px; padding:2px 4px; font-weight:bold; color:#15803d; }
        .att-absent  abbr { background:#fee2e2; border-radius:6px; padding:2px 4px; font-weight:bold; color:#b91c1c; }
        .att-holiday abbr { background:#fef9c3; border-radius:6px; padding:2px 4px; font-weight:bold; color:#92400e; }
        .react-calendar { width:100%; border:none; font-family:inherit; }
        .react-calendar__tile { height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
      `}</style>
      <ReactCalendar
        onChange={setCalDate}
        value={calDate}
        tileClassName={tileClassName}
      />
    </div>
  );
};

// Detailed History Sub-component
const AttendanceList = ({ attendanceHistory }) => {
  const [showAll, setShowAll] = useState(false);
  const displayHistory = showAll ? attendanceHistory : attendanceHistory.slice(0, 5);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Attendance Report', 14, 20);
    const tableRows = attendanceHistory.map(r => [
      r.date, 
      r.action === 'present_marked' ? 'Present' : 'Absent',
      r.data?.inTime ? formatTime(r.data.inTime) : '-',
      r.data?.outTime ? formatTime(r.data.outTime) : '-'
    ]);
    doc.autoTable({
      head: [['Date', 'Status', 'In', 'Out']],
      body: tableRows,
      startY: 30
    });
    doc.save('attendance.pdf');
  };

  return (
    <div className="bg-white border-2 border-blue-100 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Clock className="mr-2 text-blue-600" size={20} />
          History
        </h3>
        <button onClick={downloadPDF} className="flex items-center text-xs bg-rose-500 text-white px-2 py-1 rounded hover:bg-rose-600 transition">
          <Download size={14} className="mr-1" /> PDF
        </button>
      </div>
      <div className="space-y-3">
        {displayHistory.map((rec, i) => (
          <div key={i} className={`p-3 rounded-lg border flex justify-between items-center ${
            rec.action === 'present_marked' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
          }`}>
            <div>
              <p className="font-medium text-gray-800">{rec.date}</p>
              <p className={`text-xs ${rec.action === 'present_marked' ? 'text-green-600' : 'text-red-600'}`}>
                {rec.action === 'present_marked' ? 'Present' : 'Absent'}
              </p>
            </div>
            {rec.action === 'present_marked' && rec.data?.totalTime && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                {rec.data.totalTime}
              </span>
            )}
          </div>
        ))}
        {attendanceHistory.length > 5 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition"
          >
            {showAll ? 'Show Less' : `View All (${attendanceHistory.length})`}
          </button>
        )}
      </div>
    </div>
  );
};

const AttendanceSection = memo(({ attendanceHistory, attendanceStats }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AttendanceStats attendanceStats={attendanceStats} />
        </div>
        <div className="lg:col-span-2">
          <AttendanceGrid attendanceHistory={attendanceHistory} />
        </div>
      </div>
      <AttendanceList attendanceHistory={attendanceHistory} />
    </div>
  );
});

AttendanceSection.displayName = 'AttendanceSection';

export default AttendanceSection;
