import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Send, Upload, FileText, Brain, 
  ChevronRight, Mic, Download, Share2, Plus,
  Info, MessageSquare, Trash2, Zap
} from "lucide-react";

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
    <div className="flex flex-col h-[calc(100vh-100px)] p-4 lg:p-6 gap-6 overflow-hidden">
      {/* Header Info */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Studio <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded-full uppercase ml-2">Beta</span></h1>
            <p className="text-xs text-slate-400">NotebookLM-powered Academic Assistant</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="icon-btn bg-white/5 hover:bg-white/10 text-slate-300"><Info size={18} /></button>
          <button className="icon-btn bg-rose-500/10 hover:bg-rose-500/20 text-rose-400" onClick={() => setChat([])}><Trash2 size={18} /></button>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Left Panel: Research Context */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full lg:w-72 flex flex-col gap-4"
        >
          <div className="glass-card p-5 flex-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
            <p className="section-label mb-4">Source Documents</p>
            
            <div className="space-y-3 mb-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 hover:border-indigo-500/30 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2 text-slate-500" />
                      <p className="text-xs text-slate-400 font-medium tracking-tight">Drop school PDF or Image</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>

            <p className="section-label mb-3">Quick Actions</p>
            <div className="grid grid-cols-1 gap-2">
              <button className="quick-action-btn flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/20 text-slate-300 text-xs transition-all">
                <Brain size={16} className="text-indigo-400" />
                Generate Quiz
              </button>
              <button className="quick-action-btn flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/20 text-slate-300 text-xs transition-all">
                <Download size={16} className="text-violet-400" />
                Report as PDF
              </button>
              <button className="quick-action-btn flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 text-slate-300 text-xs transition-all">
                <Zap size={16} className="text-emerald-400" />
                Extract Facts
              </button>
            </div>
          </div>
        </motion.div>

        {/* Center: Chat Window */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 glass-card flex flex-col overflow-hidden relative"
        >
          {/* Chat Background Decor */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
          
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar scroll-smooth relative"
          >
            {chat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <MessageSquare size={32} className="text-slate-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">How can I help you today?</h2>
                <p className="text-sm text-slate-400">Ask about student performance, fees, or search through uploaded school documents.</p>
              </div>
            ) : (
              chat.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'system' ? 'justify-center' : ''}`}
                >
                  {msg.role === 'system' ? (
                     <span className="text-[10px] uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">{msg.text}</span>
                  ) : (
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white/5 text-slate-100 border border-white/5 rounded-tl-none backdrop-blur-sm'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5">
                  <div className="flex gap-1.5 size-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-900/40 border-t border-white/[0.03]">
            <form onSubmit={handleSend} className="relative group">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything about your school..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-24 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all group-hover:border-white/20"
              />
              <div className="absolute right-2 top-2 flex gap-1">
                <button type="button" className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"><Mic size={18} /></button>
                <button 
                  type="submit" 
                  disabled={!query.trim() || loading}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 p-2.5 rounded-xl text-white transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
