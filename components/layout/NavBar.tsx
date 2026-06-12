"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export function NavBar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("cooked-theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("cooked-theme", "light");
      setTheme("light");
    }
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ flex: 1 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '4px',
              background: 'var(--primary)',
              position: 'relative',
              overflow: 'hidden'
            }}>
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
                fontFamily: "Space Grotesk, sans-serif"
              }}
            >
              Cooked
            </span>
          </Link>
        </div>

        {/* Center Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 24, flex: 1, justifyContent: "center" }}>
          <Link
            href="/interview"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: pathname.startsWith("/interview") ? "var(--text-primary)" : "var(--text-secondary)",
              textDecoration: "none",
              transition: "color 0.2s",
              fontFamily: "IBM Plex Mono, monospace"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseOut={(e) => e.currentTarget.style.color = pathname.startsWith("/interview") ? "var(--text-primary)" : "var(--text-secondary)"}
          >
            Interview
          </Link>
          <Link
            href="/analytics"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: pathname.startsWith("/analytics") ? "var(--text-primary)" : "var(--text-secondary)",
              textDecoration: "none",
              transition: "color 0.2s",
              fontFamily: "IBM Plex Mono, monospace"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseOut={(e) => e.currentTarget.style.color = pathname.startsWith("/analytics") ? "var(--text-primary)" : "var(--text-secondary)"}
          >
            Analytics
          </Link>
          <Link
            href="/settings"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: pathname.startsWith("/settings") ? "var(--text-primary)" : "var(--text-secondary)",
              textDecoration: "none",
              transition: "color 0.2s",
              fontFamily: "IBM Plex Mono, monospace"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseOut={(e) => e.currentTarget.style.color = pathname.startsWith("/settings") ? "var(--text-primary)" : "var(--text-secondary)"}
          >
            Settings
          </Link>
          <Link 
            href="/admin/rag" 
            style={{ 
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)", 
              textDecoration: "none",
              fontFamily: 'Space Grotesk, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Database size={16} /> RAG DB
          </Link>
        </nav>

        {/* Right side: Theme toggle */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <button 
            onClick={toggleTheme}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseOut={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
