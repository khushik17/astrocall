"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import { Home, Users, LayoutDashboard, ChevronDown, LogOut, Menu, X, Star } from "lucide-react";

export default function GlassNavBar() {
    const { user, profile, logout, loading } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const dashLink =
        profile?.role === "astrologer" ? "/dashboard/astrologer" :
            profile?.role === "admin" ? "/admin" : "/dashboard/user";

    const getDisplayName = () => {
        if (!profile) return "User";
        const rawName = profile.displayName || profile.email?.split("@")[0];
        return rawName ? rawName.split(" ")[0] : "User";
    };

    const getInitials = () => {
        if (!profile) return "U";
        const rawName = profile.displayName || profile.email;
        return rawName ? rawName.charAt(0).toUpperCase() : "U";
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <div className="fixed top-6 left-6 z-50 flex items-center gap-3">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/5 dark:bg-[#0a0415]/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-colors text-[#c4b5fd] hover:text-white text-xs font-bold uppercase tracking-wide"
                        style={{ fontFamily: "'Cinzel',serif" }}
                    >
                        <Home size={14} className="text-[#a78bfa]" /> <span className="hidden md:inline">Homepage</span>
                    </Link>
                    <Link
                        href="/astrologers"
                        className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-colors text-[#c4b5fd] hover:text-white text-xs font-bold uppercase tracking-wide"
                        style={{ fontFamily: "'Cinzel',serif" }}
                    >
                        <Users size={14} className="text-[#a78bfa]" /> <span className="hidden md:inline">Astrologers</span>
                    </Link>
                    {user && (
                        <Link
                            href={dashLink}
                            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-colors text-[#c4b5fd] hover:text-white text-xs font-bold uppercase tracking-wide"
                            style={{ fontFamily: "'Cinzel',serif" }}
                        >
                            <LayoutDashboard size={14} className="text-[#a78bfa]" /> <span className="hidden md:inline">Dashboard</span>
                        </Link>
                    )}
                </div>
            </div>

            <div className="fixed top-6 right-6 z-50 flex items-center gap-3 min-h-[44px]">
                {/* User Info & Menu */}
                {loading ? null : user ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="group flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-white/5 dark:bg-[#0a0415]/60 border border-white/10 hover:bg-white/15 hover:border-white/30 text-white transition-all backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c084fc] to-[#7c3aed] flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden border border-[#a78bfa]/30">
                                {profile?.photoURL ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={profile.photoURL} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </>
                                ) : (
                                    getInitials()
                                )}
                            </div>
                            <span className="text-xs font-bold tracking-wide font-body text-[#c4b5fd] group-hover:text-white hidden sm:inline">
                                {getDisplayName()}
                            </span>
                            <div className={`opacity-50 group-hover:opacity-100 transition-all duration-200 text-[#a78bfa] group-hover:text-white ${showUserMenu ? "rotate-180" : ""}`}>
                                <ChevronDown size={14} />
                            </div>
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-3 w-56 rounded-xl bg-[#0a0415]/95 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                                <div className="p-4 border-b border-white/10">
                                    <div className="text-[9px] text-[#a78bfa] font-mono uppercase mb-1 tracking-widest">
                                        Account
                                    </div>
                                    <div className="text-sm text-white font-bold truncate">
                                        {profile?.displayName || profile?.email || "Seeker"}
                                    </div>
                                </div>
                                <Link
                                    href={dashLink}
                                    onClick={() => setShowUserMenu(false)}
                                    className="flex items-center gap-2 w-full px-4 py-3 text-xs uppercase font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                                    style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }}
                                >
                                    <LayoutDashboard size={14} /> Dashboard
                                </Link>
                                {profile?.role === "admin" && (
                                    <Link
                                        href="/admin"
                                        onClick={() => setShowUserMenu(false)}
                                        className="flex items-center gap-2 w-full px-4 py-3 text-xs uppercase font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                                        style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }}
                                    >
                                        <Users size={14} /> Admin
                                    </Link>
                                )}
                                <button
                                    onClick={() => { logout(); setShowUserMenu(false); }}
                                    className="flex items-center gap-2 w-full px-4 py-3 text-xs uppercase font-bold text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                                    style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }}
                                >
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/5 dark:bg-[#0a0415]/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                        <Link href="/auth/login" className="px-4 py-2 text-xs text-white font-bold rounded-full hover:bg-white/10 transition-colors uppercase" style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }}>
                            Sign In
                        </Link>
                        <Link href="/auth/register" className="px-4 py-2 text-xs bg-gradient-to-r from-[#7c3aed] to-[#d97706] text-white font-bold rounded-full shadow-lg shadow-[#7c3aed]/20 hover:scale-105 transition-transform uppercase hidden sm:inline-block" style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }}>
                            Join Free
                        </Link>
                    </div>
                )}

                {/* Mobile Menu Toggle */}
                <div className="flex md:hidden items-center p-1.5 rounded-full bg-white/5 dark:bg-[#0a0415]/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <button
                        className="text-white p-2"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown */}
            {isOpen && (
                <div className="fixed top-[88px] left-6 right-6 p-4 rounded-3xl border border-white/10 flex flex-col gap-2 bg-[#0a0415]/95 backdrop-blur-2xl shadow-2xl z-40 animate-in slide-in-from-top-4">
                    <Link href="/astrologers" className="p-4 rounded-xl hover:bg-white/5 text-white font-bold text-sm uppercase tracking-widest" style={{ fontFamily: "'Cinzel',serif" }} onClick={() => setIsOpen(false)}>Astrologers</Link>

                    {loading ? null : user ? (
                        <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6d28d9] to-[#c084fc] flex items-center justify-center text-white font-bold overflow-hidden border border-[#a78bfa]/30">
                                    {profile?.photoURL ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={profile.photoURL} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        getInitials()
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-white font-bold truncate font-body">{getDisplayName()}</div>
                                    <div className="text-xs text-white/50 truncate">{profile?.email}</div>
                                </div>
                            </div>
                            <Link href={dashLink} className="w-full py-3 mb-2 bg-white/5 hover:bg-white/10 border border-white/10 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-white text-xs uppercase" style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }} onClick={() => setIsOpen(false)}>
                                <LayoutDashboard size={14} /> Dashboard
                            </Link>
                            <button
                                onClick={() => { logout(); setIsOpen(false); }}
                                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs uppercase"
                                style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }}
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 mt-2">
                            <Link href="/auth/login" className="w-full py-4 bg-white/5 text-white font-bold rounded-xl text-center text-xs uppercase" style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }} onClick={() => setIsOpen(false)}>Sign In</Link>
                            <Link href="/auth/register" className="w-full py-4 bg-gradient-to-r from-[#7c3aed] to-[#d97706] text-white font-bold rounded-xl shadow-lg text-center text-xs uppercase" style={{ fontFamily: "'Cinzel',serif", letterSpacing: "1px" }} onClick={() => setIsOpen(false)}>Join Free</Link>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
