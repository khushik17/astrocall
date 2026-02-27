"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, collection, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Session } from "@/types";
import { endSession, cancelSession, submitReview } from "@/lib/sessions";
import { useCallTimer } from "@/hooks/useCallTimer";
import RatingModal from "@/components/RatingModal";
import dynamic from "next/dynamic";
import {
  PhoneOff, X, MessageSquare, ChevronRight, Clock,
} from "lucide-react";
import type { ComponentType } from "react";

interface CustomCallRoomProps {
  onEndCall: () => void;
  callEnded: boolean;
  timerDisplay: string;
  otherName: string;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
}

const LiveKitRoom = dynamic(
  () => import("@livekit/components-react").then(m => m.LiveKitRoom),
  { ssr: false }
);
const CustomCallRoom = dynamic(
  () => import("./CustomCallRoom") as Promise<{ default: ComponentType<CustomCallRoomProps> }>,
  { ssr: false }
);

interface TokenData { token: string; wsUrl: string; }
interface ChatMsg {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  createdAt: number;
}

export default function CallPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const { user, profile } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [error, setError] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Chat state — default closed on mobile, open on desktop
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const callEndedRef = useRef(false);
  const [callEnded, setCallEnded] = useState(false);
  const { formatted: timerDisplay } = useCallTimer(session?.startedAt ?? null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  // Session listener
  useEffect(() => {
    if (!sessionId) return;
    return onSnapshot(doc(db, "sessions", sessionId), snap => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() } as Session;
      setSession(data);
      if (data.status === "declined" && !callEndedRef.current) {
        callEndedRef.current = true; setCallEnded(true);
      }
      if (data.status === "ended" && !callEndedRef.current) {
        callEndedRef.current = true; setCallEnded(true);
        if (profile?.role === "user") setShowRating(true);
        else router.push("/dashboard/astrologer");
      }
    });
  }, [sessionId, profile?.role, router]);

  // Token fetch
  useEffect(() => {
    if (!sessionId || !user || !profile) return;
    if (session?.status !== "active") return;
    if (tokenData) return;
    const fetchToken = async () => {
      setLoadingToken(true);
      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, identity: profile.displayName || user.uid }),
        });
        if (!res.ok) throw new Error("Failed to get token");
        setTokenData(await res.json());
      } catch (e: any) { setError(e.message); }
      finally { setLoadingToken(false); }
    };
    fetchToken();
  }, [session?.status, sessionId, user, profile, tokenData]);

  // Chat listener
  useEffect(() => {
    if (!sessionId || session?.status !== "active") return;
    const q = query(
      collection(db, "sessions", sessionId, "messages"),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, snap =>
      setChatMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMsg)))
    );
  }, [sessionId, session?.status]);

  const sendChat = async () => {
    if (!chatInput.trim() || !user || !profile) return;
    const text = chatInput.trim();
    setChatInput("");
    await addDoc(collection(db, "sessions", sessionId, "messages"), {
      text, senderName: profile.displayName || "You",
      senderId: user.uid, createdAt: Date.now(),
    });
  };

  const handleEndCall = useCallback(async () => {
    if (!session || callEndedRef.current) return;
    callEndedRef.current = true; setCallEnded(true);
    await endSession(sessionId, session.startedAt);
    if (profile?.role === "user") setShowRating(true);
    else router.push("/dashboard/astrologer");
  }, [session, sessionId, profile?.role, router]);

  const handleCancel = useCallback(async () => {
    if (!sessionId || cancelling) return;
    setCancelling(true);
    await cancelSession(sessionId);
    router.push("/astrologers");
  }, [sessionId, cancelling, router]);

  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!session || !user || !profile) return;
    await submitReview(sessionId, user.uid, profile.displayName, session.astroId, rating, comment);
    router.push("/dashboard/user");
  };

  if (!user || !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-purple-400">Please sign in.</p>
    </div>
  );

  // ── DECLINED ──
  if (session?.status === "declined") return (
    <div className="min-h-screen flex items-center justify-center bg-mystic-dark px-4">
      <div className="card p-8 sm:p-10 flex flex-col items-center gap-5 max-w-sm w-full text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-900/30 border border-red-700 flex items-center justify-center">
          <X className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
        </div>
        <div>
          <h2 className="font-display text-xl sm:text-2xl text-white mb-2">Call Declined</h2>
          <p className="font-body text-purple-400 italic text-sm">
            {session?.astroName} is unavailable right now.
          </p>
        </div>
        <button onClick={() => router.push("/astrologers")} className="btn-primary w-full">
          Browse Astrologers
        </button>
      </div>
    </div>
  );

  // ── PENDING ──
  if (session?.status === "pending") return (
    <div className="min-h-screen flex items-center justify-center bg-[#06030f] px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-full filter blur-[100px] bg-purple-900/20 pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6 sm:gap-8 max-w-sm w-full text-center z-10">
        {/* Pulsing radar */}
        <div className="relative flex items-center justify-center pt-8 mb-2">
          <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-gold-400/20 shadow-[0_0_60px_rgba(245,158,11,0.1)]"
            style={{ animation: "radarPing 3s cubic-bezier(0,0,0.2,1) infinite" }} />
          <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full border border-purple-400/30"
            style={{ animation: "radarPing 3s cubic-bezier(0,0,0.2,1) infinite 0.75s" }} />
          <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-purple-400/40"
            style={{ animation: "radarPing 3s cubic-bezier(0,0,0.2,1) infinite 1.5s" }} />
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-900/90 to-black border-2 border-purple-500/50 flex items-center justify-center z-10 shadow-[0_0_30px_rgba(139,92,246,0.4)]">
            <span className="text-3xl sm:text-4xl">🔮</span>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 px-2">
          <p className="font-display text-[0.6rem] sm:text-[0.65rem] tracking-[0.3em] text-gold-400 uppercase font-bold px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 inline-block animate-pulse">
            Establishing Connection
          </p>
          <h2 className="font-display text-2xl sm:text-4xl text-white tracking-wide">
            Calling {session.astroName}
          </h2>
          <p className="font-body text-purple-300 italic text-sm sm:text-base">
            Signaling the cosmos… please hold
          </p>
        </div>

        <button onClick={handleCancel} disabled={cancelling}
          className="mt-4 sm:mt-6 flex flex-col items-center gap-2 group transition-all duration-300 disabled:opacity-50"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-red-500/30"
            style={{ background: "linear-gradient(135deg,rgba(153,27,27,0.5),rgba(69,10,10,0.8))", boxShadow: "0 10px 20px -5px rgba(185,28,28,0.3)" }}>
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 group-hover:text-red-300" />
          </div>
          <span className="font-display text-[0.65rem] sm:text-[0.7rem] tracking-widest text-red-500/80 group-hover:text-red-400 uppercase mt-1">
            {cancelling ? "Cancelling" : "End Call"}
          </span>
        </button>
      </div>

      <style jsx>{`
        @keyframes radarPing {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );

  // ── ACTIVE CALL ──
  const otherName = profile.role === "user" ? session?.astroName : session?.userName;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#05020e", overflow: "hidden", position: "relative" }}>

      {/* Main area: video + optional side chat on desktop */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* ── Video area ── */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, position: "relative", background: "linear-gradient(135deg,#0d0520 0%,#11062b 100%)" }}>

            {loadingToken || !tokenData ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "0 1rem" }}>
                <div style={{ width: "clamp(80px,20vw,120px)", height: "clamp(80px,20vw,120px)", borderRadius: "50%", background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(245,158,11,0.1))", border: "2px solid rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(30px,8vw,48px)" }}>
                  🔮
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Cinzel',serif", fontSize: "clamp(0.85rem,3vw,1.1rem)", color: "#c084fc", marginBottom: 6 }}>{otherName}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", color: "#6b7280", fontStyle: "italic", fontSize: "clamp(0.8rem,2.5vw,0.9rem)" }}>
                    {loadingToken ? "Connecting to the cosmos…" : "Initialising room…"}
                  </p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #7c3aed", borderTopColor: "transparent", animation: "spin 0.9s linear infinite" }} />
              </div>
            ) : (
              <LiveKitRoom
                token={tokenData.token}
                serverUrl={tokenData.wsUrl}
                connect={true}
                video={true}
                audio={true}
                style={{ position: "absolute", inset: 0 }}
              >
                <CustomCallRoom
                  onEndCall={handleEndCall}
                  callEnded={callEnded}
                  timerDisplay={timerDisplay}
                  otherName={otherName || ""}
                  chatOpen={chatOpen}
                  setChatOpen={setChatOpen}
                />
              </LiveKitRoom>
            )}

            {/* Name badge — top left */}
            <div style={{
              position: "absolute", top: 12, left: 12, zIndex: 10,
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(5,2,14,0.75)", backdropFilter: "blur(12px)",
              borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)",
              padding: "6px 10px",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "livePulse 2s ease infinite", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: "clamp(0.65rem,2vw,0.8rem)", color: "#e9d5ff", letterSpacing: "0.04em", maxWidth: "30vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{otherName}</span>
            </div>

            {/* Timer badge — top right */}
            {session?.startedAt && (
              <div style={{
                position: "absolute", top: 12,
                /* shift left if chat button is visible */
                right: 12,
                zIndex: 10,
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(5,2,14,0.75)", backdropFilter: "blur(12px)",
                borderRadius: 8, border: "1px solid rgba(245,158,11,0.25)",
                padding: "5px 10px",
              }}>
                <Clock style={{ width: 12, height: 12, color: "#f59e0b", flexShrink: 0 }} />
                <span style={{ fontFamily: "'Courier New',monospace", fontSize: "clamp(0.65rem,2vw,0.8rem)", color: "#fbbf24" }}>{timerDisplay}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Chat panel — side drawer on desktop ── */}
        <div style={{
          /* On mobile: hidden via width=0; on desktop: slide in from right */
          width: chatOpen ? "clamp(260px, 30vw, 320px)" : 0,
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          background: "rgba(8,3,20,0.97)",
          borderLeft: "1px solid rgba(139,92,246,0.15)",
          display: "flex", flexDirection: "column",
          flexShrink: 0,
          /* Hide entirely on very small screens; replaced by bottom sheet */
          ...(typeof window !== "undefined" && window.innerWidth < 640 ? { display: "none" } : {}),
        }}
          className="hidden sm:flex sm:flex-col"
        >
          <ChatPanel
            chatMsgs={chatMsgs}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChat={sendChat}
            userId={user?.uid}
            onClose={() => setChatOpen(false)}
            chatBottomRef={chatBottomRef}
          />
        </div>
      </div>

      {/* ── Mobile bottom-sheet chat ── */}
      <div
        className="sm:hidden"
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          pointerEvents: chatOpen ? "auto" : "none",
        }}
      >
        {/* Backdrop */}
        {chatOpen && (
          <div
            onClick={() => setChatOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
          />
        )}
        {/* Sheet */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "65vh",
          background: "rgba(8,3,20,0.98)",
          borderTop: "1px solid rgba(139,92,246,0.2)",
          borderRadius: "20px 20px 0 0",
          display: "flex", flexDirection: "column",
          transform: chatOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}>
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(139,92,246,0.3)" }} />
          </div>
          <ChatPanel
            chatMsgs={chatMsgs}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChat={sendChat}
            userId={user?.uid}
            onClose={() => setChatOpen(false)}
            chatBottomRef={chatBottomRef}
          />
        </div>
      </div>

      {/* Chat toggle button (when closed) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: "fixed",
            right: 12,
            bottom: "clamp(80px,18vw,100px)", /* above control bar */
            zIndex: 50,
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(109,40,217,0.35)",
            border: "1px solid rgba(139,92,246,0.35)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <MessageSquare style={{ width: 17, height: 17, color: "#c084fc" }} />
          {chatMsgs.length > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              width: 16, height: 16, borderRadius: "50%",
              background: "#7c3aed", border: "2px solid #05020e",
              fontFamily: "'Cinzel',serif", fontSize: "0.5rem", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {chatMsgs.length > 9 ? "9+" : chatMsgs.length}
            </span>
          )}
        </button>
      )}

      {/* Rating modal */}
      {showRating && session && (
        <RatingModal
          astroName={session.astroName}
          onSubmit={handleRatingSubmit}
          onSkip={() => router.push("/dashboard/user")}
        />
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 8px #22c55e;}50%{opacity:0.5;box-shadow:0 0 3px #22c55e;} }
      `}</style>
    </div>
  );
}

// ── Reusable chat panel content ──────────────────────────────────────────────
function ChatPanel({
  chatMsgs, chatInput, setChatInput, sendChat, userId, onClose, chatBottomRef,
}: {
  chatMsgs: ChatMsg[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendChat: () => void;
  userId?: string;
  onClose: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(139,92,246,0.15)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare style={{ width: 15, height: 15, color: "#c084fc" }} />
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: "0.72rem", color: "#e9d5ff", letterSpacing: "0.06em" }}>SESSION CHAT</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 4 }}>
          <ChevronRight style={{ width: 17, height: 17 }} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {chatMsgs.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>✨</div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", color: "#374151", fontSize: "0.85rem", fontStyle: "italic" }}>
              No messages yet.<br />Start the conversation!
            </p>
          </div>
        )}
        {chatMsgs.map(msg => {
          const isMe = msg.senderId === userId;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: "0.55rem", color: "#4b5563", letterSpacing: "0.04em", marginBottom: 3, paddingInline: 4 }}>
                {isMe ? "You" : msg.senderName}
              </span>
              <div style={{
                maxWidth: "80%", padding: "8px 12px",
                borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: isMe
                  ? "linear-gradient(135deg,rgba(124,58,237,0.4),rgba(109,40,217,0.3))"
                  : "rgba(255,255,255,0.04)",
                border: isMe ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.06)",
              }}>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "0.9rem", color: isMe ? "#e9d5ff" : "#9ca3af", margin: 0, lineHeight: 1.5 }}>
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(139,92,246,0.15)", display: "flex", gap: 7, flexShrink: 0 }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendChat()}
          placeholder="Type a message…"
          style={{
            flex: 1, background: "rgba(109,40,217,0.08)",
            border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10,
            padding: "9px 12px", color: "#e9d5ff", outline: "none",
            fontFamily: "'Cormorant Garamond',serif", fontSize: "0.9rem",
            minWidth: 0,
          }}
        />
        <button
          onClick={sendChat}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <ChevronRight style={{ width: 15, height: 15, transform: "rotate(-90deg)" }} />
        </button>
      </div>
    </div>
  );
}
