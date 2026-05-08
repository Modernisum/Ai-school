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
    <div className="flex flex-col h-[calc(100vh-100px)] p-1 gap-1 overflow-hidden">
      {/* Header Info */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-2 flex items-center justify-between border-white/5 bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-widest uppercase italic leading-none">COGNITIVE_ENGINE</h1>
            <p className="text-micro font-black text-slate-700 uppercase tracking-widest mt-0.5">ACADEMIC_INTELLIGENCE • V2.0_STABLE</p>
          </div>
        </div>
        <div className="flex gap-1">
          <StandardButton variant="ghost" size="xs" icon={Info} />
          <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => setChat([])} className="text-rose-500" />
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col lg:flex-row gap-1 overflow-hidden">
        {/* Left Panel: Research Context */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full lg:w-48 flex flex-col gap-1"
        >
          <div className="glass-card p-3 flex-1 relative overflow-hidden group border-white/5 bg-white/[0.02]">
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] mb-3">SOURCE_NODES</p>
            
            <div className="space-y-1 mb-4">
              <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 hover:border-primary/30 transition-all">
                <div className="flex flex-col items-center justify-center">
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mb-1 text-slate-700" />
                      <p className="text-[8px] text-slate-700 font-black uppercase tracking-widest text-center">INDEX_SOURCE</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
 
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] mb-2">QUICK_OPS</p>
            <div className="grid grid-cols-1 gap-1">
              <button className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 text-slate-400 text-[10px] font-black uppercase italic tracking-widest transition-all">
                <Brain size={12} className="text-primary" /> GEN_QUIZ
              </button>
              <button className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/20 text-slate-400 text-[10px] font-black uppercase italic tracking-widest transition-all">
                <Download size={12} className="text-violet-400" /> EXPORT_PDF
              </button>
              <button className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/20 text-slate-400 text-[10px] font-black uppercase italic tracking-widest transition-all">
                <Zap size={12} className="text-emerald-400" /> SYNC_FACTS
              </button>
            </div>
          </div>
        </motion.div>

        {/* Center: Chat Window */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 glass-card flex flex-col overflow-hidden relative border-white/5 bg-white/[0.01]"
        >
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-4 custom-scrollbar scroll-smooth relative"
          >
            {chat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-30">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                  <MessageSquare size={24} className="text-slate-700" />
                </div>
                <h2 className="text-micro font-black text-white uppercase italic tracking-[0.2em] mb-1">WAITING_FOR_INPUT</h2>
                <p className="text-[8px] text-slate-700 font-black uppercase tracking-widest italic">QUERY_ACADEMIC_DATA_MATRIX</p>
              </div>
            ) : (
              chat.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'system' ? 'justify-center' : ''}`}
                >
                  {msg.role === 'system' ? (
                     <span className="text-[8px] uppercase tracking-[0.2em] text-slate-700 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-black italic">{msg.text}</span>
                  ) : (
                    <div className={`max-w-[90%] px-3 py-2 rounded-lg text-micro leading-relaxed shadow-lg font-black uppercase italic tracking-widest ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white border border-primary/20 rounded-tr-none' 
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
                <div className="bg-white/5 px-3 py-2 rounded-lg rounded-tl-none border border-white/5">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-2 border-t border-white/[0.03] bg-white/[0.01]">
            <form onSubmit={handleSend} className="relative group">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="PROMPT_NEURAL_QUERY..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg h-10 pl-4 pr-24 text-micro text-white placeholder-slate-700 focus:outline-none focus:border-primary/50 transition-all font-black uppercase italic tracking-widest"
              />
              <div className="absolute right-1 top-1 flex gap-1 items-center">
                <button type="button" className="p-1 px-2 text-slate-700 hover:text-primary transition-colors"><Mic size={14} /></button>
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
