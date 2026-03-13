import React, { memo } from 'react';
import { MessageSquare, Shield, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../../../utils/helpers';

const ComplainsSection = memo(({ complains }) => {
  const getComplainLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'fixed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!complains || complains.length === 0) {
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
    <div className="bg-gradient-to-br from-orange-50 via-white to-red-50 border-2 border-orange-200 rounded-xl shadow-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <MessageSquare className="mr-3 text-orange-600" size={24} />
          Complains
        </h3>
        <span className="text-sm text-gray-600 bg-orange-100 px-3 py-1 rounded-full font-medium">
          {complains.length} reports
        </span>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {complains.map((complain, index) => (
          <div key={index} className="bg-white border-2 border-orange-100 rounded-xl p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-bold text-gray-800">{complain.complainName}</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(complain.status)}`}>
                {complain.status?.toUpperCase() || 'NEW'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg line-clamp-2">{complain.reason}</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className={`px-2 py-0.5 rounded-full border ${getComplainLevelColor(complain.complainLevel)}`}>
                {complain.complainLevel?.toUpperCase()} Priority
              </span>
              <span className="text-gray-400">{formatDate(complain.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ComplainsSection.displayName = 'ComplainsSection';

export default ComplainsSection;
