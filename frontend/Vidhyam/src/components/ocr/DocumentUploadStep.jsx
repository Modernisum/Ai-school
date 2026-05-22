import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, SkipForward, ArrowRight } from 'lucide-react';
import { getSchoolIdFromStorage } from '../../utils/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const getSchoolId = () => getSchoolIdFromStorage() || '';

const DOCUMENT_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card', icon: '🪪' },
  { value: 'pan', label: 'PAN Card', icon: '💳' },
  { value: 'tc', label: 'TC / Transfer Certificate', icon: '📄' },
  { value: 'marksheet', label: 'Marksheet', icon: '📋' },
  { value: 'birth_certificate', label: 'Birth Certificate', icon: '👶' },
];

export default function DocumentUploadStep({
  entityType,
  onAutoFill,
  onSkip,
  autoFillFields,
}) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [docType, setDocType] = useState('aadhaar');

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    const newDocs = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch(`${API_BASE}/storage/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          body: formData,
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

        const uploadJson = await uploadRes.json();
        const fileUrl = uploadJson.url || uploadJson.data?.url;

        if (!fileUrl) throw new Error('No URL returned from upload');

        newDocs.push({
          id: Date.now() + Math.random(),
          file,
          fileUrl,
          docType,
          name: file.name,
          status: 'uploaded',
        });
      } catch (err) {
        newDocs.push({
          id: Date.now() + Math.random(),
          file,
          docType,
          name: file.name,
          status: 'error',
          error: err.message,
        });
      }
    }

    setDocs((prev) => [...prev, ...newDocs]);
    setUploading(false);
  }, [docType]);

  const removeDoc = useCallback((id) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setExtractedData(null);
    setError(null);
  }, []);

  const runOcrExtraction = useCallback(async () => {
    const uploadedDocs = docs.filter((d) => d.status === 'uploaded' && d.fileUrl);
    if (uploadedDocs.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const schoolId = getSchoolId();

      if (uploadedDocs.length === 1) {
        const doc = uploadedDocs[0];
        const res = await fetch(`${API_BASE}/ocr/${schoolId}/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ fileUrl: doc.fileUrl, docType: doc.docType }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || 'OCR extraction failed');
        }

        const json = await res.json();
        setExtractedData(json.data?.extractedFields || {});
      } else {
        const files = uploadedDocs.map((d) => ({ fileUrl: d.fileUrl, docType: d.docType }));
        const res = await fetch(`${API_BASE}/ocr/${schoolId}/extract-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ files }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || 'Batch OCR extraction failed');
        }

        const json = await res.json();
        setExtractedData(json.data?.mergedFields || {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }, [docs]);

  const handleAutoFill = useCallback(() => {
    if (extractedData && onAutoFill) {
      onAutoFill(extractedData);
    }
  }, [extractedData, onAutoFill]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-3">
          <Upload size={20} className="text-primary" />
        </div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">Upload Document for Auto-Fill</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Upload an Aadhaar, PAN, TC, or Marksheet to auto-fill the form
        </p>
      </div>

      {/* Document Type Selector */}
      <div>
        <label className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
          Document Type
        </label>
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((dt) => (
            <button
              key={dt.value}
              type="button"
              onClick={() => setDocType(dt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                docType === dt.value
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-[var(--bg-main)] border-[var(--glass-border)] text-[var(--text-muted)] hover:border-primary/25'
              }`}
            >
              {dt.icon} {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[var(--glass-border)] rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-[var(--bg-main)] transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
        <p className="text-xs text-[var(--text-muted)]">
          Drop files here or click to upload
        </p>
        <p className="text-[10px] text-[var(--text-muted)] opacity-60 mt-1">
          Supports JPG, PNG, PDF
        </p>
      </div>

      {/* Uploaded Documents */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            Uploaded Documents ({docs.length})
          </label>
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                doc.status === 'error'
                  ? 'border-red-500/20 bg-red-500/5'
                  : 'border-[var(--glass-border)] bg-[var(--bg-main)]'
              }`}
            >
              <FileText size={14} className="text-[var(--text-muted)] shrink-0" />
              <span className="flex-1 text-[var(--text-main)] truncate">{doc.name}</span>
              {doc.status === 'error' ? (
                <span className="text-red-400 text-[10px]">{doc.error}</span>
              ) : (
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => removeDoc(doc.id)}
                className="text-[var(--text-muted)] hover:text-red-450 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Extract Button */}
      {docs.some((d) => d.status === 'uploaded') && !extractedData && (
        <button
          type="button"
          onClick={runOcrExtraction}
          disabled={processing}
          className="w-full py-2 rounded-xl text-xs font-bold bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-all disabled:opacity-50"
        >
          {processing ? 'Processing via AI...' : 'Extract Data from Documents'}
        </button>
      )}

      {/* Processing Indicator */}
      {processing && (
        <div className="text-center py-4">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-[var(--text-muted)]">AI is analyzing document...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 border border-red-500/20 rounded-lg bg-red-500/5 text-xs text-red-400">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Extracted Fields Preview */}
      {extractedData && Object.keys(extractedData).length > 0 && (
        <div className="border border-emerald-500/20 rounded-xl bg-emerald-500/[0.02] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Extracted Fields
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {Object.entries(extractedData).map(([key, value]) => (
              value !== null && value !== '' && (
                <div key={key} className="flex gap-1 text-xs">
                  <span className="text-[var(--text-muted)] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="text-[var(--text-main)] truncate">{String(value)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {extractedData && (
          <button
            type="button"
            onClick={handleAutoFill}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all"
          >
            <ArrowRight size={14} className="inline mr-1" />
            Auto-Fill Form
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-main)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] transition-all"
        >
          <SkipForward size={14} className="inline mr-1" />
          Skip & Fill Manually
        </button>
      </div>
    </div>
  );
}
