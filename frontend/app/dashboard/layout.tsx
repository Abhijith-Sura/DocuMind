"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, FileText, MessageSquare, BarChart3, LogOut, Zap, ChevronRight, Menu, X } from "lucide-react";

const NAV = [
  { href: "/dashboard",           icon: <LayoutDashboard size={16}/>, label: "Overview"  },
  { href: "/dashboard/documents", icon: <FileText size={16}/>,        label: "Documents" },
  { href: "/dashboard/chat",      icon: <MessageSquare size={16}/>,   label: "Chat"      },
  { href: "/dashboard/analytics", icon: <BarChart3 size={16}/>,       label: "Analytics" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, [router]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const logout = () => { localStorage.clear(); router.push("/"); };
  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px 24px" }}>
        <img src="/images/logo.png" alt="DocuMind" style={{ width: 32, height: 32, borderRadius: 9, boxShadow: "0 3px 12px rgba(13,148,136,0.15)" }} />
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.03em", color: "var(--navy-900)" }}>
          DocuMind<span className="gradient-text" style={{ marginLeft: 2, fontWeight: 700 }}>AI</span>
        </span>
        <span className="pill pill-accent mono" style={{ fontSize: 9, padding: "2px 7px", marginLeft: "auto" }}>v1</span>
      </div>

      <div className="label" style={{ padding: "0 8px", marginBottom: 8 }}>Workspace</div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div className={`nav-item ${active ? "active" : ""}`}>
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal-500)", boxShadow: "0 0 8px rgba(13,148,136,0.5)", flexShrink: 0 }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* API status */}
      <div style={{ margin: "12px 4px", padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--navy-600)", flex: 1 }}>API <strong style={{ color: "var(--emerald)" }}>live</strong></span>
        <Zap size={11} color="var(--teal-500)" />
      </div>

      {/* User */}
      {user && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 8px", borderRadius: 10, marginBottom: 4 }}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || "User avatar"}
                referrerPolicy="no-referrer"
                style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(13,148,136,0.3)" }}
              />
            ) : (
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--grad-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {initials}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--navy-900)" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "var(--navy-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          <button onClick={logout} className="nav-item" style={{ color: "var(--rose)", justifyContent: "flex-start" }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="dash-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar dash-sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="dash-mobile-topbar">
        <button onClick={() => setMobileOpen(true)} className="dash-hamburger">
          <Menu size={20} />
        </button>
        <img src="/images/logo.png" alt="DocuMind" style={{ width: 28, height: 28, borderRadius: 8 }} />
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.03em" }}>
          DocuMind<span className="gradient-text" style={{ marginLeft: 2 }}>AI</span>
        </span>
      </div>

      {/* Mobile slide-out sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="dash-mobile-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside className="sidebar dash-mobile-sidebar"
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 8px 0" }}>
                <button onClick={() => setMobileOpen(false)} style={{ color: "var(--navy-400)", padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="dash-main">
        {/* Breadcrumb bar */}
        <div className="dash-breadcrumb">
          <span style={{ fontSize: 13, color: "var(--navy-400)" }}>Dashboard</span>
          <ChevronRight size={13} color="var(--navy-300)" />
          <span style={{ fontSize: 13, color: "var(--navy-800)", fontWeight: 600 }}>
            {NAV.find(n => n.href === pathname || (pathname.startsWith(n.href) && n.href !== "/dashboard"))?.label ?? "Overview"}
          </span>
        </div>

        {/* Content */}
        <div className="dash-content">
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} style={{ minHeight: "100%" }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

