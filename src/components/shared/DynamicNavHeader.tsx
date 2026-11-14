"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowLeft,
  Film,
  Gamepad2,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  Trophy,
  MessageSquare,
  Share2,
  Users,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import MovieHeader from "../movies/MovieHeader";
import GameHeader from "../games/GameHeader";
import SoundToggle from "./SoundToggle";

export default function DynamicNavHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Páginas de Autenticación
  if (pathname === "/login" || pathname === "/register") {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-cine-800/80 bg-cine-950/80 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-cine-400 hover:text-white transition-colors bg-cine-900/80 px-3 py-1.5 rounded-xl border border-cine-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Atlas</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold text-white text-base tracking-tight group"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-purple-500/30 flex items-center justify-center bg-cine-900/60 shadow-inner group-hover:border-purple-400/60 transition-colors shrink-0">
              <img src="/Atlas.png" alt="Atlas Logo" className="w-full h-full object-cover" />
            </div>
            <span>Atlas</span>
          </Link>
        </div>
      </header>
    );
  }

  // Universo de Videojuegos
  if (pathname.startsWith("/games")) {
    return <GameHeader />;
  }

  // Launcher Principal (Centro de Mando), Ranking Global y Perfil Público Unificado
  if (
    pathname === "/" ||
    pathname === "/friends" ||
    pathname.startsWith("/friends/") ||
    pathname === "/amigos" ||
    pathname === "/reviews" ||
    pathname.startsWith("/reviews/") ||
    pathname === "/resenas" ||
    pathname === "/leaderboard" ||
    pathname.startsWith("/leaderboard/") ||
    pathname === "/ranking" ||
    pathname.startsWith("/u/")
  ) {
    const centralNavLinks = [
      {
        href: "/tv/movies",
        label: "Cine & Series",
        mobileLabel: "Cine & Series",
        icon: Film,
        iconColor: "text-amber-400",
        activeBg:
          "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-gold-glow",
        isActive: (path: string) =>
          path.startsWith("/tv") && path !== "/tv/recommendations",
      },
      {
        href: "/tv/recommendations",
        label: "Para ti",
        mobileLabel: "Para ti (Recomendaciones)",
        icon: Sparkles,
        iconColor: "text-amber-400",
        activeBg:
          "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-gold-glow",
        isActive: (path: string) => path === "/tv/recommendations",
      },
      {
        href: "/games",
        label: "Videojuegos",
        mobileLabel: "Videojuegos",
        icon: Gamepad2,
        iconColor: "text-purple-400",
        activeBg:
          "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(139,92,246,0.2)]",
        isActive: (path: string) => path.startsWith("/games"),
      },
      {
        href: "/friends",
        label: "Amigos",
        mobileLabel: "Amigos",
        icon: Users,
        iconColor: "text-sky-400",
        activeBg:
          "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.2)]",
        isActive: (path: string) =>
          path === "/friends" ||
          path === "/amigos" ||
          path.startsWith("/friends/"),
      },
      {
        href: "/leaderboard",
        label: "Ranking",
        mobileLabel: "Ranking",
        icon: Trophy,
        iconColor: "text-amber-400",
        activeBg:
          "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-gold-glow",
        isActive: (path: string) =>
          path === "/leaderboard" ||
          path === "/ranking" ||
          path.startsWith("/leaderboard/"),
      },
      {
        href: "/reviews",
        label: "Reseñas",
        mobileLabel: "Reseñas",
        icon: MessageSquare,
        iconColor: "text-pink-400",
        activeBg:
          "bg-pink-500/15 text-pink-400 border border-pink-500/30 shadow-[0_0_10px_rgba(244,114,182,0.2)]",
        isActive: (path: string) =>
          path === "/reviews" ||
          path === "/resenas" ||
          path.startsWith("/reviews/"),
      },
    ];

    return (
      <header className="sticky top-0 z-40 w-full border-b border-cine-800/80 bg-cine-950/90 backdrop-blur-xl shadow-lg">
        <div className="relative w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0 z-10"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-purple-500/30 flex items-center justify-center bg-cine-900/60 shadow-inner group-hover:border-purple-400/60 transition-colors shrink-0">
              <img src="/Atlas.png" alt="Atlas Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-base tracking-tight">
                Atlas
              </span>
              <span className="text-[9px] uppercase tracking-widest text-cine-400 font-mono -mt-1">
                Centro de Mando
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center justify-center gap-1.5 xl:gap-2 absolute left-1/2 -translate-x-1/2 pointer-events-auto">
            {centralNavLinks.map((link) => {
              const Icon = link.icon;
              const active = link.isActive(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all border ${
                    active
                      ? link.activeBg
                      : "border-transparent text-cine-300 hover:text-white hover:bg-cine-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${link.iconColor}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
            <SoundToggle />

            {session?.user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cine-900 hover:bg-cine-800 border border-cine-700/80 transition-colors"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "Usuario"}
                      className="w-6 h-6 rounded-full object-cover border border-purple-500/40 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {(session.user.name ||
                        session.user.username ||
                        "U")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-white max-w-[100px] truncate">
                    {session.user.name || session.user.username}
                  </span>
                  <ChevronDown className="w-3 h-3 text-cine-400" />
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-cine-900 border border-cine-800 rounded-xl shadow-2xl py-1 z-50 animate-fade-in"
                    onMouseLeave={() => setIsMenuOpen(false)}
                  >
                    <div className="px-3 py-2.5 border-b border-cine-800 flex items-center gap-2.5">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || "Usuario"}
                          className="w-8 h-8 rounded-full object-cover border border-purple-500/40 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {(session.user.name ||
                            session.user.username ||
                            "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {session.user.name || session.user.username}
                        </p>
                        <p className="text-[10px] text-cine-400 truncate font-mono">
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/u/${session.user.username || session.user.id}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:bg-cine-800 hover:text-white"
                    >
                      <Share2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Mi Perfil Público</span>
                    </Link>
                    <Link
                      href="/tv/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-cine-200 hover:bg-cine-800 hover:text-white"
                    >
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      <span>Perfil Cinéfilo</span>
                    </Link>
                    <Link
                      href="/games/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-cine-200 hover:bg-cine-800 hover:text-white"
                    >
                      <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Perfil Gamer</span>
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-300 bg-cine-900 hover:bg-cine-800 border border-purple-500/40 transition-all"
                >
                  <span>Crear Cuenta</span>
                </Link>
              </div>
            )}

            {/* Botón hamburguesa móvil */}
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-2 rounded-xl text-cine-400 hover:text-white hover:bg-cine-900 border border-cine-800 md:hidden"
              aria-label="Abrir menú"
            >
              {isMobileNavOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Menú desplegable móvil */}
        {isMobileNavOpen && (
          <div className="md:hidden border-t border-cine-800 bg-cine-950/95 px-4 py-3 space-y-1.5 backdrop-blur-xl animate-fade-in">
            {session?.user && (
              <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-cine-800">
                <Link
                  href="/tv/profile"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                >
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>Perfil Cinéfilo</span>
                </Link>
                <Link
                  href="/games/profile"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Perfil Gamer</span>
                </Link>
              </div>
            )}
            {centralNavLinks.map((link) => {
              const Icon = link.icon;
              const active = link.isActive(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    active
                      ? link.activeBg
                      : "border-transparent text-cine-300 hover:text-white hover:bg-cine-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.iconColor}`} />
                  <span>{link.mobileLabel}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>
    );
  }

  // Universo de Películas
  return <MovieHeader />;
}
