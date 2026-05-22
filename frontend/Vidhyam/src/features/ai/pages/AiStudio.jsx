import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Send, Upload, FileText, Brain, 
  ChevronRight, Mic, Download, Share2, Plus,
  Info, MessageSquare, Trash2, Zap
} from "lucide-react";
import StandardButton from "../../../components/ui/StandardButton";
import PageHeader from "../../../components/ui/PageHeader";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => localStorage.getItem("schoolId") || "";

export default function AiStudio() {
  const schoolId = getSchoolId();
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg = { role: "user", text: query };
    setChat(prev => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/${schoolId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      
      const aiResponse = data.success 
        ? (data.data.parts?.[0]?.text || data.data.answer || "I processed your request.")
        : "Sorry, I encountered an error.";

      setChat(prev => [...prev, { role: "ai", text: aiResponse }]);
    } catch (err) {
      setChat(prev => [...prev, { role: "ai", text: "Connection failed. Please check your backend." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/document_upload/${schoolId}`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        setChat(prev => [...prev, { role: "system", text: `Document "${selectedFile.name}" uploaded and indexed successfully.` }]);
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] p-1 gap-2 overflow-hidden">
      {/* Header Info */}
      <PageHeader
        title="AI"
        accentTitle="Studio"
        subtitle="Interact with school data, documents and generate study materials"
        icon={Sparkles}
        actions={[
          {
            label: "Clear History",
            onClick: () => setChat([]),
            variant: "ghost",
            size: "sm",
            icon: Trash2,
            className: "text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
          }
        ]}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-2 overflow-hidden">
        {/* Left Panel: Research Context */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full lg:w-56 flex flex-col gap-2"
        >
          <div className="border border-[var(--glass-border)] rounded-2xl bg-[var(--bg-secondary)] p-3 flex-1 flex flex-col relative overflow-hidden group">
            <h3 className="text-micro font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Context Documents</h3>
            
            <div className="space-y-1 mb-4">
              <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-[var(--glass-border)] rounded-xl cursor-pointer hover:bg-[var(--bg-main)] hover:border-primary/30 transition-all">
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mb-1.5 text-[var(--text-muted)]" />
                      <span className="text-[10px] text-[var(--text-main)] font-semibold">Upload PDF/Image</span>
                      <p className="text-[8px] text-[var(--text-muted)] mt-1">To add to AI knowledge base</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
 
            <h3 className="text-micro font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-2">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-1.5">
              <button className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--glass-border)] hover:border-primary/30 text-[var(--text-muted)] hover:text-[var(--text-main)] text-micro font-medium transition-all">
                <Brain size={13} className="text-primary" />
                <span>Generate Quiz</span>
              </button>
              <button className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--glass-border)] hover:border-violet-500/30 text-[var(--text-muted)] hover:text-[var(--text-main)] text-micro font-medium transition-all">
                <Download size={13} className="text-violet-400" />
                <span>Export to PDF</span>
              </button>
              <button className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--glass-border)] hover:border-emerald-500/30 text-[var(--text-muted)] hover:text-[var(--text-main)] text-micro font-medium transition-all">
                <Zap size={13} className="text-emerald-400" />
                <span>Sync School Data</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Center: Chat Window */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 border border-[var(--glass-border)] rounded-2xl bg-[var(--bg-secondary)] flex flex-col overflow-hidden relative"
        >
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 custom-scrollbar scroll-smooth relative bg-[var(--bg-main)]/35"
          >
            {chat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-75">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Sparkles size={24} className="text-primary animate-pulse" />
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-main)] mb-1">AI Assistant Ready</h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Ask questions about curriculum, schedules, or upload documents to get summaries.
                </p>
              </div>
            ) : (
              chat.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'system' ? 'justify-center' : ''}`}
                >
                  {msg.role === 'system' ? (
                     <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--glass-border)] font-medium">{msg.text}</span>
                  ) : (
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-[var(--bg-secondary)] text-[var(--text-main)] border border-[var(--glass-border)] rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-secondary)] px-3 py-2.5 rounded-2xl rounded-tl-none border border-[var(--glass-border)] shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-[var(--glass-border)] bg-[var(--bg-secondary)]">
            <form onSubmit={handleSend} className="relative group">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask AI anything..."
                className="w-full bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-xl h-11 pl-4 pr-24 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-all font-medium"
              />
              <div className="absolute right-1 top-1 bottom-1 flex gap-1 items-center">
                <button type="button" className="p-1 px-2 text-[var(--text-muted)] hover:text-primary transition-colors">
                  <Mic size={14} />
                </button>
                <StandardButton 
                  type="submit" 
                  disabled={!query.trim() || loading}
                  icon={Send}
                  size="xs"
                />
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
