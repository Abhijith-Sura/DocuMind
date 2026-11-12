"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ChevronDown, Check, Play, Sparkles,
  FileText, Search, Zap, BarChart3, Database, Shield,
  Star, GitMerge
} from "lucide-react";

const RAGScene3D = dynamic(() => import("@/components/RAGScene3D"), { ssr: false });
const SplashScreen = dynamic(() => import("@/components/SplashScreen"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ═══════════════════════════════════════════════════
   LANDING PAGE — DocuMind AI
   Custom logo · Splash screen · 3D bg · Mobile-first
═══════════════════════════════════════════════════ */

/* ── Logo Component (reusable) ─────────────────── */
function Logo({ size = 36, showText = true, textSize = 18 }: { size?: number; showText?: boolean; textSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img
        src="/images/logo.png"
        alt="DocuMind AI"
        style={{ width: size, height: size, borderRadius: size * 0.26, boxShadow: "0 4px 16px rgba(13,148,136,0.2)" }}
      />
      {showText && (
        <span style={{ fontWeight: 800, fontSize: textSize, letterSpacing: "-0.03em", color: "var(--navy-900)" }}>
          DocuMind<span className="gradient-text" style={{ marginLeft: 3, fontWeight: 700 }}>AI</span>
        </span>
      )}
    </div>
  );
}

/* ── Magnetic Button ───────────────────────────── */
function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div ref={ref}
      onMouseMove={e => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setPos({ x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.22 });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      style={{ display: "inline-block" }}>
      <motion.div animate={pos} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
        {children}
      </motion.div>
    </div>
  );
}

/* ── Count-up ──────────────────────────────────── */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => { if (!inView) return; let c = 0; const s = to / 55; const t = setInterval(() => { c = Math.min(c + s, to); setV(Math.round(c)); if (c >= to) clearInterval(t); }, 20); return () => clearInterval(t); }, [inView, to]);
  return <span ref={ref}>{v}{suffix}</span>;
}

/* ── Section eyebrow ───────────────────────────── */
function Eyebrow({ text }: { text: string }) {
  return (
    <div className="pill pill-accent mono" style={{ marginBottom: 18, display: "inline-flex", fontSize: 11 }}>
      <Sparkles size={11} /> {text}
    </div>
  );
}

/* ── NAV ───────────────────────────────────────── */
function Nav() {
  const [s, setS] = useState(false);
  useEffect(() => {
    const fn = () => setS(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className={`nav-root ${s ? "scrolled" : ""}`}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo size={32} textSize={16} />
      </Link>
      <div className="nav-actions">
        <a href="#features" className="btn-ghost nav-link-hide">Features</a>
        <a href="#pipeline" className="btn-ghost nav-link-hide">Pipeline</a>
        <a href="#metrics"  className="btn-ghost nav-link-hide">Metrics</a>
        <div className="nav-divider" />
        <Link href="/login" className="btn-ghost" style={{ fontWeight: 600 }}>Sign in</Link>
        <Magnetic>
          <Link href="/register" className="btn-primary" style={{ fontSize: 13, padding: "9px 20px" }}>
            Get started <ArrowRight size={13} />
          </Link>
        </Magnetic>
      </div>
    </nav>
  );
}

/* ── HERO ──────────────────────────────────────── */
function Hero() {
  return (
    <section className="hero-section">
      {/* Layer 1: Background image */}
      <div className="hero-bg-image" />
      {/* Layer 2: Interactive 3D scene */}
      <div className="hero-3d-layer">
        <RAGScene3D style={{ width: "100%", height: "100%" }} />
      </div>
      {/* Layer 3: White veil */}
      <div className="hero-veil" />

      {/* Content */}
      <motion.div className="hero-content"
        initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>

        <Eyebrow text="Enterprise RAG Platform" />

        <h1 className="display-1" style={{ marginBottom: 24 }}>
          Your documents,{" "}
          <span style={{ fontStyle: "italic" }} className="gradient-text">intelligently answered</span>
        </h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="hero-sub">
          Upload PDFs, ask in plain English, get cited AI answers — with hybrid RAG search, Cohere reranking, and auto RAGAS evaluation built in.
        </motion.p>

        {/* CTA row */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="hero-cta-row">
          <Magnetic>
            <Link href="/register" className="btn-primary hero-cta-primary">
              Start free — no card needed <ArrowRight size={16} />
            </Link>
          </Magnetic>
          <a href={`${API}/docs`} target="_blank" rel="noreferrer" className="btn-outline hero-cta-secondary">
            <Play size={14} /> API Docs
          </a>
        </motion.div>

        {/* Trust chips */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="hero-trust">
          {["No credit card", "Free tier included", "Auto-evaluation"].map(t => (
            <span key={t} className="trust-chip">
              <Check size={14} color="var(--emerald)" /> {t}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* Product mockup */}
      <motion.div className="hero-mockup-wrap"
        initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <div className="glass-lg mockup-float" style={{ padding: 8, borderRadius: 20 }}>
          <img src="/images/dashboard-mockup.png" alt="DocuMind AI Dashboard"
            style={{ width: "100%", borderRadius: 14, display: "block" }} />
        </div>
        <div className="hero-mockup-glow" />
      </motion.div>

      {/* Scroll hint */}
      <motion.div className="hero-scroll-hint"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
        <span className="label" style={{ fontSize: 10 }}>Explore</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <ChevronDown size={16} color="var(--navy-300)" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ── METRICS ───────────────────────────────────── */
function Metrics() {
  const stats = [
    { val: 120, suf: "ms", lab: "Avg Retrieval" },
    { val: 89, suf: "%", lab: "RAGAS Score" },
    { val: 1024, suf: "d", lab: "Embedding Dims" },
    { val: 40, suf: "+", lab: "MLflow Runs" },
  ];
  return (
    <section id="metrics" className="section-container">
      <div className="glass-lg metrics-grid-wrap">
        <div className="metrics-grid">
          {stats.map((s, i) => (
            <motion.div key={s.lab} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ textAlign: "center" }}>
              <div className="gradient-text metrics-value">
                <CountUp to={s.val} suffix={s.suf} />
              </div>
              <div className="label">{s.lab}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── PIPELINE ──────────────────────────────────── */
const PIPE = [
  { n: "01", t: "Upload", s: "PDF · DOCX · TXT", icon: <FileText size={17} />, clr: "#0d9488" },
  { n: "02", t: "Parse", s: "Page extraction", icon: <GitMerge size={17} />, clr: "#0e7490" },
  { n: "03", t: "Chunk", s: "512 tok / 50 overlap", icon: <Database size={17} />, clr: "#2563eb" },
  { n: "04", t: "BGE-M3", s: "1024-dim vectors", icon: <Sparkles size={17} />, clr: "#4f46e5" },
  { n: "05", t: "ChromaDB", s: "HNSW cosine index", icon: <Database size={17} />, clr: "#7c3aed" },
  { n: "06", t: "Hybrid Search", s: "BM25 + Semantic", icon: <Search size={17} />, clr: "#0d9488" },
  { n: "07", t: "Cohere Rank", s: "Top-5 precision", icon: <Star size={17} />, clr: "#d97706" },
  { n: "08", t: "Gemini 2.0", s: "Cited answer", icon: <Zap size={17} />, clr: "#059669" },
];

function Pipeline() {
  return (
    <section id="pipeline" className="section-container">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 48 }}>
        <Eyebrow text="RAG Pipeline" />
        <h2 className="display-2">From PDF to <span className="gradient-text" style={{ fontStyle: "italic" }}>cited answer</span></h2>
        <p className="section-sub">Every step tracked. Every answer scored.</p>
      </motion.div>
      <div className="pipe-grid">
        {PIPE.map((p, i) => (
          <motion.div key={p.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            className="hover-card pipe-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--navy-300)" }}>{p.n}</span>
              <div className="pipe-icon" style={{ background: p.clr + "12", borderColor: p.clr + "28", color: p.clr }}>{p.icon}</div>
            </div>
            <div className="heading-2" style={{ fontSize: 15, marginBottom: 4 }}>{p.t}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--navy-400)" }}>{p.s}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── FEATURES ──────────────────────────────────── */
const FEATS = [
  { icon: <Search size={20} />, t: "Hybrid RAG Search", d: "BM25 lexical + dense vector retrieval fused via Reciprocal Rank Fusion — outperforms either approach alone.", clr: "#0d9488", tag: "Retrieval" },
  { icon: <Sparkles size={20} />, t: "BGE-M3 Embeddings", d: "BAAI/bge-m3 multilingual 1024-dim embeddings. Free, fast, SOTA — stored in ChromaDB with HNSW index.", clr: "#2563eb", tag: "Embedding" },
  { icon: <Star size={20} />, t: "Cohere Reranking", d: "Two-stage retrieval: BM25+vector fetches top-20, Cohere cross-encoder selects the best 5 for context.", clr: "#d97706", tag: "Reranking" },
  { icon: <BarChart3 size={20} />, t: "RAGAS Auto-Eval", d: "Every query scored for faithfulness, relevancy, context precision. LLM-as-judge, no human needed.", clr: "#059669", tag: "Eval" },
  { icon: <Database size={20} />, t: "MLflow Tracking", d: "Compare chunking strategies, embedding configs across 40+ tracked runs. Fully reproducible experiments.", clr: "#7c3aed", tag: "MLOps" },
  { icon: <Shield size={20} />, t: "Enterprise Security", d: "JWT bearer auth, bcrypt hashing, per-user document isolation. Async ingestion via FastAPI BackgroundTasks.", clr: "#dc2626", tag: "Auth" },
];

function Features() {
  return (
    <section id="features" className="section-container" style={{ paddingBottom: 100 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 48 }}>
        <Eyebrow text="Features" />
        <h2 className="display-2">Production-grade <span className="gradient-text" style={{ fontStyle: "italic" }}>AI stack</span></h2>
        <p className="section-sub">Every component chosen for real-world performance.</p>
      </motion.div>
      <div className="feat-grid">
        {FEATS.map((f, i) => (
          <motion.div key={f.t} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.07 }}
            className="hover-card feat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div className="feat-icon" style={{ background: f.clr + "10", borderColor: f.clr + "22", color: f.clr }}>{f.icon}</div>
              <span className="pill pill-accent mono" style={{ fontSize: 10, padding: "3px 9px" }}>{f.tag}</span>
            </div>
            <h3 className="heading-2" style={{ marginBottom: 8 }}>{f.t}</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.75 }}>{f.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── CTA ───────────────────────────────────────── */
function CTA() {
  return (
    <section className="bg-image-section" style={{ backgroundImage: "url(/images/hero-bg.png)", padding: "80px 24px 100px", textAlign: "center" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="glass-lg cta-card">
          <img src="/images/logo.png" alt="DocuMind AI" className="float"
            style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(13,148,136,0.25)" }} />
          <h2 className="display-2" style={{ marginBottom: 14, fontSize: "clamp(28px,4vw,38px)" }}>
            Ready to build <span className="gradient-text" style={{ fontStyle: "italic" }}>something real?</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 34, lineHeight: 1.8 }}>
            Free tier. No credit card. Full RAG pipeline in minutes.
          </p>
          <Magnetic>
            <Link href="/register" className="btn-primary" style={{ fontSize: 16, padding: "15px 40px", borderRadius: 16 }}>
              Create free account <ArrowRight size={15} />
            </Link>
          </Magnetic>
        </div>
      </motion.div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer-bar">
      <Logo size={24} textSize={14} />
      <p className="mono" style={{ fontSize: 11, color: "var(--navy-400)" }}>
        Built with FastAPI · ChromaDB · Gemini 2.0 · RAGAS · MLflow
      </p>
    </footer>
  );
}

/* ── PAGE ──────────────────────────────────────── */
export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Check if splash was already shown this session
  useEffect(() => {
    if (sessionStorage.getItem("splash_done")) {
      setSplashDone(true);
      setShowSplash(false);
    }
  }, []);

  const onSplashComplete = useCallback(() => {
    setSplashDone(true);
    sessionStorage.setItem("splash_done", "1");
    // Small delay before removing splash DOM
    setTimeout(() => setShowSplash(false), 100);
  }, []);

  return (
    <>
      {/* Splash screen — only on first visit per session */}
      <AnimatePresence>
        {showSplash && !splashDone && <SplashScreen onComplete={onSplashComplete} />}
      </AnimatePresence>

      <Nav />
      <main>
        <Hero />
        <Metrics />
        <Pipeline />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

