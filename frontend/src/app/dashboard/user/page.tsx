"use client";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Session } from "@/types";
import GlassNavBar from "@/components/GlassNavBar";
import { useRouter } from "next/navigation";
import { Clock, Video, Calendar } from "lucide-react";
import { format } from "date-fns";

function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${sec}s`;
}

export default function UserDashboard() {
  const { profile, user, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    const q = query(collection(db, "sessions"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      let sdocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      sdocs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSessions(sdocs);
    });
    return () => { unsub(); };
  }, [user, loading, router]);

  const totalMinutes   = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60;
  const activeSessions = sessions.filter(s => s.status === "active");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-mystic-dark">
      <div className="w-8 h-8 rounded-full border-2 border-cosmic-500 border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen relative">
      <GlassNavBar />

      <div className="relative z-content max-w-5xl mx-auto px-4 pt-24 sm:pt-28 pb-10">

        {/* ── Header ── */}
        <div className="mb-6 sm:mb-8">
          <div className="font-display text-xs tracking-[0.3em] text-gold-500 uppercase mb-1">My Account</div>
          <h1 className="font-display text-2xl sm:text-4xl text-white leading-tight">
            Welcome, <span className="text-gradient">{profile?.displayName?.split(" ")[0]}</span>
          </h1>
          <p className="font-body text-purple-400 italic mt-1 text-sm sm:text-base">
            Your cosmic journey at a glance
          </p>
        </div>

        {/* ── Active call alert ── */}
        {activeSessions.map(s => (
          <div key={s.id} className="mb-4 sm:mb-6 card border-gold-600 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse-glow">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse flex-shrink-0" />
              <p className="font-display text-gold-300 text-sm sm:text-base">
                Active session with {s.astroName}
              </p>
            </div>
            <button
              onClick={() => router.push(`/call/${s.id}`)}
              className="btn-gold py-2 px-4 text-sm self-start sm:self-auto"
            >
              Rejoin Call
            </button>
          </div>
        ))}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: "Total Calls",   value: sessions.length,         icon: <Video     className="w-4 h-4 sm:w-5 sm:h-5 text-cosmic-400" /> },
            { label: "Minutes Spent", value: Math.round(totalMinutes), icon: <Clock     className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" /> },
            { label: "This Month",    value: sessions.filter(s => s.startedAt && s.startedAt > Date.now() - 30 * 24 * 3600 * 1000).length,
                                             icon: <Calendar  className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /> },
          ].map((stat, i) => (
            <div key={i} className="card p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2">
              <div className="flex items-center justify-between">
                {stat.icon}
                <span className="font-display text-xl sm:text-2xl text-white">{stat.value}</span>
              </div>
              <span className="font-body text-purple-400 text-xs sm:text-sm">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Past Sessions ── */}
        <div className="mb-8">
          <h2 className="font-display text-lg sm:text-xl text-white mb-3 sm:mb-4">Past Sessions</h2>

          {sessions.length === 0 ? (
            <div className="card p-6 sm:p-8 text-center">
              <div className="text-3xl sm:text-4xl mb-3">🌙</div>
              <p className="font-body text-purple-400 italic text-sm sm:text-base">
                No calls yet. Connect with an astrologer today.
              </p>
              <button onClick={() => router.push("/astrologers")} className="btn-primary mt-4">
                Browse Astrologers
              </button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="card p-3 sm:p-4 flex items-center gap-3">

                  {/* Avatar */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-light flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                    🔮
                  </div>

                  {/* Name + date — flex-1 so it fills remaining space */}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-white text-sm truncate">{s.astroName}</p>
                    <p className="font-body text-purple-400 text-xs truncate">
                      {s.startedAt
                        ? format(new Date(s.startedAt), "d MMM yyyy · h:mm a")
                        : "Not started"}
                    </p>
                  </div>

                  {/* Duration + status + rejoin — stack vertically on tiny screens */}
                  <div className="flex flex-col xs:flex-row items-end xs:items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    <span className="font-body text-purple-400 text-xs whitespace-nowrap">
                      {formatDuration(s.durationSeconds || 0)}
                    </span>
                    <span className={`text-xs font-display px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      s.status === "ended"  ? "text-green-300 border-green-700 bg-green-900/20" :
                      s.status === "active" ? "text-gold-300 border-gold-600 bg-gold-900/20" :
                                             "text-purple-400 border-purple-700"
                    }`}>
                      {s.status}
                    </span>
                    {s.status === "active" && (
                      <button
                        onClick={() => router.push(`/call/${s.id}`)}
                        className="btn-primary text-xs py-1 px-3 whitespace-nowrap"
                      >
                        Rejoin
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
