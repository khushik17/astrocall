"use client";
import {
    useLocalParticipant,
    useRemoteParticipants,
    useTracks,
    VideoTrack,
    RoomAudioRenderer,
    type TrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

interface Props {
    onEndCall: () => void;
    callEnded: boolean;
    timerDisplay: string;
    otherName: string;
    chatOpen: boolean;
    setChatOpen: (v: boolean) => void;
}

export default function CustomCallRoom({
    onEndCall,
    callEnded,
    otherName,
    chatOpen,
}: Props) {
    const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
        useLocalParticipant();
    const remoteParticipants = useRemoteParticipants();

    // ── Auto-enable mic + camera on mount ──────────────────────────────────
    useEffect(() => {
        localParticipant.setMicrophoneEnabled(true);
        localParticipant.setCameraEnabled(true);
    }, [localParticipant]);

    const remoteCameraTracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: false }],
        { onlySubscribed: true }
    ).filter(t => !t.participant.isLocal) as TrackReference[];

    const localCameraTracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: false }],
        { onlySubscribed: false }
    ).filter(t => t.participant.isLocal) as TrackReference[];

    const toggleMic    = () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    const toggleCamera = () => localParticipant.setCameraEnabled(!isCameraEnabled);

    const remoteTrack       = remoteCameraTracks[0];
    const localTrack        = localCameraTracks[0];
    const remoteParticipant = remoteParticipants[0];

    return (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>

            {/* ── 🔊 THIS IS WHAT MAKES AUDIO WORK ──────────────────────────────
                RoomAudioRenderer subscribes to all remote audio tracks and plays
                them. Without this component, you see video but hear nothing.     */}
            <RoomAudioRenderer />

            {/* ── Remote video (full screen) ── */}
            <div style={{ flex: 1, position: "relative", background: "#0a0318", overflow: "hidden" }}>
                {remoteTrack ? (
                    <VideoTrack
                        trackRef={remoteTrack}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <div style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 16,
                        padding: "0 1rem",
                    }}>
                        <div style={{
                            width: "clamp(72px,20vw,110px)",
                            height: "clamp(72px,20vw,110px)",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,rgba(124,58,237,0.35),rgba(245,158,11,0.12))",
                            border: "2px solid rgba(124,58,237,0.5)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "clamp(28px,8vw,46px)",
                        }}>
                            🔮
                        </div>
                        <p style={{
                            fontFamily: "'Cinzel',serif",
                            color: "#c084fc",
                            fontSize: "clamp(0.75rem,3vw,0.9rem)",
                            textAlign: "center",
                        }}>
                            {remoteParticipant ? `${otherName} connected` : `Waiting for ${otherName}…`}
                        </p>
                    </div>
                )}

                {/* ── PIP self-view ── */}
                <div style={{
                    position: "absolute",
                    bottom: "clamp(70px,14vw,100px)",
                    right: "clamp(10px,3vw,30px)",
                    width:  "clamp(80px,22vw,140px)",
                    height: "clamp(100px,28vw,180px)",
                    borderRadius: "clamp(10px,2vw,16px)",
                    overflow: "hidden",
                    border: "2px solid white",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    background: "#0d0520",
                    zIndex: 20,
                }}>
                    {localTrack ? (
                        <VideoTrack
                            trackRef={localTrack}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <VideoOff style={{ width: 20, height: 20, color: "#7c3aed" }} />
                        </div>
                    )}
                    <div style={{
                        position: "absolute", bottom: 5, left: 5,
                        background: "rgba(5,2,14,0.75)", borderRadius: 5, padding: "2px 6px",
                    }}>
                        <span style={{ fontFamily: "'Cinzel',serif", fontSize: "clamp(0.45rem,1.5vw,0.55rem)", color: "#c084fc", letterSpacing: "0.06em" }}>YOU</span>
                    </div>
                </div>

                {/* ── Mic muted indicator (shown on remote video when THEY are muted) ── */}
                {remoteParticipant && !remoteParticipant.isMicrophoneEnabled && (
                    <div style={{
                        position: "absolute", bottom: "clamp(70px,14vw,100px)", left: 12, zIndex: 20,
                        background: "rgba(220,38,38,0.85)", borderRadius: 8, padding: "4px 8px",
                        display: "flex", alignItems: "center", gap: 5,
                    }}>
                        <MicOff style={{ width: 12, height: 12, color: "white" }} />
                        <span style={{ fontFamily: "'Cinzel',serif", fontSize: "0.52rem", color: "white", letterSpacing: "0.05em" }}>MUTED</span>
                    </div>
                )}
            </div>

            {/* ── Floating Control bar ── */}
            <div style={{
                position: "absolute",
                bottom: "clamp(12px,3vw,24px)",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(8px,3vw,16px)",
                background: "rgba(13,5,32,0.85)",
                backdropFilter: "blur(20px)",
                padding: "clamp(6px,1.5vw,8px) clamp(14px,4vw,24px)",
                borderRadius: 32,
                border: "1px solid rgba(139,92,246,0.15)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                zIndex: 30,
                maxWidth: "calc(100vw - 24px)",
                whiteSpace: "nowrap",
            }}>
                <ControlBtn
                    onClick={toggleMic}
                    active={isMicrophoneEnabled}
                    activeIcon={<Mic   style={{ width: "clamp(14px,4vw,18px)", height: "clamp(14px,4vw,18px)" }} />}
                    inactiveIcon={<MicOff style={{ width: "clamp(14px,4vw,18px)", height: "clamp(14px,4vw,18px)" }} />}
                />
                <ControlBtn
                    onClick={toggleCamera}
                    active={isCameraEnabled}
                    activeIcon={<Video    style={{ width: "clamp(14px,4vw,18px)", height: "clamp(14px,4vw,18px)" }} />}
                    inactiveIcon={<VideoOff style={{ width: "clamp(14px,4vw,18px)", height: "clamp(14px,4vw,18px)" }} />}
                />

                {/* End call */}
                <button
                    onClick={onEndCall}
                    disabled={callEnded}
                    style={{
                        width:  "clamp(38px,10vw,44px)",
                        height: "clamp(38px,10vw,44px)",
                        borderRadius: "50%",
                        background: callEnded ? "rgba(127,29,29,0.4)" : "linear-gradient(135deg,#ef4444,#dc2626)",
                        border: "none",
                        cursor: callEnded ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: callEnded ? "none" : "0 4px 16px rgba(220,38,38,0.4)",
                        transition: "all 0.2s",
                        opacity: callEnded ? 0.5 : 1,
                        flexShrink: 0,
                        marginLeft: "clamp(4px,1.5vw,8px)",
                    }}
                >
                    <svg width="clamp(16px,4.5vw,20px)" height="clamp(16px,4.5vw,20px)" viewBox="0 0 24 24" fill="white">
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                    </svg>
                </button>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
            `}</style>
        </div>
    );
}

function ControlBtn({ onClick, active, activeIcon, inactiveIcon }: {
    onClick: () => void;
    active: boolean;
    activeIcon: React.ReactNode;
    inactiveIcon: React.ReactNode;
}) {
    return (
        <button onClick={onClick} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width:  "clamp(34px,9vw,40px)",
            height: "clamp(34px,9vw,40px)",
            borderRadius: "50%",
            background: active ? "rgba(109,40,217,0.15)" : "rgba(220,38,38,0.12)",
            border: `1px solid ${active ? "rgba(139,92,246,0.3)" : "rgba(220,38,38,0.3)"}`,
            color: active ? "#e9d5ff" : "#f87171",
            cursor: "pointer",
            transition: "all 0.2s",
            flexShrink: 0,
        }}>
            {active ? activeIcon : inactiveIcon}
        </button>
    );
}
