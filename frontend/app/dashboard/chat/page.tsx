"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, BookOpen, ChevronDown, Star, Loader } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { getApiError } from "@/lib/apiError";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  citations?: any[];
  metrics?: { retrieved: number; reranked: number; retrieval_ms: number; generation_ms: number };
  queryLogId?: number;
  rating?: number;
}

export default function ChatPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    axios.get(`${API}/api/v1/documents/`, { headers: headers() })
      .then(res => setDocuments(res.data.filter((d: any) => d.status === "ready")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedDoc || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const query = input;
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/api/v1/query/ask`, { query, document_id: selectedDoc.id }, { headers: headers() });
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: res.data.answer,
        citations: res.data.citations,
        metrics: { retrieved: res.data.retrieved_chunks, reranked: res.data.reranked_chunks, retrieval_ms: res.data.retrieval_time_ms, generation_ms: res.data.generation_time_ms },
        queryLogId: res.data.query_log_id,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error(getApiError(err, "Query failed"));
    } finally {
      setLoading(false);
    }
  };

  const rateMessage = async (queryLogId: number, rating: number, msgId: string) => {
    try {
      await axios.post(`${API}/api/v1/query/${queryLogId}/rate`, { rating }, { headers: headers() });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, rating } : m));
      toast.success("Rating submitted!");
    } catch {
      toast.error("Failed to submit rating");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return "#10b981";
    if (score >= 0.7) return "#3b82f6";
    if (score >= 0.5) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e1e2a", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Chat</h1>
          <p style={{ color: "#9090aa", fontSize: 13 }}>Ask questions with cited answers</p>
        </div>
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <select
            value={selectedDoc?.id || ""}
            onChange={e => setSelectedDoc(documents.find(d => d.id === parseInt(e.target.value)) || null)}
            className="input-field"
            style={{ paddingRight: 36, minWidth: 240, appearance: "none", cursor: "pointer" }}
          >
            <option value="">— Select a document —</option>
            {documents.map(d => <option key={d.id} value={d.id}>{d.original_filename}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#5a5a72", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#5a5a72" }}>
            <Bot size={48} />
            <p style={{ fontSize: 16 }}>{selectedDoc ? `Ask anything about "${selectedDoc.original_filename}"` : "Select a document to start chatting"}</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "85%", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                {/* Avatar */}
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: msg.role === "user" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#1e1e2a", border: "1px solid #2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {msg.role === "user" ? <User size={16} color="white" /> : <Bot size={16} color="#6366f1" />}
                </div>

                <div className={msg.role === "user" ? "chat-user" : "chat-ai"} style={{ flex: 1 }}>
                  <p style={{ lineHeight: 1.7, fontSize: 14, whiteSpace: "pre-wrap" }}>{msg.content}</p>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        <BookOpen size={12} /> Sources ({msg.citations.length})
                      </div>
                      {msg.citations.slice(0, 5).map((c, i) => {
                        const scoreVal = c.relevance_score > 1 ? c.relevance_score / 100 : c.relevance_score;
                        const displayScore = Math.min(Math.max(Math.round(scoreVal * 100), 10), 100);
                        return (
                          <div
                            key={i}
                            style={{
                              background: "rgba(255, 255, 255, 0.8)",
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              borderRadius: 8,
                              padding: "8px 12px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                            }}
                          >
                            <div style={{ fontSize: 11, color: "#0d9488", fontWeight: 700, marginBottom: 4 }}>
                              Page {c.page_number} · Match: {displayScore}%
                            </div>
                            <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.5 }}>
                              {c.text.substring(0, 220)}...
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Metrics + Rating */}
                  {msg.metrics && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {[
                        { label: `${msg.metrics.retrieved}→${msg.metrics.reranked} chunks`, color: "#9090aa" },
                        { label: `${Math.round(msg.metrics.retrieval_ms)}ms retrieval`, color: "#9090aa" },
                        { label: `${Math.round(msg.metrics.generation_ms)}ms generation`, color: "#9090aa" },
                      ].map((m, i) => (
                        <span key={i} style={{ fontSize: 11, color: m.color, background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 4, border: "1px solid #2a2a3a" }}>{m.label}</span>
                      ))}
                      {msg.queryLogId && !msg.rating && (
                        <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
                          {[1, 2, 3, 4, 5].map(r => (
                            <button key={r} onClick={() => rateMessage(msg.queryLogId!, r, msg.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 1 }}>
                              <Star size={13} color={r <= (msg.rating || 0) ? "#f59e0b" : "#2a2a3a"} fill={r <= (msg.rating || 0) ? "#f59e0b" : "none"} />
                            </button>
                          ))}
                        </div>
                      )}
                      {msg.rating && <span style={{ fontSize: 11, color: "#f59e0b" }}>★ {msg.rating}/5</span>}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e1e2a", border: "1px solid #2a2a3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} color="#6366f1" />
            </div>
            <div className="chat-ai" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #1e1e2a", padding: "16px 32px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", maxWidth: 900, margin: "0 auto" }}>
          <textarea
            className="input-field"
            style={{ flex: 1, resize: "none", minHeight: 48, maxHeight: 160, lineHeight: 1.5, paddingTop: 12 }}
            placeholder={selectedDoc ? "Ask anything about this document..." : "Select a document first..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!selectedDoc || loading}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !selectedDoc || loading}
            className="btn-primary"
            style={{ padding: "12px 16px", flexShrink: 0, opacity: (!input.trim() || !selectedDoc || loading) ? 0.5 : 1 }}
          >
            {loading ? <Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#5a5a72", marginTop: 8 }}>Enter to send · Shift+Enter for new line</p>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
