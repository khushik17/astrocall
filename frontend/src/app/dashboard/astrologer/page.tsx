"use client";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Session, Astrologer, Review } from "@/types";
import GlassNavBar from "@/components/GlassNavBar";
import { useRouter } from "next/navigation";
import { Clock, Star, Video, ToggleLeft, ToggleRight, Edit2, Check, X, Phone, PhoneOff } from "lucide-react";
import { format } from "date-fns";
import { startSession, declineSession } from "@/lib/sessions";

function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${sec}s`;
}

export default function AstrologerDashboard() {
  const { profile, user, loading } = useAuth();
  const router = useRouter();
  const [astroData, setAstroData] = useState<Astrologer | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Session | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (profile?.role !== "astrologer") { router.push("/dashboard/user"); return; }

    const unsubAstro = onSnapshot(doc(db, "astrologers", user.uid), snap => {
      if (snap.exists()) {
        const data = { uid: snap.id, ...snap.data() } as Astrologer;
        setAstroData(data);
        setBio(data.bio);
      }
    });

    const pendingQ = query(
      collection(db, "sessions"),
      where("astroId", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsubPending = onSnapshot(pendingQ,
      (snap) => {
        const pending = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
        setIncomingCall(pending[0] || null);
      },
      (err) => console.error("[AstrologerDash] Pending query error:", err)
    );

    const q = query(collection(db, "sessions"), where("astroId", "==", user.uid));
    const unsubSess = onSnapshot(q,
      (snap) => {
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
        docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setSessions(docs);
      },
      (err) => console.error("[AstrologerDash] Sessions query error:", err)
    );

    return () => { unsubAstro(); unsubPending(); unsubSess(); };
  }, [user, profile, loading, router]);

  const handleAccept = async () => {
    if (!incomingCall || accepting) return;
    setAccepting(true);
    try {
      await startSession(incomingCall.id);
      router.push(`/call/${incomingCall.id}`);
    } catch (e) {
      console.error(e);
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    try {
      await declineSession(incomingCall.id);
      setIncomingCall(null);
    } catch (e) { console.error(e); }
  };

  const toggleOnline = async () => {
    if (!user || !astroData) return;
    setTogglingOnline(true);
    await updateDoc(doc(db, "astrologers", user.uid), { isOnline: !astroData.isOnline });
    setTogglingOnline(false);
  };

  const saveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    await updateDoc(doc(db, "astrologers", user.uid), { bio });
    setSavingBio(false);
    setEditBio(false);
  };

  const todaySessions   = sessions.filter(s => s.startedAt && s.startedAt > new Date().setHours(0, 0, 0, 0));
  const totalMinutes    = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60;
  const activeSessions  = sessions.filter(s => s.status === "active");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-mystic-dark">
      <div className="w-8 h-8 rounded-full border-2 border-cosmic-500 border-t-transparent animate-spin" />
    </div>
  );
  if (!user || profile?.role !== "astrologer") return null;

  return (
    <div className="min-h-screen relative">
      <GlassNavBar />

      {/* ── Incoming call overlay ── */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0"
          style={{ background: "rgba(5,2,14,0.85)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl overflow-hidden"
            style={{ background: "linear-gradient(160deg,#130830,#0d0520)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 60px rgba(124,58,237,0.25)" }}>

            {/* Pulsing top bar */}
            <div className="h-1 w-full animate-pulse" style={{ background: "linear-gradient(90deg,#7c3aed,#f59e0b,#7c3aed)", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />

            <div className="p-6 sm:p-8 flex flex-col items-center gap-5 text-center">
              {/* Avatar pulse */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "radial-gradient(circle,#7c3aed,transparent)" }} />
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl relative z-10"
                  style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.4),rgba(245,158,11,0.15))", border: "2px solid rgba(245,158,11,0.4)" }}>
                  📞
                </div>
              </div>

              <div>
                <p className="font-display text-[0.6rem] tracking-[0.25em] text-gold-400 uppercase mb-1">Incoming Call</p>
                <h3 className="font-display text-xl sm:text-2xl text-white">{incomingCall.userName}</h3>
                <p className="font-body text-purple-400 italic text-sm mt-1">is requesting a consultation</p>
              </div>

              {/* Accept / Decline */}
              <div className="flex gap-4 w-full">
                <button
                  onClick={handleDecline}
                  className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border border-red-700/50 bg-red-900/20 text-red-400 transition-all hover:bg-red-900/40"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span className="font-display text-xs tracking-widest">DECLINE</span>
                </button>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border border-green-600/50 bg-green-900/20 text-green-300 transition-all hover:bg-green-900/40 disabled:opacity-50"
                >
                  <Phone className="w-5 h-5" />
                  <span className="font-display text-xs tracking-widest">{accepting ? "JOINING…" : "ACCEPT"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-content max-w-5xl mx-auto px-4 pt-24 sm:pt-28 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <div className="font-display text-xs tracking-[0.3em] text-gold-500 uppercase mb-1">Astrologer Portal</div>
            <h1 className="font-display text-2xl sm:text-4xl text-white leading-tight">
              {profile?.displayName?.split(" ")[0]}<span className="text-gradient">&apos;s Studio</span>
            </h1>
            <p className="font-mono text-xs text-purple-700 mt-1 select-all truncate max-w-[240px] sm:max-w-none">
              UID: {user?.uid}
            </p>
          </div>

          {/* Online toggle */}
          <button
            onClick={toggleOnline}
            disabled={togglingOnline}
            className={`self-start sm:self-auto flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border font-display text-xs sm:text-sm tracking-wide transition-all ${
              astroData?.isOnline
                ? "border-green-600 bg-green-900/20 text-green-300"
                : "border-mystic-border text-purple-400 hover:border-cosmic-700"
            }`}
          >
            {astroData?.isOnline ? <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
            {astroData?.isOnline ? "You're Online" : "Go Online"}
          </button>
        </div>

        {/* ── Active call alert ── */}
        {activeSessions.map(s => (
          <div key={s.id} className="mb-4 sm:mb-6 card border-gold-600 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse-glow">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse flex-shrink-0" />
              <p className="font-display text-gold-300 text-sm sm:text-base">Active session with {s.userName}</p>
            </div>
            <button onClick={() => router.push(`/call/${s.id}`)} className="btn-gold py-2 px-4 text-sm self-start sm:self-auto">
              Rejoin Call
            </button>
          </div>
        ))}

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: "Total Sessions", value: sessions.length,              icon: <Video  className="w-4 h-4 sm:w-5 sm:h-5 text-cosmic-400" /> },
            { label: "Today's Calls",  value: todaySessions.length,         icon: <Clock  className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" /> },
            { label: "Avg Rating",     value: astroData?.rating?.toFixed(1) || "—", icon: <Star className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" /> },
            { label: "Total Minutes",  value: Math.round(totalMinutes),     icon: <Clock  className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /> },
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

        {/* ── Bio editor ── */}
        <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base sm:text-lg text-white">Your Bio</h2>
            {!editBio ? (
              <button onClick={() => setEditBio(true)} className="text-purple-400 hover:text-purple-200 flex items-center gap-1 text-sm">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={saveBio} disabled={savingBio} className="text-green-400 hover:text-green-200 flex items-center gap-1 text-sm">
                  <Check className="w-3.5 h-3.5" /> {savingBio ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditBio(false)} className="text-red-400 hover:text-red-200 flex items-center gap-1 text-sm">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            )}
          </div>
          {editBio ? (
            <textarea
              className="input-field resize-none h-28 text-sm w-full"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell clients about your expertise…"
            />
          ) : (
            <p className="font-body text-purple-300 italic leading-relaxed text-sm sm:text-base">
              {astroData?.bio}
            </p>
          )}
        </div>

        {/* ── Recent sessions ── */}
        <div className="mb-8">
          <h2 className="font-display text-lg sm:text-xl text-white mb-3 sm:mb-4">Recent Sessions</h2>
          {sessions.filter(s => s.status !== "pending").length === 0 ? (
            <div className="card p-6 sm:p-8 text-center">
              <div className="text-3xl sm:text-4xl mb-3">🌟</div>
              <p className="font-body text-purple-400 italic text-sm sm:text-base">
                No sessions yet. Go online to start receiving calls.
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {sessions.filter(s => s.status !== "pending").slice(0, 10).map(s => (
                <div key={s.id} className="card p-3 sm:p-4 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-light flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                    👤
                  </div>

                  {/* Name + time — takes remaining space */}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-white text-sm truncate">{s.userName}</p>
                    <p className="font-body text-purple-400 text-xs">
                      {s.startedAt ? format(new Date(s.startedAt), "d MMM · h:mm a") : "—"}
                    </p>
                  </div>

                  {/* Duration + status + rejoin — stack on mobile */}
                  <div className="flex flex-col xs:flex-row items-end xs:items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    <span className="font-body text-purple-400 text-xs whitespace-nowrap">
                      {formatDuration(s.durationSeconds || 0)}
                    </span>
                    <span className={`text-xs font-display px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      s.status === "ended"    ? "text-green-300 border-green-700 bg-green-900/20" :
                      s.status === "active"   ? "text-gold-300 border-gold-600 bg-gold-900/20" :
                      s.status === "declined" ? "text-red-400 border-red-700 bg-red-900/10" :
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

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
