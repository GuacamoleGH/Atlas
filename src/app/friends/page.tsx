"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Film,
  Star,
  Brain,
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
}

export default function CinemaFriendsPage() {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "recent" | "watched" | "ballKnowledge" | "rating"
  >("recent");

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/friends");
        if (res.ok) {
          const data = await res.json();
          setFriends(data.friends || []);
        }
      } catch (err) {
        console.error("Error al cargar amigos:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, []);

  const filteredAndSortedFriends = useMemo(() => {
    let result = [...friends];

    // Búsqueda por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.username && f.username.toLowerCase().includes(q)) ||
          (f.bio && f.bio.toLowerCase().includes(q)),
      );
    }

    // Ordenación
    result.sort((a, b) => {
      if (sortBy === "watched") {
        return b.cinema.totalWatched - a.cinema.totalWatched;
      }
      if (sortBy === "ballKnowledge") {
        return (b.cinema.ballKnowledge || 0) - (a.cinema.ballKnowledge || 0);
      }
      if (sortBy === "rating") {
        return (b.cinema.avgRating || 0) - (a.cinema.avgRating || 0);
      }
      // "recent" por defecto
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [friends, searchQuery, sortBy]);

  return (
    <div className="space-y-8 pb-20 animate-fadeIn">
      {/* 1. Cabecera Banner de Amigos Cinéfilos */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-cine-900 to-cine-950 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Users className="w-5 h-5" />
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                Comunidad Cinephile
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Amigos & Cinéfilos
            </h1>
            <p className="text-xs sm:text-sm text-cine-300 max-w-xl leading-relaxed">
              Explora todos los perfiles de la plataforma, descubre sus tops
              cinéfilos y sumérgete en sus valoraciones de cine y series.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-cine-950/80 border border-amber-500/30 text-center shadow-gold-glow">
              <span className="block text-2xl font-black text-amber-400 font-mono">
                {friends.length}
              </span>
              <span className="text-[10px] text-cine-400 font-mono uppercase tracking-wider">
                Registrados
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Barra de Búsqueda y Ordenación */}
      <section className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Input de búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-cine-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, @usuario o bio..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-cine-900/90 border border-cine-800 text-xs text-white placeholder:text-cine-500 focus:outline-none focus:border-amber-500/60 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cine-500 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Ordenación */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-cine-900/90 border border-cine-800 text-xs text-cine-300 font-medium focus:outline-none focus:border-amber-500/60 cursor-pointer"
          >
            <option value="recent">Más recientes</option>
            <option value="watched">Más películas y series vistas</option>
            <option value="ballKnowledge">Mayor Sofa Knowledge</option>
            <option value="rating">Mejor valoración media</option>
          </select>
        </div>
      </section>

      {/* 3. Grid de Amigos */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-xs text-cine-400 font-mono">
            Cargando comunidad cinéfila...
          </span>
        </div>
      ) : filteredAndSortedFriends.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-cine-800/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cine-900 mx-auto flex items-center justify-center text-cine-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {searchQuery
              ? "No se encontraron amigos con esa búsqueda"
              : "No hay otros usuarios registrados por el momento"}
          </h3>
          <p className="text-xs text-cine-400 max-w-sm mx-auto">
            {searchQuery
              ? "Prueba buscando por otro término o limpia el filtro de búsqueda."
              : "Invita a tus amigos compartiéndoles tu enlace de perfil para que se unan a Cinephile."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedFriends.map((friend) => {
            const memberYear = friend.createdAt
              ? new Date(friend.createdAt).getFullYear()
              : 2026;

            return (
              <div
                key={friend.id}
                className="glass-panel p-5 rounded-3xl border border-cine-800/80 hover:border-amber-500/40 bg-gradient-to-b from-cine-900/90 to-cine-950/90 shadow-lg hover:shadow-gold-glow transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Parte Superior: Avatar + Nombres */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-amber-500/30 bg-cine-950 shrink-0 flex items-center justify-center">
                      {friend.image ? (
                        <img
                          src={friend.image}
                          alt={friend.name || friend.username || "Usuario"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-600 to-yellow-800 flex items-center justify-center font-black text-white text-lg">
                          {(friend.name ||
                            friend.username ||
                            "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Identidad */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {friend.name || friend.username || "Usuario"}
                      </h3>
                      <p className="text-[11px] font-mono text-amber-400 truncate">
                        @{friend.username || friend.id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-cine-500 mt-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>Miembro {memberYear}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-cine-400 line-clamp-2 leading-relaxed min-h-[36px]">
                    {friend.bio || "Miembro de la comunidad de Cinephile."}
                  </p>

                  {/* Insignia de Nivel y Rango Cinéfilo */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <span>{friend.cinema.rankIcon}</span>
                      <span className="truncate max-w-[150px]">
                        Nvl. {friend.cinema.level} • {friend.cinema.rankTitle}
                      </span>
                    </span>
                  </div>

                  {/* Métricas Cinéfilas Destacadas */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                    {/* Títulos Vistos */}
                    <div className="p-2.5 rounded-2xl bg-cine-950/60 border border-cine-800/80 space-y-0.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold">
                        <Film className="w-3 h-3" />
                        <span>Vistos</span>
                      </div>
                      <div className="text-sm font-black text-white font-mono pt-0.5">
                        {friend.cinema.totalWatched}
                      </div>
                    </div>

                    {/* Nota Media */}
                    <div className="p-2.5 rounded-2xl bg-cine-950/60 border border-cine-800/80 space-y-0.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>Media</span>
                      </div>
                      <div className="text-sm font-black text-white font-mono pt-0.5">
                        {friend.cinema.avgRating
                          ? `${friend.cinema.avgRating} ★`
                          : "—"}
                      </div>
                    </div>

                    {/* Sofa Knowledge */}
                    <div className="p-2.5 rounded-2xl bg-cine-950/60 border border-cine-800/80 space-y-0.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold">
                        <Brain className="w-3 h-3" />
                        <span>Sofa K.</span>
                      </div>
                      <div className="text-sm font-black text-amber-300 font-mono pt-0.5">
                        {friend.cinema.ballKnowledge !== null
                          ? `${friend.cinema.ballKnowledge}%`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de Enlace a Perfil Cinéfilo */}
                <div className="pt-4 mt-3 border-t border-cine-800/60">
                  <Link
                    href={`/u/${friend.username || friend.id}`}
                    onClick={() => sounds.click()}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-gold-glow"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Ver Perfil Cinéfilo</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
