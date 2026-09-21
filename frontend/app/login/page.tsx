"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  FileText,
  Search,
  Zap,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { getApiError } from "@/lib/apiError";
import GoogleAuthButton from "@/components/GoogleAuthButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PERKS = [
  { icon: <FileText size={18} />, title: "Universal Ingestion", desc: "Instant chunking for PDF, DOCX, & TXT" },
  { icon: <Search size={18} />, title: "Hybrid Search", desc: "BM25 + Dense vector retrieval with RRF" },
  { icon: <Zap size={18} />, title: "Precision Citations", desc: "Verifiable page-level references" },
  { icon: <ShieldCheck size={18} />, title: "Enterprise Grade", desc: "RAGAS evaluation & telemetry built-in" },
];

const toastStyle = {
  style: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    fontFamily: "var(--f-body)",
    fontSize: "14px",
    borderRadius: "14px",
    padding: "12px 18px",
    boxShadow: "0 12px 32px rgba(15,23,42,0.1)",
  },
  iconTheme: { primary: "#0d9488", secondary: "#ffffff" },
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/v1/auth/login`, {
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: res.data.user_id,
          email: res.data.email,
          name: res.data.full_name,
          avatar_url: res.data.avatar_url,
          auth_provider: res.data.auth_provider || "local",
        })
      );
      toast.success("Welcome back! Redirecting...", toastStyle);
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err: any) {
      toast.error(getApiError(err, "Invalid email or password. Please try again."), toastStyle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#f8fafc",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Toaster position="top-center" gutter={8} />

      {/* Ambient background glows */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: "550px",
          height: "550px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, rgba(248,250,252,0) 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "5%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(248,250,252,0) 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Left Column: Visual Showcase (Desktop) */}
      <div
        className="auth-left"
        id="login-left"
        style={{
          flex: "1 1 50%",
          padding: "60px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid rgba(226,232,240,0.7)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div>
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 48,
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                boxShadow: "0 6px 20px rgba(13,148,136,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img src="/images/logo.png" alt="DocuMind" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em" }}>
              DocuMind<span className="gradient-text" style={{ marginLeft: 3 }}>AI</span>
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "20px",
                backgroundColor: "rgba(13,148,136,0.1)",
                color: "#0d9488",
                marginLeft: "4px",
              }}
            >
              Enterprise RAG
            </span>
          </Link>

          {/* Heading */}
          <h2
            style={{
              fontFamily: "var(--f-display)",
              fontSize: "clamp(34px, 4vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "#0f172a",
              marginBottom: 16,
              maxWidth: 480,
            }}
          >
            Turn complex documents into{" "}
            <span className="gradient-text" style={{ fontStyle: "italic" }}>
              verified answers.
            </span>
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 440,
              marginBottom: 40,
            }}
          >
            Hybrid vector search, auto-citations with page numbers, and model-agnostic intelligence.
          </p>

          {/* Feature Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 440 }}>
            {PERKS.map((p, idx) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx, duration: 0.4 }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "12px 16px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(226,232,240,0.8)",
                  boxShadow: "0 2px 8px rgba(15,23,42,0.02)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: "rgba(13,148,136,0.08)",
                    border: "1px solid rgba(13,148,136,0.16)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0d9488",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{p.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderRadius: "12px",
            backgroundColor: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.16)",
            maxWidth: 440,
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
            Active pipeline · <strong style={{ color: "#0d9488" }}>940 chunks</strong> indexed in ChromaDB
          </span>
        </div>
      </div>

      {/* Right Column: Modern Authentication Form */}
      <div
        className="auth-right"
        style={{
          flex: "1 1 50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "100%", maxWidth: 440 }}
        >
          {/* Frosted Glass Auth Card */}
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "40px 36px",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.9)",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <h1
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.03em",
                  marginBottom: 6,
                }}
              >
                Welcome back
              </h1>
              <p style={{ color: "#64748b", fontSize: 14 }}>
                Sign in to your DocuMind AI workspace
              </p>
            </div>

            {/* Google Authentication Button */}
            <div style={{ marginBottom: 22 }}>
              <GoogleAuthButton label="Continue with Google" />
            </div>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "22px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
              <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>
                or with email
              </span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Email address
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px 11px 40px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: 14,
                      color: "#0f172a",
                      transition: "all 0.2s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d9488";
                      e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Password</label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      toast("Password reset link will be sent to your email.", { icon: "ℹ️" });
                    }}
                    style={{ fontSize: 12.5, color: "#0d9488", fontWeight: 600, textDecoration: "none" }}
                  >
                    Forgot password?
                  </a>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 40px 11px 40px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: 14,
                      color: "#0f172a",
                      transition: "all 0.2s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d9488";
                      e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#cbd5e1";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      background: "none",
                      border: "none",
                      padding: 4,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                  style={{ accentColor: "#0d9488", width: 15, height: 15, cursor: "pointer" }}
                />
                <label htmlFor="remember" style={{ fontSize: 13, color: "#64748b", cursor: "pointer" }}>
                  Remember this device for 30 days
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #0d9488 0%, #2563eb 100%)",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 700,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(13,148,136,0.3)",
                  transition: "all 0.2s",
                  marginTop: 6,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(13,148,136,0.4)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(13,148,136,0.3)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom link to Register */}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <p style={{ fontSize: 13.5, color: "#64748b" }}>
                Don't have an account?{" "}
                <Link href="/register" style={{ color: "#0d9488", fontWeight: 700, textDecoration: "none" }}>
                  Create one free →
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
