// src/components/DocumentUpload.jsx
import React, { useState } from "react";

export default function DocumentUpload({ personId, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (personId) formData.append("personId", personId);

    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/documentUpload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed: " + response.statusText);
      }

      const resData = await response.json();

      // Pass result back to parent
      if (onUploadComplete) onUploadComplete(resData);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="border rounded px-2 py-1"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
