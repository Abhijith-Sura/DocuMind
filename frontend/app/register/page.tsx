"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { getApiError } from "@/lib/apiError";
import GoogleAuthButton from "@/components/GoogleAuthButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function calculatePasswordStrength(pass: string) {
  if (!pass) return { score: 0, text: "", color: "transparent" };
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass) || pass.length >= 12) score++;

  if (score === 1) return { score: 1, text: "Weak", color: "#f43f5e" };
  if (score === 2) return { score: 2, text: "Good", color: "#f59e0b" };
  return { score: 3, text: "Strong", color: "#10b981" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", agreeTerms: true });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const strength = calculatePasswordStrength(form.password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.", toastStyle);
      return;
    }
    if (!form.agreeTerms) {
      toast.error("Please accept terms and conditions.", toastStyle);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/v1/auth/register`, {
        full_name: form.full_name,
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
      toast.success("Account created! Welcome to DocuMind 🎉", toastStyle);
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err: any) {
      toast.error(getApiError(err, "Registration failed. Try again."), toastStyle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "36px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Toaster position="top-center" gutter={8} />

      {/* Ambient background glows */}
      <div
        style={{
          position: "absolute",
          top: "-5%",
          right: "10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,148,136,0.1) 0%, rgba(248,250,252,0) 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-5%",
          left: "10%",
          width: "550px",
          height: "550px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(248,250,252,0) 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}
      >
        {/* Frosted Glass Register Card */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "38px 36px",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.95)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
                textDecoration: "none",
                color: "#0f172a",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  boxShadow: "0 6px 20px rgba(13,148,136,0.25)",
                  overflow: "hidden",
                }}
              >
                <img src="/images/logo.png" alt="DocuMind" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </Link>
            <h1
              style={{
                fontFamily: "var(--f-body)",
                fontSize: 26,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                marginBottom: 4,
              }}
            >
              Create your account
            </h1>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              Start indexing documents with enterprise AI in seconds
            </p>
          </div>

          {/* Value Perks Chips */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[
              { text: "No credit card", icon: <CheckCircle2 size={13} color="#10b981" /> },
              { text: "Hybrid Search", icon: <Zap size={13} color="#0d9488" /> },
              { text: "Free Tier", icon: <Sparkles size={13} color="#f59e0b" /> },
            ].map((chip) => (
              <span
                key={chip.text}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                  backgroundColor: "#f1f5f9",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {chip.icon} {chip.text}
              </span>
            ))}
          </div>

          {/* Google One-Click Sign Up */}
          <div style={{ marginBottom: 20 }}>
            <GoogleAuthButton label="Sign up with Google" />
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "20px 0",
            }}
          >
            <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>
              or continue with email
            </span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Full name
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 40px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: 14,
                    color: "#0f172a",
                    outline: "none",
                    transition: "all 0.2s",
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
                    outline: "none",
                    transition: "all 0.2s",
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
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
                    outline: "none",
                    transition: "all 0.2s",
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

              {/* Password strength meter */}
              {form.password.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 4, flex: 1 }}>
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 99,
                          backgroundColor: strength.score >= step ? strength.color : "#e2e8f0",
                          transition: "all 0.3s ease",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: strength.color, minWidth: 42, textAlign: "right" }}>
                    {strength.text}
                  </span>
                </div>
              )}
            </div>

            {/* Terms checkbox */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 2 }}>
              <input
                type="checkbox"
                id="terms"
                checked={form.agreeTerms}
                onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                style={{ accentColor: "#0d9488", width: 15, height: 15, marginTop: 3, cursor: "pointer" }}
              />
              <label htmlFor="terms" style={{ fontSize: 12.5, color: "#64748b", cursor: "pointer", lineHeight: 1.5 }}>
                I agree to the <a href="#" style={{ color: "#0d9488", fontWeight: 600 }}>Terms of Service</a> and{" "}
                <a href="#" style={{ color: "#0d9488", fontWeight: 600 }}>Privacy Policy</a>
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
                <span>Creating workspace...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Bottom link to Login */}
          <div style={{ marginTop: 22, textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "#64748b" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#0d9488", fontWeight: 700, textDecoration: "none" }}>
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
