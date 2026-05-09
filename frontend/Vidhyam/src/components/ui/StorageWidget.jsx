import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardContent, Badge, Alert } from './DesignSystem';
import { useUploadFileMutation, useDeleteFileByUrlMutation } from '../../features/storage/storageApi';
import toast from 'react-hot-toast';

/**
 * ══════════════════════════════════════ FILE UPLOADER ══════════════════════════════════════ 
 * A premium drag-and-drop file uploader with progress tracking.
 */
export const FileUploader = ({
  onUploadSuccess,
  accept = ".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf",
  maxSizeMB = 50,
  fieldName = "file",
  label = "Upload File",
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadFile, { isLoading }] = useUploadFileMutation();
  const fileInputRef = useRef(null);

  // Clean up object URL when component unmounts or preview changes
  const cleanupPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  const handleFile = async (file) => {
    if (!file) return;

    // Size validation
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File is too large. Max ${maxSizeMB}MB allowed.`);
      return;
    }

    // Extension validation based on accept prop
    if (accept) {
      const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        toast.error(`Only ${accept.replace(/\./g, '').split(',').join(', ')} files are allowed`);
        return;
      }
    }

    // Create instant preview using object URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const res = await uploadFile(formData).unwrap();
      toast.success('File uploaded successfully');
      // Clean up object URL after upload succeeds
      cleanupPreview();
      if (onUploadSuccess) onUploadSuccess(res.url);
    } catch (err) {
      toast.error(err?.data?.message || 'Upload failed');
      // Keep preview so user can retry
    }
  };

  const onDrop = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const isImage = previewUrl?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);

  return (
    <div
      onDragOver={(e) => { if (!disabled) { e.preventDefault(); setIsDragging(true); } }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`relative group border-2 border-dashed rounded-2xl p-8 transition-all duration-300 text-center
        ${disabled ? 'opacity-50 cursor-not-allowed border-white/5' : ''}
        ${isDragging 
          ? 'border-primary bg-primary/5 scale-[1.01]' 
          : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files[0])}
        accept={accept}
        className="hidden"
        disabled={disabled}
      />

      {/* Show preview when available */}
      {previewUrl && (
        <div className="mb-4">
          {isImage ? (
            <div className="w-32 h-32 mx-auto rounded-xl overflow-hidden border border-white/10">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <File className="w-8 h-8 text-slate-400" />
            </div>
          )}
          {isLoading && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </div>
          )}
          {!isLoading && (
            <p className="mt-2 text-xs text-slate-500">
              {previewUrl.split('/').pop() || 'File selected'}
            </p>
          )}
        </div>
      )}

      {!previewUrl && (
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isLoading ? 'bg-primary/20' : 'bg-white/5 group-hover:bg-primary/10 group-hover:scale-110'}`}>
            {isLoading ? (
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            ) : (
              <Upload className={`w-7 h-7 ${isDragging ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">{label}</h4>
            <p className="text-xs text-slate-500 mt-1">Drag and drop or click to browse</p>
          </div>

          <Button
            type="button"
            size="small"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="mt-2"
          >
            Select File
          </Button>
        </div>
      )}

      {!previewUrl && isLoading && (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          className="absolute bottom-0 left-0 h-1 bg-primary/40 rounded-b-2xl overflow-hidden"
        >
          <motion.div 
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-1/2 h-full bg-primary"
          />
        </motion.div>
      )}
    </div>
  );
};

/**
 * ══════════════════════════════════════ FILE PREVIEW & DELETE ══════════════════════════════════════ 
 * Displays an uploaded file with preview and delete functionality.
 */
export const FilePreview = ({ url, onRemove, label = "Attached File", disabled = false }) => {
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileByUrlMutation();
  const isImage = url?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || url?.includes('/uploads/');

  const handleDelete = async () => {
    if (disabled) return;
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await deleteFile(url).unwrap();
      toast.success('File deleted');
      if (onRemove) onRemove();
    } catch (err) {
      toast.error('Failed to delete file');
      // Even if API fails, we might want to clear it from UI if user insisted
      if (onRemove) onRemove();
    }
  };

  if (!url) return null;

  return (
    <Card className="overflow-hidden border-white/5 bg-white/[0.03]">
      <div className="flex items-center gap-4">
        {/* Preview Section */}
        <div className="w-16 h-16 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10">
          {isImage ? (
            <img
              src={url.startsWith('http') ? url : url.startsWith('/uploads') ? `${window.location.origin}${url}` : `${import.meta.env.VITE_API_BASE_URL || ''}${url}`}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = ''; e.target.className = 'hidden'; }}
            />
          ) : (
            <File className="w-6 h-6 text-slate-500" />
          )}
        </div>

        {/* Info Section */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
            <Badge variant="success" className="py-0 px-1.5 text-[10px]">Active</Badge>
          </div>
          <p className="text-sm text-white truncate font-mono opacity-60">
            {url.split('/').pop()}
          </p>
        </div>

        {/* Action Section */}
        {!disabled && (
          <Button
            variant="danger"
            size="small"
            className="h-10 w-10 !p-0 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

/**
 * ══════════════════════════════════════ FILE UPDATE COMPONENT ══════════════════════════════════════ 
 * A composite component for managing a single file field (Upload -> Preview -> Update).
 */
export const ImageUploadField = ({
  value,
  onChange,
  label = "Profile Image",
  fieldName = "profile",
  className = "",
  disabled = false,
  accept = ".jpg,.jpeg,.png,.webp"
}) => {
  const [showUploader, setShowUploader] = useState(!value);

  const handleUploadSuccess = (url) => {
    onChange(url);
    setShowUploader(false);
  };

  const handleRemove = () => {
    onChange('');
    setShowUploader(true);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <label className="text-sm font-semibold text-slate-300">{label}</label>
        {value && !showUploader && !disabled && (
          <button 
            onClick={() => setShowUploader(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Change
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showUploader ? (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
              <FileUploader
                onUploadSuccess={handleUploadSuccess}
                fieldName={fieldName}
                accept={accept}
                label={`Click to upload ${label.toLowerCase()}`}
                disabled={disabled}
              />
            {value && (
              <button 
                onClick={() => setShowUploader(false)}
                className="w-full text-center text-xs text-slate-500 mt-2 hover:text-slate-300"
              >
                Cancel Update
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <FilePreview url={value} onRemove={handleRemove} label={label} disabled={disabled} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
