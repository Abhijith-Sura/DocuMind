"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2, AlertCircle, KeyRound, ExternalLink, X } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface GoogleAuthButtonProps {
  label?: string;
  onSuccess?: () => void;
}

export default function GoogleAuthButton({
  label = "Continue with Google",
  onSuccess,
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customToken, setCustomToken] = useState("");
  const gsiInitializedRef = useRef(false);

  // Handle Google OAuth Credential (ID token)
  const handleCredentialResponse = async (credential: string) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/v1/auth/google`, { credential });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: res.data.user_id,
          email: res.data.email,
          name: res.data.full_name,
          avatar_url: res.data.avatar_url,
          auth_provider: res.data.auth_provider || "google",
        })
      );
      toast.success(`Welcome, ${res.data.full_name || "back"}! Redirecting...`);
      if (onSuccess) onSuccess();
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Google authentication failed. Please try again.";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const handleCredentialResponseRef = useRef(handleCredentialResponse);
  handleCredentialResponseRef.current = handleCredentialResponse;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let timer: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 30; // 6 seconds max

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response.credential) {
                handleCredentialResponseRef.current(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = "";
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: "outline",
              size: "large",
              type: "standard",
              shape: "rectangular",
              text: label.toLowerCase().includes("sign up") ? "signup_with" : "signin_with",
              width: 360,
              logo_alignment: "left",
            });
          }
          gsiInitializedRef.current = true;
        } catch (err) {
          console.warn("Google GSI initialization warning:", err);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        timer = setTimeout(initGsi, 200);
      }
    };

    initGsi();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [label]);

  const handleClick = () => {
    if (loading) return;

    if (!GOOGLE_CLIENT_ID) {
      setShowConfigModal(true);
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (err) {
        console.error("GSI prompt error:", err);
        setShowConfigModal(true);
      }
    } else {
      setShowConfigModal(true);
    }
  };

  return (
    <>
      {GOOGLE_CLIENT_ID ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            minHeight: "44px",
          }}
        >
          <div ref={googleBtnRef} style={{ width: "100%", display: "flex", justifyContent: "center" }} />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="google-btn"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "11px 16px",
            backgroundColor: "#ffffff",
            color: "#1f2937",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: "14.5px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#f9fafb";
              e.currentTarget.style.borderColor = "#d1d5db";
              e.currentTarget.style.boxShadow = "0 3px 10px rgba(0, 0, 0, 0.08)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "#ffffff";
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" color="#0d9488" />
              <span style={{ color: "#4b5563" }}>Signing in with Google...</span>
            </>
          ) : (
            <>
              {/* Official Google 'G' Logo SVG */}
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  fill="#4285F4"
                />
                <path
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  fill="#34A853"
                />
                <path
                  d="M5.28 14.27a7.21 7.21 0 0 1 0-4.54V6.58H1.25a11.979 11.979 0 0 0 0 10.84l4.03-3.15z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  fill="#EA4335"
                />
              </svg>
              <span>{label}</span>
            </>
          )}
        </button>
      )}

      {/* Setup Guide / Developer Fallback Modal */}
      {showConfigModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowConfigModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "28px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                color: "#64748b",
                padding: "6px",
                borderRadius: "8px",
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(13, 148, 136, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0d9488",
                }}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>Google OAuth Setup</h3>
                <p style={{ fontSize: "12.5px", color: "#64748b" }}>Live Google Sign-In Integration</p>
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: "#334155", lineHeight: 1.6, marginBottom: "16px" }}>
              To enable authentic Google accounts, add your Google OAuth Client ID to your environment configuration:
            </p>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "12.5px",
                fontFamily: "monospace",
                color: "#0f172a",
                marginBottom: "16px",
                lineHeight: 1.6,
              }}
            >
              <div style={{ color: "#64748b" }}># In frontend/.env.local:</div>
              <div>NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</div>
              <div style={{ color: "#64748b", marginTop: "6px" }}># In backend/.env:</div>
              <div>GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</div>
            </div>

            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#0d9488",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "20px",
                textDecoration: "none",
              }}
            >
              Open Google Cloud Console <ExternalLink size={13} />
            </a>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Test with Token or Demo Mode:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Paste Google JWT credential..."
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customToken.trim()) {
                      toast.error("Please enter a token or configure your Client ID.");
                      return;
                    }
                    setShowConfigModal(false);
                    handleCredentialResponse(customToken.trim());
                  }}
                  style={{
                    backgroundColor: "#0d9488",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
