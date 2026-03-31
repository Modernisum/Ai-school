import React, { memo } from 'react';
import { X as CloseIcon } from 'lucide-react';

const ImagePreviewModal = memo(({ isOpen, imageUrl, title, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative max-w-5xl w-full h-auto max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">{title || 'Image Preview'}</h3>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-all"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="p-2 bg-gray-50 flex items-center justify-center overflow-auto max-h-[calc(90vh-70px)]">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full h-auto rounded-lg shadow-sm object-contain"
          />
        </div>
      </div>
    </div>
  );
});

ImagePreviewModal.displayName = 'ImagePreviewModal';

export default ImagePreviewModal;
