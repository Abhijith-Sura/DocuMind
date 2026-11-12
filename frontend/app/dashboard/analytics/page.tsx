"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, Zap, Target, ExternalLink } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ScoreBadge = ({ score }: { score: number | null }) => {
  if (score === null || score === undefined) return <span style={{ color: "var(--text-secondary)" }}>—</span>;
  const pct = (score * 100).toFixed(0);
  const color = score >= 0.85 ? "#10b981" : score >= 0.7 ? "#3b82f6" : score >= 0.5 ? "#f59e0b" : "#ef4444";
  return <span style={{ color, fontWeight: 700 }}>{pct}%</span>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    axios.get(`${API}/api/v1/evaluation/dashboard`, { headers: headers() })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)" }}>Loading analytics...</div>;

  const summary = data?.summary || {};
  const recentQueries = data?.recent_queries || [];

  // RAGAS radar chart data
  const radarData = [
    { metric: "Faithfulness", value: (summary.avg_faithfulness || 0) * 100 },
    { metric: "Answer Relevancy", value: (summary.avg_answer_relevancy || 0) * 100 },
    { metric: "Context Precision", value: (summary.avg_context_precision || 0) * 100 },
    { metric: "User Rating", value: ((summary.avg_user_rating || 0) / 5) * 100 },
  ];

  // Timeline data from recent queries
  const timelineData = recentQueries.slice().reverse().map((q: any, i: number) => ({
    query: i + 1,
    faithfulness: q.faithfulness ? q.faithfulness * 100 : null,
    relevancy: q.answer_relevancy ? q.answer_relevancy * 100 : null,
    latency: q.retrieval_ms,
  }));

  const metricCards = [
    { label: "Avg Faithfulness", value: summary.avg_faithfulness, icon: <Target size={20} />, desc: "Hallucination prevention score", color: "#10b981" },
    { label: "Avg Relevancy", value: summary.avg_answer_relevancy, icon: <TrendingUp size={20} />, desc: "Answer addresses the question", color: "#3b82f6" },
    { label: "Context Precision", value: summary.avg_context_precision, icon: <BarChart3 size={20} />, desc: "Retrieved chunks are relevant", color: "#8b5cf6" },
    { label: "Retrieval Latency", value: summary.avg_retrieval_ms ? `${Math.round(summary.avg_retrieval_ms)}ms` : "—", icon: <Zap size={20} />, desc: "Average retrieval time", color: "#f59e0b", isRaw: true },
  ];

  return (
    <div style={{ padding: "36px 40px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>RAG Analytics</h1>
          <a href="http://localhost:5000" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--teal-600)", textDecoration: "none", background: "var(--teal-100)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 6, padding: "4px 10px" }}>
            MLflow Dashboard <ExternalLink size={11} />
          </a>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>RAGAS evaluation metrics across {summary.total_queries || 0} queries</p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 36 }}>
        {metricCards.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{m.label}</span>
              <span style={{ color: m.color }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
              {m.isRaw ? m.value : <ScoreBadge score={m.value} />}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{m.desc}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* RAGAS Radar Chart */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 16 }}>RAGAS Score Radar</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--navy-200)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "var(--navy-600)" }} />
              <Radar name="Score" dataKey="value" stroke="var(--teal-600)" fill="var(--teal-600)" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4, fill: "var(--teal-600)" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Timeline */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Score Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--navy-200)" />
              <XAxis dataKey="query" tick={{ fontSize: 11, fill: "var(--navy-500)" }} label={{ value: "Query #", position: "insideBottom", offset: -3, fill: "var(--navy-500)", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--navy-500)" }} unit="%" />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }} />
              <Area type="monotone" dataKey="faithfulness" stroke="#10b981" fill="#10b981" fillOpacity={0.08} strokeWidth={2} name="Faithfulness %" connectNulls />
              <Area type="monotone" dataKey="relevancy" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={2} name="Relevancy %" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Queries Table */}
      <div className="glass" style={{ padding: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Recent Queries</h3>
        {recentQueries.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: 32 }}>No queries yet. Start chatting to see analytics here.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Query", "Faithfulness", "Relevancy", "Latency", "Date"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, color: "var(--navy-500)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentQueries.map((q: any) => (
                  <tr key={q.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}><ScoreBadge score={q.faithfulness} /></td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}><ScoreBadge score={q.answer_relevancy} /></td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-muted)" }}>{q.retrieval_ms ? `${Math.round(q.retrieval_ms)}ms` : "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)" }}>{new Date(q.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
