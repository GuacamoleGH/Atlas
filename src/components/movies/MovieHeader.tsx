"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Film,
  Tv,
  Bookmark,
  CheckCircle2,
  User,
  Menu,
  X,
  ArrowLeft,
  LogIn,
  LogOut,
  ChevronDown,
  Share2,
  Trophy,
  MessageSquare,
  Award,
  Users,
} from "lucide-react";
import MovieSearchInput from "./MovieSearchInput";
import SoundToggle from "@/components/shared/SoundToggle";
import { sounds } from "@/lib/sounds";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navLinks = [
    { href: "/movies", label: "Películas", icon: Film },
    { href: "/series", label: "Series", icon: Tv },
    { href: "/watchlist", label: "Watchlist", icon: Bookmark },
    { href: "/watched", label: "Vistas", icon: CheckCircle2 },
    { href: "/friends", label: "Amigos", icon: Users },
    { href: "/leaderboard", label: "Ranking", icon: Trophy },
    { href: "/reviews", label: "Reseñas", icon: MessageSquare },
  ];

  const isActive = (href: string) => {
    if (href === "/movies") return pathname === "/movies";
    if (href === "/series")
      return pathname === "/series" || pathname.startsWith("/series/");
    if (href === "/friends")
      return (
        pathname === "/friends" ||
        pathname.startsWith("/friends/") ||
        pathname === "/amigos"
      );
    if (href === "/leaderboard")
      return pathname === "/leaderboard" || pathname === "/ranking";
    if (href === "/reviews")
      return pathname === "/reviews" || pathname === "/resenas";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cine-800 bg-cine-950/90 backdrop-blur-xl shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Izquierda: Botón Volver al Inicio + Logo Cine */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-cine-400 hover:text-white bg-cine-900/80 hover:bg-cine-800 border border-cine-700/80 transition-colors shrink-0"
            title="Volver al Centro de Mando Principal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Inicio</span>
          </Link>

          <Link
            href="/movies"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shadow-gold-glow">
              <Film className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight flex items-center gap-1">
                <span className="text-amber-400 font-black">Televisión</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-cine-400 font-mono -mt-1">
                Sofa Knowledge
              </span>
            </div>
          </Link>
        </div>

        {/* Centro: Navegación Principal Equidistante y Equilibrada */}
        <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 flex-1 px-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-gold-glow"
                    : "text-cine-300 hover:text-white hover:bg-cine-900"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${active ? "fill-amber-400 text-amber-400" : "text-cine-400"}`}
                />
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Derecha: Audio + Menú de Usuario */}
        <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
          <SoundToggle />

          {/* Menú de Usuario / Botones Login */}
          {session?.user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-cine-900/80 hover:bg-cine-800 border border-amber-500/30 hover:border-amber-500/60 transition-colors shadow-sm"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Usuario"}
                    className="w-6 h-6 rounded-lg object-cover border border-amber-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {(session.user.name ||
                      session.user.username ||
                      "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-cine-200 max-w-[90px] truncate">
                  {session.user.name || session.user.username}
                </span>
                <ChevronDown className="w-3 h-3 text-cine-400" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-cine-900 border border-cine-800 rounded-xl shadow-2xl py-1 z-50 animate-fade-in"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2.5 border-b border-cine-800 flex items-center gap-2.5">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "Usuario"}
                        className="w-8 h-8 rounded-lg object-cover border border-amber-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
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
                    href={`/u/${session.user.username || session.user.id}?tab=cinema`}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:bg-cine-800 hover:text-white"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mi Perfil Público</span>
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-cine-200 hover:bg-cine-800 hover:text-white"
                  >
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mi Perfil Cinéfilo</span>
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
            <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cine-950 bg-amber-400 hover:bg-amber-300 shadow-gold-glow transition-all whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Iniciar Sesión</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 transition-all whitespace-nowrap shrink-0"
              >
                <span className="whitespace-nowrap">Registro</span>
              </Link>
            </div>
          )}
        </div>

        {/* Botón menú móvil y sonido */}
        <div className="flex items-center gap-2 lg:hidden">
          <SoundToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-cine-400 hover:text-white hover:bg-cine-900 border border-cine-800"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda Dedicada (Sub-barra elegante debajo del menú) */}
      <div className="border-t border-cine-800/80 bg-cine-950/70 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 shadow-inner">
        <div className="max-w-2xl mx-auto w-full">
          <MovieSearchInput />
        </div>
      </div>

      {/* Menú desplegable móvil */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-cine-800 bg-cine-950/95 px-4 py-3 space-y-1">
          {session?.user ? (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-cine-900 border border-cine-800 mb-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Usuario"}
                  className="w-8 h-8 rounded-lg object-cover border border-amber-500/40 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {(session.user.name ||
                    session.user.username ||
                    "U")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {session.user.name || session.user.username}
                </p>
                <p className="text-[10px] text-cine-400 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Modo Invitado</p>
                <p className="text-[10px] text-cine-400">
                  Inicia sesión para guardar tus valoraciones
                </p>
              </div>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-cine-950 text-xs font-bold"
              >
                Entrar
              </Link>
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-cine-300 hover:bg-cine-900"
                }`}
              >
                <Icon className="w-4 h-4 text-amber-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-cine-800 mt-2 space-y-1">
            {session?.user ? (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 text-center rounded-xl text-xs font-bold bg-amber-400 text-cine-950 shadow-gold-glow"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 text-center rounded-xl text-xs font-semibold bg-cine-900 border border-cine-800 text-amber-300"
                >
                  Registrarse
                </Link>
              </div>
            )}

            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cine-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Inicio</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
