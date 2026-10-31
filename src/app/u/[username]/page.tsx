"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Film,
  Gamepad2,
  Share2,
  Calendar,
  Star,
  Trophy,
  Loader2,
  AlertCircle,
  TrendingUp,
  Brain,
  Award,
  ArrowRight,
  Camera,
  Edit2,
  Check,
  Clock,
  Layers,
  Tv,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import CinephileLevelBar from "@/components/CinephileLevelBar";
import BallKnowledgeBadge from "@/components/BallKnowledgeBadge";
import RatingDistributionChart from "@/components/charts/RatingDistributionChart";
import GenreChart from "@/components/charts/GenreChart";
import WatchesTimelineChart from "@/components/charts/WatchesTimelineChart";
import GamerLevelBar from "@/components/games/GamerLevelBar";
import CriticVsYouChart from "@/components/games/CriticVsYouChart";
import HotTakesTable from "@/components/games/HotTakesTable";
import TopFiveCard, { TopFiveItem } from "@/components/profile/TopFiveCard";
import WatchedCatalogSection, {
  WatchedCatalogItem,
} from "@/components/profile/WatchedCatalogSection";
import WatchlistSection from "@/components/profile/WatchlistSection";
import AffinityCard from "@/components/profile/AffinityCard";
import SocialWrappedModal from "@/components/profile/SocialWrappedModal";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface PublicUnifiedProfileData {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    bio: string | null;
    totalXp?: number;
    createdAt: string;
  };
  isOwner: boolean;
  cinema: {
    totalWatched: number;
    totalWatchlist: number;
    isWatchlistPublic?: boolean;
    watchlistCatalog?: WatchedCatalogItem[];
    totalMovies?: number;
    totalSeries?: number;
    totalReviews?: number;
    averageRating: number | null;
    globalBallKnowledge: number | null;
    totalXp?: number;
    level: number;
    rankTitle: string;
    rankIcon: string;
    topGenre?: string | null;
    highestRatedMovie?: any;
    lowestRatedMovie?: any;
    topCine?: any[];
    topMovies?: any[];
    watchedCatalog?: WatchedCatalogItem[];
    recentMovies: any[];
    recentSeries?: any[];
    biggestW?: any;
    biggestL?: any;
    ratingDistribution?: any[];
    genreCounts?: any[];
    watchesByMonth?: any[];
  };
  gaming: {
    totalCompleted: number;
    totalBacklog: number;
    isBacklogPublic?: boolean;
    backlogCatalog?: WatchedCatalogItem[];
    totalHours: number;
    totalPlatinum?: number;
    averageRating: number | null;
    averageMetacritic?: number | null;
    globalGameKnowledge: number | null;
    totalXp?: number;
    level: number;
    rankTitle: string;
    rankIcon: string;
    topGenre?: string | null;
    topPlatform?: string | null;
    topGames: any[];
    gamesCatalog?: WatchedCatalogItem[];
    recentGames: any[];
    longestGame?: { title: string; cover: string | null; hours: number } | null;
    highestRatedGame?: {
      title: string;
      cover: string | null;
      rating: number;
    } | null;
    lowestRatedGame?: {
      title: string;
      cover: string | null;
      rating: number;
    } | null;
    averageCompletionHours?: number | null;
    statusBreakdown?: {
      completed: number;
      playing: number;
      continuous?: number;
      backlog: number;
      platinum: number;
      abandoned: number;
    };
    ratingDistribution?: { rating: number; count: number }[];
    hoursByPlatform?: any[];
    hoursByGenre?: any[];
    criticVsYou?: any[];
    hotTakes?: any[];
  };
  affinity: any;
}

function PublicProfileContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const username = params?.username as string;
  const toast = useToast();

  const tabParam = searchParams?.get("tab");
  const [activeUniverse, setActiveUniverse] = useState<"cinema" | "gaming">(
    tabParam === "gaming" ? "gaming" : "cinema",
  );

  const [data, setData] = useState<PublicUnifiedProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  // Sincronizar parámetro de búsqueda con el estado
  useEffect(() => {
    if (tabParam === "gaming" || tabParam === "cinema") {
      setActiveUniverse(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!username) return;

    const fetchPublicProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/u/${encodeURIComponent(username)}`);
        if (res.status === 404) {
          setError("El usuario que buscas no existe en Atlas.");
          return;
        }
        if (!res.ok) {
          throw new Error("No se pudo cargar el perfil.");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Error de conexión.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicProfile();
  }, [username]);

  const handleUniverseChange = (newUniverse: "cinema" | "gaming") => {
    sounds.switch();
    setActiveUniverse(newUniverse);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newUniverse);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleShare = async () => {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const targetUser = encodeURIComponent(
        data?.user?.username || data?.user?.id || username,
      );
      const url = `${origin}/u/${targetUser}?tab=${activeUniverse}`;

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      sounds.playSuccess();
      setCopied(true);
      toast.success(
        activeUniverse === "cinema"
          ? "¡Enlace de perfil cinéfilo copiado!"
          : "¡Enlace de perfil gamer copiado!",
        "Compártelo con tus amigos para que exploren tu vitrina.",
      );
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("No se pudo copiar el enlace automáticamente.");
    }
  };

  const handleToggleWatchlistPrivacy = async (newVal: boolean) => {
    if (!data) return;
    setData({
      ...data,
      cinema: {
        ...data.cinema,
        isWatchlistPublic: newVal,
      },
    });

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWatchlistPublic: newVal }),
      });
      if (!res.ok) throw new Error("Error al guardar preferencia");
      toast.success(
        newVal ? "Watchlist ahora es pública" : "Watchlist ahora es privada",
        newVal
          ? "Tus amigos y visitantes pueden ver los títulos que tienes pendientes."
          : "Solo tú puedes ver tus títulos pendientes.",
      );
    } catch {
      toast.error("No se pudo actualizar la privacidad de tu watchlist.");
      setData((prev) =>
        prev
          ? {
              ...prev,
              cinema: { ...prev.cinema, isWatchlistPublic: !newVal },
            }
          : prev,
      );
    }
  };

  const handleToggleBacklogPrivacy = async (newVal: boolean) => {
    if (!data) return;
    setData({
      ...data,
      gaming: {
        ...data.gaming,
        isBacklogPublic: newVal,
      },
    });

    try {
      const res = await fetch("/api/games/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBacklogPublic: newVal }),
      });
      if (!res.ok) throw new Error("Error al guardar preferencia");
      toast.success(
        newVal ? "Backlog ahora es público" : "Backlog ahora es privado",
        newVal
          ? "Tus amigos y visitantes pueden ver los juegos que tienes en backlog."
          : "Solo tú puedes ver tu backlog.",
      );
    } catch {
      toast.error("No se pudo actualizar la privacidad de tu backlog.");
      setData((prev) =>
        prev
          ? {
              ...prev,
              gaming: { ...prev.gaming, isBacklogPublic: !newVal },
            }
          : prev,
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="text-xs text-cine-400 font-mono">
          Cargando perfil público de @{username}...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 gap-4">
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-400">
          <AlertCircle className="w-10 h-10 mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-white">Usuario no encontrado</h2>
        <p className="text-xs text-cine-400 max-w-sm">
          {error || "El perfil solicitado no existe o no está disponible."}
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 bg-cine-800 hover:bg-cine-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  const { user, isOwner, cinema, gaming, affinity } = data;

  // Formatear Top 5 Cinéfilo
  const topFiveCine: TopFiveItem[] = (
    cinema.topCine ||
    cinema.topMovies ||
    []
  ).map((m: any) => ({
    id: m.id,
    title: m.title || m.movie?.title || m.series?.name,
    image:
      m.image ?? m.posterPath ?? m.movie?.posterPath ?? m.series?.posterPath,
    year: m.year ?? m.movie?.year ?? m.series?.firstAirYear,
    rating: m.rating ?? m.userRating,
    isFavorite: m.isFavorite,
    link:
      m.link ||
      (m.movie
        ? `/movie/${m.movie.tmdbId}`
        : m.series
          ? `/series/${m.series.tmdbId}`
          : "#"),
    mediaType: m.mediaType || (m.series ? "series" : "movie"),
  }));

  // Formatear Top 5 Gaming
  const topFiveGames: TopFiveItem[] = (gaming.topGames || []).map((g: any) => ({
    id: g.id,
    title: g.title || g.game?.title,
    image: g.image ?? g.posterPath ?? g.game?.backgroundImage,
    year: g.year ?? (g.game?.released ? g.game.released.split("-")[0] : null),
    rating: g.rating ?? g.userRating,
    isFavorite: g.isFavorite,
    link: g.link || (g.game ? `/games/${g.game.rawgId}` : "#"),
    mediaType: "game" as const,
  }));

  const memberYear = user.createdAt
    ? new Date(user.createdAt).getFullYear()
    : 2026;

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* 0. Selector Slider de Universo (Cinephile Hub vs Gamer Hub) */}
      <div className="flex flex-col items-center justify-center gap-2 pt-1">
        <div className="inline-flex p-1.5 rounded-2xl bg-cine-900/90 border border-cine-800/80 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => handleUniverseChange("cinema")}
            className={`relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-300 cursor-pointer ${
              activeUniverse === "cinema"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-cine-950 shadow-gold-glow scale-[1.02]"
                : "text-cine-400 hover:text-white hover:bg-cine-800/60"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Cinephile Hub</span>
            {cinema.totalWatched > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeUniverse === "cinema"
                    ? "bg-cine-950/25 text-cine-950"
                    : "bg-cine-800 text-amber-400"
                }`}
              >
                {cinema.totalWatched}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleUniverseChange("gaming")}
            className={`relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-300 cursor-pointer ${
              activeUniverse === "gaming"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02]"
                : "text-cine-400 hover:text-white hover:bg-cine-800/60"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Gamer Hub</span>
            {gaming.totalCompleted > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeUniverse === "gaming"
                    ? "bg-white/25 text-white"
                    : "bg-cine-800 text-purple-400"
                }`}
              >
                {gaming.totalCompleted}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Cabecera Principal Dinámica según Universo Activo */}
      {activeUniverse === "cinema" ? (
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-cine-900 to-cine-950 shadow-2xl relative overflow-hidden transition-all duration-300">
          {/* Glow de fondo dorado */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-amber-500/10" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 flex-1 min-w-0">
              {/* Avatar */}
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 lg:w-[166px] lg:h-[166px] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-gold-glow shrink-0 bg-cine-900 flex items-center justify-center">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || user.username || "Usuario"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-white text-3xl bg-gradient-to-br from-amber-600 to-yellow-800">
                    {(user.name || user.username || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Datos de Identidad */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {user.name || user.username}
                  </h1>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-lg border text-amber-300 bg-amber-950/60 border-amber-500/30">
                    @{user.username || "user"}
                  </span>
                  {isOwner && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                      Tú
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-cine-300 max-w-xl leading-relaxed">
                  {user.bio ||
                    "Explorador y analista del catálogo universal de cine y series en Atlas."}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-cine-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cine-500" />
                    Miembro desde {memberYear}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-medium">
                    {cinema.totalWatched} películas/series vistas
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-row sm:flex-col gap-2.5 shrink-0 self-start sm:self-center sm:ml-auto">
                {isOwner && (
                  <Link
                    href="/profile"
                    className="justify-center px-3.5 py-1.5 bg-cine-800/80 hover:bg-amber-500/20 text-cine-200 hover:text-white border border-cine-700 hover:border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Editar perfil cinéfilo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Perfil</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border-amber-500/40"
                  title="Copiar enlace a este perfil cinéfilo"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir Perfil</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.shutter();
                    setIsWrappedOpen(true);
                  }}
                  className="justify-center px-3.5 py-1.5 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-cine-950 shadow-gold-glow"
                  title="Generar tarjeta de resumen para redes sociales"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cinephile Hub Wrapped</span>
                </button>
              </div>
            </div>

            {/* Barra de Nivel Cinéfilo en Cabecera */}
            <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0">
              <CinephileLevelBar
                totalXp={cinema.totalXp ?? user.totalXp ?? 0}
                variant="cinema"
                className="h-full lg:h-[166px]"
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-cine-900 to-cine-950 shadow-2xl relative overflow-hidden transition-all duration-300">
          {/* Glow de fondo morado */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-purple-600/10" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 flex-1 min-w-0">
              {/* Avatar */}
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 lg:w-[166px] lg:h-[166px] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.3)] shrink-0 bg-cine-900 flex items-center justify-center">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || user.username || "Usuario"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-white text-3xl bg-gradient-to-br from-purple-700 to-indigo-900">
                    {(user.name || user.username || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Datos de Identidad */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {user.name || user.username}
                  </h1>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-lg border text-purple-300 bg-purple-950/60 border-purple-500/30">
                    @{user.username || "user"}
                  </span>
                  {isOwner && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                      Tú
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-cine-300 max-w-xl leading-relaxed">
                  {user.bio ||
                    "Explorador de mundos interactivos y coleccionista de aventuras gamer en Atlas."}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-cine-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cine-500" />
                    Miembro desde {memberYear}
                  </span>
                  <span>•</span>
                  <span className="text-purple-400 font-medium">
                    {gaming.totalCompleted} juegos completados
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-row sm:flex-col gap-2.5 shrink-0 self-start sm:self-center sm:ml-auto">
                {isOwner && (
                  <Link
                    href="/games/profile"
                    className="justify-center px-3.5 py-1.5 bg-cine-800/80 hover:bg-purple-500/20 text-cine-200 hover:text-white border border-cine-700 hover:border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Editar perfil gamer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Perfil</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border-purple-500/40"
                  title="Copiar enlace a este perfil gamer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir Perfil</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.shutter();
                    setIsWrappedOpen(true);
                  }}
                  className="justify-center px-3.5 py-1.5 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  title="Generar tarjeta de resumen para redes sociales"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Gamer Hub Wrapped</span>
                </button>
              </div>
            </div>

            {/* Barra de Nivel Gamer en Cabecera */}
            <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0">
              <GamerLevelBar
                totalXp={gaming.totalXp ?? user.totalXp ?? 0}
                className="h-full lg:h-[166px]"
              />
            </div>
          </div>
        </section>
      )}

      {/* 2. Comparador de Afinidad (Si es otro usuario visitando) */}
      <AffinityCard
        affinity={affinity}
        targetUsername={user.username || "usuario"}
      />

      {/* 3. Contenido Principal según el Universo Activo */}
      {activeUniverse === "cinema" ? (
        <div className="space-y-10 animate-fade-in">
          {/* Highlights Rápidos de Cine */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Películas Vistas */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Film className="w-4 h-4 text-amber-400" /> Películas Vistas
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {cinema.totalWatched}
                <span className="text-xs font-normal text-cine-400">
                  {" "}
                  títulos
                </span>
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                {cinema.totalReviews ?? 0} reseñas escritas
              </div>
            </div>

            {/* En Watchlist */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Trophy className="w-4 h-4 text-amber-400" /> En Watchlist
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {cinema.totalWatchlist}
                <span className="text-xs font-normal text-cine-400">
                  {" "}
                  pendientes
                </span>
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                Por ver en streaming / cine
              </div>
            </div>

            {/* Global Sofa Knowledge */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Brain className="w-4 h-4 text-amber-400" /> Sofa Knowledge
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono">
                {cinema.globalBallKnowledge !== null
                  ? `${cinema.globalBallKnowledge}%`
                  : "—"}
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                Frente al consenso de IMDb
              </div>
            </div>

            {/* Tu Nota Media */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Tu
                Nota Media
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {cinema.averageRating || "—"}
                <span className="text-xs font-normal text-cine-400"> / 10</span>
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                Género top:{" "}
                <strong className="text-amber-400">
                  {cinema.topGenre || "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* Vitrina de Top 5 Cinéfilo (Películas & Series) */}
          <section>
            <TopFiveCard
              type="cinema"
              title="Top 5 Cinéfilo"
              items={topFiveCine}
            />
          </section>

          {/* Catálogo Completo de Películas y Series Vistas */}
          <WatchedCatalogSection
            type="cinema"
            items={cinema.watchedCatalog || []}
            isOwner={isOwner}
          />

          {/* Watchlist de Cine & Series */}
          <WatchlistSection
            type="cinema"
            items={cinema.watchlistCatalog || []}
            isOwner={isOwner}
            isPublic={cinema.isWatchlistPublic !== false}
            username={user.username || user.name}
            onTogglePrivacy={handleToggleWatchlistPrivacy}
          />

          {/* Rankings Personales: Biggest W vs Biggest L */}
          {(cinema.biggestW || cinema.biggestL) && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Rankings de Precisión (W & L)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cinema.biggestW && (
                  <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-cine-900 to-emerald-950/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👑</span>
                        <h3 className="font-bold text-white text-base">
                          BIGGEST W
                        </h3>
                      </div>
                      <BallKnowledgeBadge
                        score={cinema.biggestW.ballKnowledge}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      {cinema.biggestW.posterPath && (
                        <img
                          src={cinema.biggestW.posterPath}
                          alt={cinema.biggestW.title}
                          className="w-16 h-24 object-cover rounded-xl shadow border border-white/10"
                        />
                      )}
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-base">
                          {cinema.biggestW.title}
                        </h4>
                        <p className="text-xs text-cine-300">
                          {Math.abs(cinema.biggestW.diff || 0) < 0.05
                            ? "Coincidencia idéntica con el consenso de IMDb."
                            : "Coincidencia casi idéntica con el consenso de IMDb."}
                        </p>
                        <div className="flex items-center gap-3 text-xs font-mono pt-1">
                          <span className="text-amber-400 font-bold">
                            Tú: {cinema.biggestW.userRating?.toFixed(1)}
                          </span>
                          <span className="text-cine-500">vs</span>
                          <span className="text-cine-300">
                            IMDb: {cinema.biggestW.imdbRating?.toFixed(1)}
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            (Diff:{" "}
                            {cinema.biggestW.diff > 0
                              ? `+${cinema.biggestW.diff}`
                              : cinema.biggestW.diff}
                            )
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {cinema.biggestL && (
                  <div className="glass-panel p-5 rounded-3xl border border-red-500/30 bg-gradient-to-br from-cine-900 to-red-950/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🤡</span>
                        <h3 className="font-bold text-white text-base">
                          BIGGEST L
                        </h3>
                      </div>
                      <BallKnowledgeBadge
                        score={cinema.biggestL.ballKnowledge}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      {cinema.biggestL.posterPath && (
                        <img
                          src={cinema.biggestL.posterPath}
                          alt={cinema.biggestL.title}
                          className="w-16 h-24 object-cover rounded-xl shadow border border-white/10"
                        />
                      )}
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-base">
                          {cinema.biggestL.title}
                        </h4>
                        <p className="text-xs text-cine-300">
                          Tu mayor discrepancia respecto a la nota comunitaria
                          de IMDb.
                        </p>
                        <div className="flex items-center gap-3 text-xs font-mono pt-1">
                          <span className="text-amber-400 font-bold">
                            Tú: {cinema.biggestL.userRating?.toFixed(1)}
                          </span>
                          <span className="text-cine-500">vs</span>
                          <span className="text-cine-300">
                            IMDb: {cinema.biggestL.imdbRating?.toFixed(1)}
                          </span>
                          <span className="text-red-400 font-semibold">
                            (Diff:{" "}
                            {cinema.biggestL.diff > 0
                              ? `+${cinema.biggestL.diff}`
                              : cinema.biggestL.diff}
                            )
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Analítica Cinematográfica */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Analítica Cinematográfica
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribución de Notas */}
              {cinema.ratingDistribution && (
                <div className="glass-panel p-5 rounded-3xl border border-cine-800 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Distribución de valoraciones</span>
                    <span className="text-xs text-cine-400 font-normal">
                      0 a 10 Estrellas
                    </span>
                  </h3>
                  <RatingDistributionChart data={cinema.ratingDistribution} />
                </div>
              )}

              {/* Géneros Más Vistos */}
              {cinema.genreCounts && (
                <div className="glass-panel p-5 rounded-3xl border border-cine-800 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Géneros más frecuentes</span>
                    <span className="text-xs text-cine-400 font-normal">
                      Volumen & Nota media
                    </span>
                  </h3>
                  <GenreChart data={cinema.genreCounts} />
                </div>
              )}

              {/* Línea Temporal de Visionados */}
              {cinema.watchesByMonth && (
                <div className="glass-panel p-5 rounded-3xl border border-cine-800 space-y-3 lg:col-span-2">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Evolución de visionados mensuales</span>
                    <span className="text-xs text-cine-400 font-normal">
                      Ritmo cinematográfico
                    </span>
                  </h3>
                  <WatchesTimelineChart data={cinema.watchesByMonth} />
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-10 animate-fade-in">
          {/* Highlights Rápidos de Gaming */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Horas Jugadas */}
            <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Clock className="w-4 h-4 text-purple-400" /> Horas Jugadas
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {gaming.totalHours}
                <span className="text-xs font-normal text-cine-400"> hrs</span>
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                Tiempo invertido registrado
              </div>
            </div>

            {/* Títulos Terminados */}
            <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Trophy className="w-4 h-4 text-amber-400" /> Títulos Terminados
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {gaming.totalCompleted}
                <span className="text-xs font-normal text-cine-400">
                  {" "}
                  juegos
                </span>
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                {gaming.totalPlatinum ?? 0} trofeos Platino / 100%
              </div>
            </div>

            {/* Global Game Knowledge */}
            <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Brain className="w-4 h-4 text-purple-400" /> Game Knowledge
              </div>
              <div className="text-3xl font-black text-purple-400 font-mono">
                {gaming.globalGameKnowledge
                  ? `${gaming.globalGameKnowledge}%`
                  : "—"}
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                Frente al consenso de Metacritic
              </div>
            </div>

            {/* Nota Media vs Prensa */}
            <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
                <Star className="w-4 h-4 text-purple-400 fill-purple-400" /> Tu
                Nota Media
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {gaming.averageRating || "—"}
                <span className="text-xs font-normal text-cine-400"> / 10</span>
              </div>
              <div className="text-[11px] text-cine-500 mt-1">
                Prensa:{" "}
                <strong className="text-cyan-400">
                  {gaming.averageMetacritic || "—"}
                </strong>{" "}
                / 10
              </div>
            </div>
          </section>

          {/* Vitrina de Top 5 Videojuegos */}
          <section>
            <TopFiveCard
              type="gaming"
              title="Top 5 Videojuegos"
              items={topFiveGames}
            />
          </section>

          {/* Catálogo Completo de Videojuegos */}
          <WatchedCatalogSection
            type="gaming"
            items={gaming.gamesCatalog || []}
            isOwner={isOwner}
          />

          {/* Backlog de Videojuegos */}
          <WatchlistSection
            type="gaming"
            items={gaming.backlogCatalog || []}
            isOwner={isOwner}
            isPublic={gaming.isBacklogPublic !== false}
            username={user.username || user.name}
            onTogglePrivacy={handleToggleBacklogPrivacy}
          />

          {/* Récords y Métricas Extremas */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Récord: Partida Legendaria */}
            <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 bg-cine-950 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Partida Legendaria (Más Horas)</span>
              </div>

              {gaming.longestGame ? (
                <div className="flex-1 flex items-center p-3 rounded-2xl bg-cine-900/60 border border-purple-500/20">
                  <div className="flex items-center gap-3.5 w-full">
                    {gaming.longestGame.cover && (
                      <img
                        src={gaming.longestGame.cover}
                        alt={gaming.longestGame.title}
                        className="w-16 h-16 rounded-xl object-cover border border-purple-500/30 shadow-md shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {gaming.longestGame.title}
                      </p>
                      <p className="text-xl font-black text-purple-400 font-mono mt-0.5">
                        {gaming.longestGame.hours}{" "}
                        <span className="text-xs text-cine-400 font-normal">
                          horas jugadas
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-3 rounded-2xl bg-cine-900/40 border border-cine-800">
                  <p className="text-xs text-cine-500 italic text-center">
                    Sin registros de tiempo prolongado todavía.
                  </p>
                </div>
              )}
            </div>

            {/* Récord: Obra Maestra */}
            <div className="glass-panel p-5 rounded-3xl border border-amber-500/20 bg-cine-950 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Obra Maestra Personal</span>
              </div>

              {gaming.highestRatedGame ? (
                <div className="flex-1 flex items-center p-3 rounded-2xl bg-cine-900/60 border border-amber-500/20">
                  <div className="flex items-center gap-3.5 w-full">
                    {gaming.highestRatedGame.cover && (
                      <img
                        src={gaming.highestRatedGame.cover}
                        alt={gaming.highestRatedGame.title}
                        className="w-16 h-16 rounded-xl object-cover border border-amber-500/30 shadow-md shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {gaming.highestRatedGame.title}
                      </p>
                      <p className="text-xl font-black text-amber-400 font-mono mt-0.5">
                        ★ {gaming.highestRatedGame.rating}{" "}
                        <span className="text-xs text-cine-400 font-normal">
                          / 10
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-3 rounded-2xl bg-cine-900/40 border border-cine-800">
                  <p className="text-xs text-cine-500 italic text-center">
                    Sin videojuegos puntuados como obra maestra.
                  </p>
                </div>
              )}
            </div>

            {/* Estado del Catálogo */}
            <div className="glass-panel p-5 rounded-3xl border border-cyan-500/20 bg-cine-950 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Ritmo y Biblioteca</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
                  <span className="text-cine-400 block text-[10px]">
                    Jugando
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {gaming.statusBreakdown?.playing ?? 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
                  <span className="text-cine-400 block text-[10px]">
                    Continuos
                  </span>
                  <span className="text-base font-black text-sky-400 font-mono">
                    {gaming.statusBreakdown?.continuous ?? 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
                  <span className="text-cine-400 block text-[10px]">
                    Completados
                  </span>
                  <span className="text-base font-black text-purple-400 font-mono">
                    {gaming.statusBreakdown?.completed ??
                      gaming.totalCompleted ??
                      0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
                  <span className="text-cine-400 block text-[10px]">
                    Pendientes
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {gaming.statusBreakdown?.backlog ?? gaming.totalBacklog}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
                  <span className="text-cine-400 block text-[10px]">
                    Platinados
                  </span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {gaming.statusBreakdown?.platinum ??
                      gaming.totalPlatinum ??
                      0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
                  <span className="text-cine-400 block text-[10px]">
                    Media / Título
                  </span>
                  <span className="text-base font-black text-cyan-300 font-mono">
                    {gaming.averageCompletionHours
                      ? `${gaming.averageCompletionHours}h`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Distribución de Puntuaciones (1 al 10) */}
          {gaming.ratingDistribution &&
            gaming.ratingDistribution.some((d) => d.count > 0) && (
              <section className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-cine-950 space-y-4">
                <div className="flex items-center justify-between border-b border-cine-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-400" />
                    <h3 className="text-base font-bold text-white">
                      Distribución de Puntuaciones
                    </h3>
                  </div>
                  <span className="text-xs text-cine-400 font-mono">
                    Escala 1 a 10
                  </span>
                </div>

                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={gaming.ratingDistribution}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#232635"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="rating"
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `★ ${v}`}
                      />
                      <YAxis
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090A10",
                          borderColor: "#8B5CF6",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val: any) => [
                          `${val} juego(s)`,
                          "Cantidad",
                        ]}
                        labelFormatter={(lbl) => `Nota ★ ${lbl}`}
                      />
                      <Bar
                        dataKey="count"
                        fill="#8B5CF6"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

          {/* Critic vs You: Gráfica Comparativa con Metacritic */}
          {gaming.criticVsYou && gaming.criticVsYou.length > 0 && (
            <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-cine-950 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cine-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    <h2 className="text-lg font-bold text-white">
                      Critic vs You (Metacritic vs Veredicto)
                    </h2>
                  </div>
                  <p className="text-xs text-cine-400 mt-0.5">
                    Comparativa directa entre el criterio del usuario y la media
                    de analistas de Metacritic.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-cine-500">
                  {gaming.criticVsYou.length} títulos contrastados
                </span>
              </div>

              <CriticVsYouChart data={gaming.criticVsYou} />
            </section>
          )}

          {/* Tabla de Hot Takes 🔥 */}
          {gaming.hotTakes && gaming.hotTakes.length > 0 && (
            <section className="space-y-4">
              <HotTakesTable hotTakes={gaming.hotTakes} />
            </section>
          )}

          {/* Horas por Plataforma y Horas por Género */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Horas por Plataforma */}
            {gaming.hoursByPlatform && (
              <section className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-cine-950 space-y-4">
                <div className="flex items-center gap-2 border-b border-cine-800 pb-3">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">
                    Horas por Plataforma
                  </h3>
                </div>

                {gaming.hoursByPlatform.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-cine-500 italic">
                    Sin registros de plataformas todavía.
                  </div>
                ) : (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={gaming.hoursByPlatform}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#232635"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke="#71717A"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          dataKey="platform"
                          type="category"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          width={115}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#090A10",
                            borderColor: "#8B5CF6",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                          formatter={(val: any, name: any, item: any) => {
                            const count = item?.payload?.gameCount;
                            const countStr = count
                              ? ` (${count} juego${count > 1 ? "s" : ""})`
                              : "";
                            const pct = item?.payload?.percentage
                              ? ` · ${item.payload.percentage}%`
                              : "";
                            return [`${val} hrs${countStr}${pct}`, "Tiempo"];
                          }}
                        />
                        <Bar
                          dataKey="hours"
                          fill="#38BDF8"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            )}

            {/* Horas por Género */}
            {gaming.hoursByGenre && (
              <section className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-cine-950 space-y-4">
                <div className="flex items-center gap-2 border-b border-cine-800 pb-3">
                  <Gamepad2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-base font-bold text-white">
                    Horas por Género
                  </h3>
                </div>

                {gaming.hoursByGenre.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-cine-500 italic">
                    Sin registros de géneros todavía.
                  </div>
                ) : (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={gaming.hoursByGenre.slice(0, 7)}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#232635"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke="#71717A"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          dataKey="genre"
                          type="category"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          width={115}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#090A10",
                            borderColor: "#8B5CF6",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                          formatter={(val: any) => [`${val} horas`, "Tiempo"]}
                        />
                        <Bar
                          dataKey="hours"
                          fill="#8B5CF6"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* Modal de Social Wrapped Dinámico */}
      <SocialWrappedModal
        isOpen={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        universe={activeUniverse === "cinema" ? "CINE" : "GAMING"}
        user={{
          displayName: user.name || user.username || "Usuario",
          username: user.username,
          avatarUrl: user.image,
        }}
        stats={
          activeUniverse === "cinema"
            ? {
                totalMovies: cinema.totalMovies ?? cinema.totalWatched,
                totalSeries: cinema.totalSeries ?? 0,
                totalHours: 0,
                totalCompletedGames: 0,
                averageRating: cinema.averageRating,
                ballKnowledge: cinema.globalBallKnowledge,
                gameKnowledge: null,
              }
            : {
                totalMovies: 0,
                totalSeries: 0,
                totalHours: gaming.totalHours,
                totalCompletedGames: gaming.totalCompleted,
                totalPlatinum: gaming.totalPlatinum,
                averageRating: gaming.averageRating,
                ballKnowledge: null,
                gameKnowledge: gaming.globalGameKnowledge,
              }
        }
        topItems={
          activeUniverse === "cinema"
            ? topFiveCine.slice(0, 3)
            : topFiveGames.slice(0, 3)
        }
      />
    </div>
  );
}

export default function PublicProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs text-cine-400 font-mono">
            Cargando perfil público...
          </span>
        </div>
      }
    >
      <PublicProfileContent />
    </Suspense>
  );
}
