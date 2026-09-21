"use client";
import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock, Loader } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { getApiError } from "@/lib/apiError";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const statusConfig: Record<string, any> = {
  ready: { label: "Ready", icon: <CheckCircle size={13} />, cls: "status-ready" },
  processing: { label: "Processing", icon: <Loader size={13} className="spin" />, cls: "status-processing" },
  uploaded: { label: "Queued", icon: <Clock size={13} />, cls: "status-uploaded" },
  failed: { label: "Failed", icon: <AlertCircle size={13} />, cls: "status-failed" },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/v1/documents/`, { headers: headers() });
      setDocuments(res.data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    // Poll every 5s to update processing status
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      try {
        await axios.post(`${API}/api/v1/documents/upload`, formData, {
          headers: { ...headers(), "Content-Type": "multipart/form-data" },
        });
        toast.success(`"${file.name}" uploaded! Processing started.`);
        fetchDocuments();
      } catch (err: any) {
        toast.error(getApiError(err, `Failed to upload ${file.name}`));
      } finally {
        setUploading(false);
      }
    }
  }, [fetchDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"], "text/plain": [".txt"] },
    maxSize: 50 * 1024 * 1024,
  });

  const deleteDocument = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await axios.delete(`${API}/api/v1/documents/${id}`, { headers: headers() });
      toast.success("Document deleted");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div style={{ padding: "36px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Documents</h1>
          <p style={{ color: "#9090aa", fontSize: 14 }}>{documents.length} document{documents.length !== 1 ? "s" : ""} in your library</p>
        </div>
        <button onClick={fetchDocuments} style={{ background: "none", border: "1px solid #2a2a3a", borderRadius: 8, padding: "8px 14px", color: "#9090aa", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Upload Zone */}
      <div {...getRootProps()} className={`upload-zone ${isDragActive ? "active" : ""}`} style={{ padding: 48, textAlign: "center", cursor: "pointer", marginBottom: 32 }}>
        <input {...getInputProps()} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: isDragActive ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid #2a2a3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {uploading ? <Loader size={24} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={24} color={isDragActive ? "#6366f1" : "#5a5a72"} />}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: isDragActive ? "#6366f1" : "#e8e8f0", marginBottom: 4 }}>
              {uploading ? "Uploading..." : isDragActive ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p style={{ fontSize: 13, color: "#5a5a72" }}>PDF, DOCX, TXT — up to 50MB each</p>
          </div>
          {!uploading && <button className="btn-primary" style={{ fontSize: 13, padding: "8px 18px" }}>Browse Files</button>}
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#5a5a72" }}>Loading documents...</div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <FileText size={48} style={{ color: "#2a2a3a", margin: "0 auto 16px" }} />
          <p style={{ color: "#5a5a72", fontSize: 16 }}>No documents yet. Upload your first one!</p>
        </div>
      ) : (
        <AnimatePresence>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {documents.map((doc, i) => {
              const sc = statusConfig[doc.status] || statusConfig.uploaded;
              return (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }} className="glass-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={20} color="#6366f1" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.original_filename}</div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#5a5a72" }}>
                      <span>{formatSize(doc.file_size)}</span>
                      {doc.chunk_count > 0 && <span>{doc.chunk_count} chunks</span>}
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className={sc.cls} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}>
                    {sc.icon} {sc.label}
                  </div>
                  <button onClick={() => deleteDocument(doc.id, doc.original_filename)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a5a72", padding: 6, borderRadius: 6, transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={e => (e.currentTarget.style.color = "#5a5a72")}>
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
