"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  ArrowRight,
  Loader2,
  X,
  Calendar,
} from "lucide-react";
import { sounds } from "@/lib/sounds";

interface FriendUser {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  createdAt: string;
  profileUrl: string;
  cinema: {
    totalWatched: number;
    totalMovies: number;
    totalSeries: number;
    avgRating: number | null;
    ballKnowledge: number | null;
    level: number;
    rankTitle: string;
    rankIcon: string;
  };
  gaming: {
    totalGames: number;
    completedGames: number;
    totalHours: number;
    avgRating: number | null;
    gameKnowledge: number | null;
    level: number;
    rankTitle: string;
    rankIcon: string;
  };
}

export default function GlobalFriendsPage() {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("recent");

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/friends");
        if (res.ok) {
          const data = await res.json();
          const friendsList = data.friends || [];
          setFriends(friendsList);
          // Si el backend envía totalMembers, lo usamos; si no, calculamos incluyendo al usuario actual (+1)
          const membersCount =
            data.totalMembers ||
            (friendsList.length > 0 ? friendsList.length + 1 : 3);
          setTotalMembers(membersCount);
        }
      } catch (err) {
        console.error("Error al cargar amigos de Atlas:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, []);

  const filteredAndSortedFriends = useMemo(() => {
    let result = [...friends];

    // 1. Filtrado por texto (nombre, username, bio)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.username && f.username.toLowerCase().includes(q)) ||
          (f.bio && f.bio.toLowerCase().includes(q)),
      );
    }

    // 2. Ordenación
    result.sort((a, b) => {
      if (sortBy === "cinema_watched") {
        return b.cinema.totalWatched - a.cinema.totalWatched;
      }
      if (sortBy === "sofa_knowledge") {
        return (b.cinema.ballKnowledge || 0) - (a.cinema.ballKnowledge || 0);
      }
      if (sortBy === "gaming_hours") {
        return b.gaming.totalHours - a.gaming.totalHours;
      }
      if (sortBy === "game_knowledge") {
        return (b.gaming.gameKnowledge || 0) - (a.gaming.gameKnowledge || 0);
      }
      // "recent" por defecto
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [friends, searchQuery, sortBy]);

  return (
    <div className="space-y-8 pb-20 animate-fadeIn">
      {/* 1. Cabecera Banner de la Comunidad Global Atlas */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-950/30 via-cine-900 to-purple-950/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Users className="w-3.5 h-3.5" />
              <span>Comunidad Atlas</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Amigos & Comunidad
            </h1>
            <p className="text-xs sm:text-sm text-cine-300 max-w-2xl leading-relaxed">
              Explora la red de amigos de Atlas. Descubre sus perfiles, gustos
              cinéfilos, bibliotecas gamer y horas de juego.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-5 py-4 rounded-2xl bg-cine-900/90 border border-sky-500/30 flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-cine-400 uppercase tracking-wider font-mono">
                  Miembros Registrados
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {isLoading
                    ? "..."
                    : totalMembers ||
                      (friends.length > 0 ? friends.length + 1 : 3)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-cine-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cine-900 border border-cine-800 text-xs font-bold text-white">
            <Users className="w-4 h-4 text-sky-400" />
            <span>Amigos</span>
            <span className="ml-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-[11px]">
              {filteredAndSortedFriends.length}
            </span>
          </div>
        </div>

        {/* Buscador y Filtro de Orden */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Buscador de Amigos */}
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-cine-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, @usuario o bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-cine-900 border border-cine-800 text-white placeholder-cine-500 text-xs focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cine-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Menú de Ordenación */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                sounds.click();
                setSortBy(e.target.value);
              }}
              className="px-3 py-2 rounded-xl bg-cine-900 border border-cine-800 text-cine-200 text-xs focus:outline-none focus:border-sky-500/60 font-semibold cursor-pointer"
            >
              <option value="recent">Más recientes</option>
              <option value="cinema_watched">Más títulos vistos (Cine)</option>
              <option value="sofa_knowledge">Mayor Sofa Knowledge</option>
              <option value="gaming_hours">Más horas jugadas (Gamer)</option>
              <option value="game_knowledge">Mayor Game Knowledge</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Lista o Grid de Tarjetas de Amigos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-cine-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span className="text-xs uppercase tracking-widest font-mono">
            Sincronizando amigos de Atlas...
          </span>
        </div>
      ) : filteredAndSortedFriends.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-cine-800/80 bg-cine-900/40 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cine-800/80 text-cine-400 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No se encontraron amigos
            </h3>
            <p className="text-xs text-cine-400 max-w-sm mx-auto">
              {searchQuery
                ? `No hay coincidencias con "${searchQuery}". Intenta con otro término o limpia el buscador.`
                : "No hay otros miembros registrados en la comunidad todavía."}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-xl bg-cine-800 text-white text-xs font-semibold hover:bg-cine-700 transition-colors"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedFriends.map((friend) => {
            const memberYear = friend.createdAt
              ? new Date(friend.createdAt).getFullYear()
              : 2026;

            return (
              <Link
                key={friend.id}
                href={friend.profileUrl}
                onClick={() => sounds.nav()}
                className="group glass-panel rounded-3xl border border-cine-800/80 bg-cine-900/50 hover:bg-cine-900/90 hover:border-sky-500/50 transition-all duration-300 p-6 flex flex-col justify-between gap-5 relative overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-sky-500/10 cursor-pointer hover:-translate-y-0.5"
              >
                {/* Fondo sutil de glow al hacer hover */}
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-sky-500/5 group-hover:bg-sky-500/15 rounded-full blur-2xl transition-all pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  {/* Fila del Perfil: Avatar + Nombre + Username */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0 group-hover:scale-105 transition-transform">
                      {friend.image ? (
                        <img
                          src={friend.image}
                          alt={friend.name || "Usuario"}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-cine-700 group-hover:border-sky-400 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cine-800 to-cine-900 border-2 border-cine-700 group-hover:border-sky-400 flex items-center justify-center font-bold text-white text-lg shadow-md">
                          {friend.name
                            ? friend.name.charAt(0).toUpperCase()
                            : "U"}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-black text-white text-base group-hover:text-sky-300 transition-colors truncate">
                        {friend.name || "Usuario de Atlas"}
                      </div>
                      <div className="text-xs text-cine-400 font-mono truncate">
                        @{friend.username || friend.id.slice(0, 8)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-cine-500 font-mono mt-0.5">
                        <Calendar className="w-3 h-3 text-cine-500" />
                        <span>Miembro {memberYear}</span>
                      </div>
                    </div>
                  </div>

                  {/* Biografía */}
                  {friend.bio && (
                    <p className="text-xs text-cine-300 line-clamp-2 italic bg-cine-950/40 p-2.5 rounded-xl border border-cine-800/40">
                      &ldquo;{friend.bio}&rdquo;
                    </p>
                  )}

                  {/* Insignias de Rango: Cine & Gaming */}
                  <div className="space-y-2 pt-1">
                    {/* Rango Cinéfilo */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {friend.cinema.rankIcon}
                        </span>
                        <span className="text-xs font-bold text-amber-300">
                          Nvl. {friend.cinema.level}
                        </span>
                      </div>
                      <span className="text-[11px] text-cine-300 font-semibold truncate max-w-[140px]">
                        {friend.cinema.rankTitle}
                      </span>
                    </div>

                    {/* Rango Gamer */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {friend.gaming.rankIcon}
                        </span>
                        <span className="text-xs font-bold text-purple-300">
                          Nvl. {friend.gaming.level}
                        </span>
                      </div>
                      <span className="text-[11px] text-cine-300 font-semibold truncate max-w-[140px]">
                        {friend.gaming.rankTitle}
                      </span>
                    </div>
                  </div>

                  {/* Métricas Numéricas del Perfil */}
                  <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                    <div className="bg-cine-950/60 p-2 rounded-xl border border-cine-800/80">
                      <div className="text-[10px] text-cine-400 font-medium uppercase font-mono">
                        Vistos
                      </div>
                      <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                        {friend.cinema.totalWatched}
                      </div>
                    </div>
                    <div className="bg-cine-950/60 p-2 rounded-xl border border-cine-800/80">
                      <div className="text-[10px] text-cine-400 font-medium uppercase font-mono">
                        Sofa K.
                      </div>
                      <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                        {friend.cinema.ballKnowledge !== null
                          ? `${friend.cinema.ballKnowledge}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="bg-cine-950/60 p-2 rounded-xl border border-cine-800/80">
                      <div className="text-[10px] text-cine-400 font-medium uppercase font-mono">
                        Horas
                      </div>
                      <div className="text-xs font-bold text-purple-400 font-mono mt-0.5">
                        {friend.gaming.totalHours.toLocaleString()}h
                      </div>
                    </div>
                    <div className="bg-cine-950/60 p-2 rounded-xl border border-cine-800/80">
                      <div className="text-[10px] text-cine-400 font-medium uppercase font-mono">
                        Game K.
                      </div>
                      <div className="text-xs font-bold text-purple-400 font-mono mt-0.5">
                        {friend.gaming.gameKnowledge !== null
                          ? `${friend.gaming.gameKnowledge}%`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón / Indicador de Enlace al Perfil */}
                <div className="pt-2 relative z-10 border-t border-cine-800/60">
                  <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-cine-800/80 text-cine-200 border border-cine-700/60 group-hover:bg-sky-500/20 group-hover:text-sky-300 group-hover:border-sky-500/40 transition-all">
                    <span>Ver Perfil Público</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
