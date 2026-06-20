import React, { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import AiChatWindow from "../components/AiChatWindow";
import AiContextSidebar from "../components/AiContextSidebar";
import { API_BASE_URL, getSchoolIdFromStorage, getTokenFromStorage } from "../../../utils/api";

export default function AiStudio() {
  const schoolId = getSchoolIdFromStorage() || "default";
  const token = getTokenFromStorage();

  const [chatHistory, setChatHistory] = useState([]);
  const [query, setQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem(`ai_session_${schoolId}`) || null;
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Autocomplete suggestions
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const streamBufferRef = useRef(""); // accumulates raw SSE content for XML stripping

  // Authentication configuration
  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  });

  // Stop generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  // Fetch history for default session
  const fetchHistory = async (sessionId) => {
    if (!token || !sessionId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/school/${schoolId}/ai/session/${sessionId}/history`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setChatHistory(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch session history:", err);
    }
  };

  // Auto-scroll chat window
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  // Initialize or fetch single session
  useEffect(() => {
    const initializeSession = async () => {
      let currentSessionId = localStorage.getItem(`ai_session_${schoolId}`);
      if (!currentSessionId) {
        try {
          const res = await fetch(`${API_BASE_URL}/school/${schoolId}/ai/session`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ title: "Vidhyam AI Chat" })
          });
          const data = await res.json();
          if (data.success && data.session_id) {
            currentSessionId = data.session_id;
            localStorage.setItem(`ai_session_${schoolId}`, currentSessionId);
            setActiveSessionId(currentSessionId);
          }
        } catch (err) {
          console.error("Failed to create session:", err);
          return;
        }
      }
      
      if (currentSessionId) {
        await fetchHistory(currentSessionId);
      }
    };

    initializeSession();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [schoolId]);

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (query.trim().length < 3) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/school/${schoolId}/ai/suggest?q=${encodeURIComponent(query)}`, {
          headers: getHeaders()
        });
        const data = await res.json();
        if (data.success && data.suggestions) {
          setAutocompleteSuggestions(data.suggestions);
          setShowAutocomplete(data.suggestions.length > 0);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, schoolId, token]);

  // Send message — Stream implementation
  const handleSend = async (e, overrideQuery) => {
    if (e) e.preventDefault();
    const userQuery = (overrideQuery || query).trim();
    if (!userQuery || loading || !activeSessionId) return;
    setQuery("");
    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    streamBufferRef.current = ""; // reset buffer for new message

    // Optimistically update history locally
    const userMsgId = Date.now();
    const aiMsgId = userMsgId + 1;
    
    setChatHistory(prev => [
      ...prev, 
      { id: userMsgId, role: "user", content: userQuery, created_at: new Date().toISOString() },
      { id: aiMsgId, role: "model", content: "", created_at: new Date().toISOString(), isStreaming: true }
    ]);

    try {
      const res = await fetch(`${API_BASE_URL}/school/${schoolId}/ai/session/${activeSessionId}/query/stream`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ query: userQuery }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (let line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr) {
                try {
                  const dataObj = JSON.parse(dataStr);
                  if (dataObj.answer) {
                    // Accumulate into buffer and do full XML strip before displaying.
                    // This is the frontend safety net for any partial tags that leak.
                    streamBufferRef.current += dataObj.answer;
                    let buf = streamBufferRef.current;

                    // Remove complete thought blocks
                    buf = buf.replace(/<thought[\s\S]*?<\/thought>/gi, "");
                    // Remove open/partial thought block (still streaming)
                    buf = buf.replace(/<thought[\s\S]*$/i, "");
                    // Remove complete sql blocks (executed server-side)
                    buf = buf.replace(/<sql>[\s\S]*?<\/sql>/gi, "");
                    // Remove open/partial sql block
                    buf = buf.replace(/<sql[\s\S]*$/i, "");
                    // Strip message wrapper tags
                    buf = buf.replace(/<\/?message>/gi, "");
                    buf = buf.trim();

                    if (buf !== undefined) {
                      setChatHistory(prev => prev.map(msg =>
                        msg.id === aiMsgId ? { ...msg, content: buf } : msg
                      ));
                    }
                  } else if (dataObj.suggestions) {
                    // Update chat history with related prompts
                    setChatHistory(prev => prev.map(msg =>
                      msg.id === aiMsgId ? { ...msg, relatedPrompts: dataObj.suggestions } : msg
                    ));
                  }
                } catch (e) {
                  // Partial JSON chunk, ignore until complete
                }
              }
            }
          }
        }
      }
      
      // Stream finished — mark complete. Do NOT re-fetch from DB here
      // because fetchHistory() would replace our rich local state with the
      // plain DB text, causing messages to appear to vanish.
      setChatHistory(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
      ));

    } catch (err) {
      if (err.name === 'AbortError') {
        setChatHistory(prev => prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, content: msg.content + "\n\n> [!WARNING]\n> Generation stopped by user.", isStreaming: false } : msg
        ));
      } else {
        setChatHistory(prev => prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, content: msg.content + "\n\n> [!CAUTION]\n> **Network Disconnected**: Stream interrupted. Please check your internet connection or backend server and try again.", isStreaming: false } : msg
        ));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Tag-Based Studio Tools
  const handleStudioAction = (actionId) => {
    let tag = "";
    switch (actionId) {
      case 'data_table': tag = "@DataTable"; break;
      case 'slide_deck': tag = "@SlideDeck"; break;
      case 'reports': tag = "@DetailedReport"; break;
      case 'db_analyzer': tag = "@DbAnalyzer"; break;
      case 'chart': tag = "@Chart"; break;
      case 'fee_analytics': tag = "@FeeAnalytics"; break;
      default: return;
    }
    
    setQuery(prev => prev ? `${prev} ${tag} ` : `${tag} `);
    setTimeout(() => {
      const input = document.querySelector('textarea, input[type="text"]');
      if (input) input.focus();
    }, 10);
  };

  // Document context uploads
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/document_upload/${schoolId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        setChatHistory(prev => [...prev, { 
          id: Date.now(), 
          role: "system", 
          content: `Document "${selectedFile.name}" has been successfully uploaded and indexed into the school context.`, 
          created_at: new Date().toISOString() 
        }]);
      } else {
        alert("Upload failed. Check if document format is supported.");
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  const handleInvalidateCache = async (questionText) => {
    try {
      const res = await fetch(`${API_BASE_URL}/school/${schoolId}/ai/cache/invalidate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question_text: questionText })
      });
      const data = await res.json();
      if (data.success) {
        alert("Cache cleared for this query. Ask again to get a fresh AI response!");
      } else {
        alert("Failed to clear cache for this query.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to clear cache.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] p-3 gap-3 overflow-hidden">
      {/* Header Info */}
      <PageHeader
        title="AI"
        accentTitle="Studio"
        subtitle="Interact with school data, run deep analytics, and build curriculum plans"
        icon={Sparkles}
        actions={[]}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden min-h-0">
        <AiChatWindow
          chatHistory={chatHistory}
          loading={loading}
          query={query}
          setQuery={setQuery}
          handleSend={handleSend}
          handleStopGeneration={handleStopGeneration}
          handleInvalidateCache={handleInvalidateCache}
          scrollRef={scrollRef}
          autocompleteSuggestions={autocompleteSuggestions}
          showAutocomplete={showAutocomplete}
          setShowAutocomplete={setShowAutocomplete}
        />

        {/* Right Sidebar: Context & Document uploads */}
        <AiContextSidebar
          handleStudioAction={handleStudioAction}
          uploading={uploading}
          handleFileUpload={handleFileUpload}
        />
      </div>
    </div>
  );
}
