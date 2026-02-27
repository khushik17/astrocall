"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Astrologer } from "@/types";
import AstrologerCard from "@/components/AstrologerCard";
import GlassNavBar from "@/components/GlassNavBar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Search, Shield, Star, Users, Clock } from "lucide-react";
import { createSession } from "@/lib/sessions";

const SPECIALTIES = ["All", "Vedic Astrology", "Tarot", "Numerology", "Palmistry", "KP System", "Nadi"];

export default function AstrologersPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [search, setSearch] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);
  const [activeSpecialty, setActiveSpecialty] = useState("All");
  const [callingId, setCallingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "astrologers"), orderBy("isOnline", "desc"));
    const unsub = onSnapshot(q, snap => {
      setAstrologers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Astrologer)));
    });
    return unsub;
  }, []);

  const filtered = astrologers.filter(a => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.specialties.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchSpecialty = activeSpecialty === "All" || a.specialties.includes(activeSpecialty);
    return matchSearch && matchSpecialty && (!filterOnline || a.isOnline);
  });

  const handleCall = async (astrologer: Astrologer) => {
    if (!user || !profile) { router.push("/auth/login"); return; }
    if (profile.role === "astrologer") { alert("Astrologers cannot call other astrologers."); return; }
    setCallingId(astrologer.uid);
    try {
      const sessionId = await createSession(user.uid, profile.displayName, astrologer.uid, astrologer.name);
      router.push(`/call/${sessionId}`);
    } catch (err) {
      console.error(err);
      alert("Could not initiate call. Please try again.");
      setCallingId(null);
    }
  };

  const onlineCount = astrologers.filter(a => a.isOnline).length;

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>

      {/* Bg nebula */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(60,0,120,0.15) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(20,0,80,0.12) 0%, transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 10 }}><GlassNavBar /></div>

      <div className="astro-page-container">

        {/* ── HERO HEADER ── */}
        <div className="hero-section">

          {/* Live pill */}
          <div className="live-pill">
            <span className="live-dot" />
            <span className="live-text">{onlineCount} MASTERS ONLINE NOW</span>
          </div>

          <h1 className="hero-title">
            <span>Find Your</span>
            <span className="hero-gradient">Cosmic Guide</span>
          </h1>
          <p className="hero-subtitle">
            Live, face-to-face consultations with India&apos;s most trusted Vedic masters
          </p>

          {/* Trust badges */}
          <div className="trust-badges">
            {[
              { icon: <Shield size={13} color="#f59e0b" />, text: "Verified Experts" },
              { icon: <Star size={13} color="#f59e0b" />, text: "4.9★ Avg Rating" },
              { icon: <Users size={13} color="#f59e0b" />, text: "50K+ Sessions" },
              { icon: <Clock size={13} color="#f59e0b" />, text: "Available 24/7" },
            ].map((b, i) => (
              <div key={i} className="trust-badge">
                {b.icon}
                <span className="trust-badge-text">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="filter-bar">
          <div className="filter-top-row">
            {/* Search */}
            <div className="search-wrapper">
              <Search size={14} color="#6b7280" className="search-icon" />
              <input
                placeholder="Search by name or specialty…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            {/* Online toggle */}
            <button
              onClick={() => setFilterOnline(!filterOnline)}
              className={`online-toggle ${filterOnline ? "online-toggle--active" : ""}`}
            >
              <span className={`online-dot ${filterOnline ? "online-dot--active" : ""}`} />
              ONLINE ONLY
            </button>
          </div>

          {/* Specialty pills */}
          <div className="specialty-pills">
            {SPECIALTIES.map(s => (
              <button
                key={s}
                onClick={() => setActiveSpecialty(s)}
                className={`specialty-pill ${activeSpecialty === s ? "specialty-pill--active" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        <p className="result-count">
          <span className="result-count--online">{filtered.filter(a => a.isOnline).length}</span>
          {" online · "}
          <span className="result-count--total">{filtered.length} total</span>
        </p>

        {/* ── GRID ── */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔭</div>
            <p className="empty-state__title">No astrologers found</p>
            <p className="empty-state__subtitle">The stars are aligning… try a different search</p>
          </div>
        ) : (
          <div className="astrologer-grid">
            {filtered.map((a, idx) => (
              <div key={a.uid} style={{ animation: `fadeUp 0.55s ease ${idx * 0.06}s both` }}>
                <AstrologerCard astrologer={a} onCall={handleCall} isLoading={callingId === a.uid} />
              </div>
            ))}
          </div>
        )}

        {/* ── BOTTOM TRUST ── */}
        <div className="bottom-trust">
          {[
            { icon: "🔒", title: "100% Private", desc: "All sessions encrypted and confidential" },
            { icon: "✅", title: "Verified Masters", desc: "Background-checked and certified experts" },
            { icon: "💳", title: "Secure Payments", desc: "Pay only for time spent, no hidden fees" },
            { icon: "⭐", title: "Satisfaction Guaranteed", desc: "Not happy? We'll connect you for free" },
          ].map((f, i) => (
            <div key={i} className="trust-item">
              <div style={{ fontSize: "1.7rem", marginBottom: "0.6rem" }}>{f.icon}</div>
              <div className="trust-item__title">{f.title}</div>
              <div className="trust-item__desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%,100% { opacity: 1; box-shadow: 0 0 10px #22c55e; }
          50%      { opacity: 0.5; box-shadow: 0 0 4px #22c55e; }
        }

        * { box-sizing: border-box; }

        /* ── Page container ── */
        .astro-page-container {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 6rem 1rem 4rem;
        }
        @media (min-width: 640px) {
          .astro-page-container { padding: 7rem 1.5rem 5rem; }
        }
        @media (min-width: 1024px) {
          .astro-page-container { padding: 8rem 2rem 6rem; }
        }

        /* ── Hero ── */
        .hero-section {
          text-align: center;
          margin-bottom: 2.5rem;
          animation: fadeUp 0.8s ease both;
        }
        @media (min-width: 768px) { .hero-section { margin-bottom: 4rem; } }

        .live-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.3);
          border-radius: 100px;
          padding: 0.4rem 1.1rem;
          margin-bottom: 1.2rem;
        }
        @media (min-width: 768px) { .live-pill { margin-bottom: 1.8rem; } }

        .live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
          display: inline-block;
          animation: livePulse 2s ease infinite;
        }
        .live-text {
          font-family: 'Cinzel', serif;
          font-size: 0.58rem;
          letter-spacing: 0.28em;
          color: #22c55e;
          font-weight: 600;
        }
        @media (min-width: 480px) { .live-text { font-size: 0.62rem; } }

        .hero-title {
          font-family: 'Cinzel', serif;
          font-weight: 900;
          line-height: 1.05;
          margin-bottom: 1rem;
        }
        .hero-title span {
          display: block;
          font-size: clamp(1.7rem, 6vw, 3.8rem);
          color: #f5f0ff;
          letter-spacing: -0.01em;
        }
        .hero-gradient {
          background: linear-gradient(110deg, #c084fc 0%, #7c3aed 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(0.95rem, 2.5vw, 1.15rem);
          color: #9ca3af;
          max-width: 500px;
          margin: 0 auto 1.5rem;
          font-style: italic;
          line-height: 1.7;
        }

        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        @media (min-width: 640px) { .trust-badges { gap: 2rem; } }

        .trust-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .trust-badge-text {
          font-family: 'Cinzel', serif;
          font-size: 0.58rem;
          color: #6b7280;
          letter-spacing: 0.06em;
        }
        @media (min-width: 480px) { .trust-badge-text { font-size: 0.62rem; } }

        /* ── Filter bar ── */
        .filter-bar {
          background: linear-gradient(145deg, rgba(20,8,45,0.95), rgba(8,3,20,0.98));
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(16px);
          animation: fadeUp 0.8s ease 0.1s both;
        }
        @media (min-width: 640px) { .filter-bar { padding: 1.5rem 1.8rem; } }

        .filter-top-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-direction: column;
        }
        @media (min-width: 480px) {
          .filter-top-row { flex-direction: row; align-items: center; }
        }

        .search-wrapper {
          flex: 1;
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 11px 16px 11px 40px;
          background: rgba(109,40,217,0.07);
          border: 1px solid rgba(139,92,246,0.18);
          border-radius: 10px;
          color: #e9d5ff;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem;
          outline: none;
        }
        .search-input::placeholder { color: #374151; font-style: italic; }
        .search-input:focus { border-color: rgba(192,132,252,0.4); }

        .online-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 10px;
          border: 1px solid rgba(139,92,246,0.18);
          background: rgba(109,40,217,0.07);
          color: #6b7280;
          font-family: 'Cinzel', serif;
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          align-self: flex-start;
        }
        @media (min-width: 480px) { .online-toggle { align-self: auto; } }
        .online-toggle--active {
          border-color: rgba(34,197,94,0.45);
          background: rgba(34,197,94,0.08);
          color: #22c55e;
        }
        .online-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #6b7280;
          display: inline-block;
        }
        .online-dot--active { background: #22c55e; box-shadow: 0 0 6px #22c55e; }

        .specialty-pills {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .specialty-pill {
          font-family: 'Cinzel', serif;
          font-size: 0.58rem;
          letter-spacing: 0.07em;
          padding: 0.32rem 0.8rem;
          border-radius: 100px;
          border: 1px solid rgba(139,92,246,0.13);
          background: transparent;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.15s;
        }
        .specialty-pill--active {
          border-color: rgba(192,132,252,0.55);
          background: rgba(192,132,252,0.10);
          color: #c084fc;
        }

        /* ── Result count ── */
        .result-count {
          font-family: 'Cormorant Garamond', serif;
          color: #4b5563;
          font-size: 0.9rem;
          font-style: italic;
          margin-bottom: 1.5rem;
        }
        .result-count--online {
          color: #22c55e;
          font-style: normal;
          font-family: 'Cinzel', serif;
          font-size: 0.8rem;
        }
        .result-count--total { color: #6b7280; }

        /* ── Grid ── */
        .astrologer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 540px) {
          .astrologer-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
        }
        @media (min-width: 1024px) {
          .astrologer-grid { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
        }

        /* ── Empty state ── */
        .empty-state {
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(145deg, rgba(20,8,45,0.85), rgba(8,3,20,0.95));
          border: 1px solid rgba(139,92,246,0.12);
          border-radius: 20px;
        }
        @media (min-width: 640px) { .empty-state { padding: 5rem 2rem; } }
        .empty-state__title {
          font-family: 'Cinzel', serif;
          font-size: 1.1rem;
          color: #c084fc;
          margin-bottom: 0.5rem;
        }
        .empty-state__subtitle {
          font-family: 'Cormorant Garamond', serif;
          color: #6b7280;
          font-style: italic;
        }

        /* ── Bottom trust ── */
        .bottom-trust {
          margin-top: 3rem;
          padding: 2rem 1.5rem;
          background: linear-gradient(145deg, rgba(20,8,45,0.85), rgba(8,3,20,0.95));
          border: 1px solid rgba(139,92,246,0.12);
          border-radius: 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          text-align: center;
        }
        @media (min-width: 768px) {
          .bottom-trust {
            margin-top: 4rem;
            padding: 2.5rem 3rem;
            grid-template-columns: repeat(4, 1fr);
            gap: 2rem;
          }
        }

        .trust-item__title {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          color: #e9d5ff;
          margin-bottom: 0.4rem;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        @media (min-width: 640px) { .trust-item__title { font-size: 0.75rem; } }
        .trust-item__desc {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.82rem;
          color: #6b7280;
          line-height: 1.6;
        }
        @media (min-width: 640px) { .trust-item__desc { font-size: 0.88rem; } }
      `}</style>
    </div>
  );
}
