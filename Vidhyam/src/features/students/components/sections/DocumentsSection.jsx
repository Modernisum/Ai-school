import React, { memo } from 'react';
import { FileText, Upload, File, Eye, ExternalLink, CreditCard as IdCard, GraduationCap as MarkSheet, Award } from 'lucide-react';
import { formatDate } from '../../../../utils/helpers';

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
              className={`bg-gradient-to-r ${colorClass} border-2 rounded-xl p-5 hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-80 p-3 rounded-full mr-4 shadow-sm">
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
                      className="p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-lg transition-all text-gray-700 hover:text-blue-600 shadow-sm"
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
                      className="p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-lg transition-all text-gray-700 hover:text-green-600 shadow-sm"
                      title="Open in New Tab"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              {/* Document Details Overlay */}
              <div className="bg-white bg-opacity-40 rounded-lg p-3">
                <p className="text-xs text-gray-500 italic">Click preview or open to view document details.</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

DocumentsSection.displayName = 'DocumentsSection';

export default DocumentsSection;
