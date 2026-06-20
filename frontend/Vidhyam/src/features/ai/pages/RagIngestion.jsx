import React, { useState } from "react";
import { Database, UploadCloud } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { API_BASE_URL, getSchoolIdFromStorage, getTokenFromStorage } from "../../../utils/api";
import { toast } from "react-toastify";

export default function RagIngestion() {
  const schoolId = getSchoolIdFromStorage() || "default";
  const token = getTokenFromStorage();

  const [docId, setDocId] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!docId.trim() || !text.trim()) {
      toast.error("Document ID and Text are required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/school/${schoolId}/ai/chat/rag/ingest/${schoolId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ doc_id: docId, text })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully ingested ${data.data.inserted_chunks} chunks.`);
        setDocId("");
        setText("");
      } else {
        toast.error(data.message || "Failed to ingest document");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="RAG"
        accentTitle="Ingestion"
        subtitle="Ingest school policies, rules, and notices for the AI to understand."
        icon={Database}
      />
      
      <div className="mt-6 max-w-4xl bg-gray-900 border border-gray-800 p-6 rounded-lg">
        <form onSubmit={handleIngest} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Document ID / Title</label>
            <input 
              type="text" 
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
              placeholder="e.g. late_fee_policy_2026"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Document Text Content</label>
            <textarea 
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white h-64"
              placeholder="Paste the text content of your document here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-md font-medium transition-colors"
          >
            {loading ? "Processing..." : (
              <>
                <UploadCloud size={18} />
                Ingest Document to Knowledge Base
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
