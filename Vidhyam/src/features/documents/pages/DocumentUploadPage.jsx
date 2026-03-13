// src/features/documents/pages/DocumentUploadPage.jsx
import React, { useState, useEffect } from "react";
import { Upload, File, Loader, CheckCircle, AlertTriangle } from "lucide-react";

export default function DocumentUploadPage({ personId, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [schoolId, setSchoolId] = useState("");

  useEffect(() => {
    const sid = localStorage.getItem("schoolId") || "622079";
    setSchoolId(sid);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus({ type: "", message: "" });
    }
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus({ type: "error", message: "Please select a file to upload" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      // 1. Get Signed URL for Upload
      const urlRes = await fetch(`${API_BASE}/storage/upload-url?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`);
      
      if (!urlRes.ok) throw new Error("Failed to get GCS upload URL");
      
      const urlData = await urlRes.json();
      const { uploadUrl, fileUrl } = urlData;

      // 2. Upload directly to GCS
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file to Google Cloud Storage");

      // 3. Register document in backend
      const payload = {
        doc_type: file.type.includes("pdf") ? "document" : "image",
        fileUrl: fileUrl,
        user_id: personId || "school_admin", // fallback for generic uploads
      };

      const registerRes = await fetch(`${API_BASE}/document_upload/${schoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!registerRes.ok) throw new Error("Failed to register document in database");

      const resData = await registerRes.json();

      setStatus({ type: "success", message: "Document uploaded successfully!" });
      setFile(null); // Reset file input

      if (onUploadComplete) onUploadComplete(resData);
    } catch (err) {
      console.error("Upload Error:", err);
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
            <Upload size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Upload Document</h2>
            <p className="text-gray-500 text-sm">Upload files directly to secure cloud storage</p>
          </div>
        </div>

        {status.message && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${status.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
            {status.type === "error" ? <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} /> : <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
                ${file ? "border-indigo-400 bg-indigo-50/50" : "border-gray-300 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300"}
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <File className="w-10 h-10 mb-3 text-indigo-500" />
                    <p className="mb-2 text-sm text-indigo-700 font-semibold">{file.name}</p>
                    <p className="text-xs text-indigo-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold text-indigo-600 hover:text-indigo-500">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">PDF, PNG, JPG (Max: 10MB)</p>
                  </>
                )}
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-white font-semibold shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              ${loading || !file 
                ? "bg-indigo-400 cursor-not-allowed opacity-70" 
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-indigo-500/25"}
            `}
          >
            {loading ? (
              <>
                <Loader className="animate-spin -ml-1 mr-2" size={18} />
                Uploading to Cloud...
              </>
            ) : (
              "Upload File"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
