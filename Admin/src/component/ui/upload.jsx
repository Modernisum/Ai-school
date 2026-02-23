import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL + "/document_upload";

export default function DocumentUpload({ studentId }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const schoolId = localStorage.getItem("schoolId");

  const handleFileChange = async (e) => {
    if (!e.target.files[0]) return;
    setFile(e.target.files[0]);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return alert("⚠️ Please select a file first");
    if (!schoolId) return alert("❌ School ID not found in localStorage");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/${schoolId}/student/${studentId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed: " + response.statusText);
      }

      const resData = await response.json();
      setResult(resData);
      alert("✅ Uploaded successfully!");
      setFile(null);
    } catch (err) {
      console.error("Upload failed", err);
      alert("❌ Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 border rounded-lg bg-gray-50 shadow-sm w-full max-w-md">
      <h3 className="text-lg font-semibold">Upload Document</h3>

      <div className="flex items-center gap-3">
        <input
          type="file"
          onChange={handleFileChange}
          className="border p-1 rounded w-full"
        />
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* Show uploaded document info */}
      {result && (
        <div className="border p-3 rounded bg-white flex flex-col gap-2">
          <p>
            <strong>Document Type:</strong> {result.documentType}
          </p>
          <p>
            <strong>File URL:</strong>{" "}
            <a
              href={result.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              View
            </a>
          </p>
          <button
            onClick={() => window.open(result.fileUrl, "_blank")}
            className="mt-2 bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
          >
            Load
          </button>
        </div>
      )}
    </div>
  );
}
