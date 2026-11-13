"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Gamepad2,
  Calendar,
  Bookmark,
  CheckCircle2,
  Edit3,
  Loader2,
  ArrowLeft,
  Clock,
  Star,
  Sparkles,
  Building,
  Tv,
  Play,
  Layers,
  ExternalLink,
  History,
} from "lucide-react";
import { GameDetail } from "@/types/game";
import GameKnowledgeBadge from "@/components/games/GameKnowledgeBadge";
import GameReviewModal from "@/components/games/GameReviewModal";
import GamePoster from "@/components/games/GamePoster";
import PlatformBadge from "@/components/games/PlatformBadge";
import { getRawgUrl } from "@/lib/externalLinks";
import MasterHubScoreBadge from "@/components/shared/MasterHubScoreBadge";
import CommunityReviewsSection from "@/components/shared/CommunityReviewsSection";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isUpdatingBacklog, setIsUpdatingBacklog] = useState(false);
  const [isUpdatingPlayedLongAgo, setIsUpdatingPlayedLongAgo] = useState(false);
  const toast = useToast();

  const fetchGame = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/games/${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data.game);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        });
      }
    }
  };

  useEffect(() => {
    if (gameId) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      fetchGame();
    }
  }, [gameId]);

  useEffect(() => {
    if (!isLoading && game) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [isLoading, game?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-sm text-cine-400 font-medium font-mono">
          Cargando base de datos gamer...
        </p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-4">
        <Gamepad2 className="w-12 h-12 text-cine-600" />
        <h2 className="text-xl font-bold text-white">
          Videojuego no encontrado
        </h2>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-cine-800 hover:bg-cine-700 text-sm rounded-xl transition-colors"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  const isBacklog = game.userGame?.status === "BACKLOG";
  const isFinished =
    game.userGame?.status === "COMPLETED" ||
    game.userGame?.status === "PLATINUM";

  const handleToggleBacklog = async () => {
    setIsUpdatingBacklog(true);
    try {
      if (isBacklog) {
        await fetch(`/api/user-games?gameId=${game.id}`, { method: "DELETE" });
        toast.toast({
          type: "info",
          title: "Eliminado del Backlog",
          description: "Juego retirado de tu lista",
        });
      } else {
        const res = await fetch("/api/user-games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawgId: game.rawgId,
            status: "BACKLOG",
          }),
        });
        if (res.status === 401) {
          toast.guestPrompt("guardar videojuegos en tu backlog");
          return;
        }
        if (res.ok) {
          sounds.playSuccess();
          toast.success(
            "Añadido al Backlog",
            "Guardado en tus juegos pendientes 📌",
          );
        }
      }
      await fetchGame();
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar tu backlog");
    } finally {
      setIsUpdatingBacklog(false);
    }
  };

  const handleMarkPlayedLongAgo = async () => {
    setIsUpdatingPlayedLongAgo(true);
    try {
      const res = await fetch("/api/user-games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawgId: game.rawgId,
          status: "COMPLETED",
          userRating: null,
          hoursPlayed: null,
          review: null,
          completedDate: null,
        }),
      });

      if (res.status === 401) {
        toast.guestPrompt("guardar videojuegos en tu catálogo");
        return;
      }

      if (res.ok) {
        sounds.playSuccess();
        toast.success(
          "¡Juego registrado!",
          "Marcado como completado en su día 🕹️ (+15 XP)",
        );
        await fetchGame();
      }
    } catch (err) {
      console.error("Error al registrar juego como jugado en su día:", err);
    } finally {
      setIsUpdatingPlayedLongAgo(false);
    }
  };

  const formatSpanishDate = (isoStr: string | null) => {
    if (!isoStr) return null;
    const date = new Date(isoStr);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const criticScore = game.metacritic
    ? (game.metacritic / 10).toFixed(1)
    : null;

  const rawgUrl = game ? getRawgUrl(game.slug, game.title, game.rawgId) : null;

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* Botón Volver */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-cine-400 hover:text-purple-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo gamer
      </button>

      {/* Hero Inmersivo con Imagen Panorámica */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-purple-500/30 shadow-2xl bg-cine-950">
        {game.backgroundImage && (
          <div className="absolute inset-0 z-0">
            <img
              src={game.backgroundImage}
              alt={game.title}
              className="w-full h-full object-cover object-center opacity-30 filter blur-[1px]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cine-950 via-cine-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-cine-950 via-cine-950/70 to-transparent" />
          </div>
        )}

        {/* Contenido del Hero */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row gap-5 sm:gap-6 items-stretch">
          {/* Portada Principal */}
          <div className="relative w-64 sm:w-80 md:w-[340px] lg:w-[360px] flex-shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30 bg-cine-900 aspect-[3/4] md:aspect-auto md:min-h-[480px]">
            <GamePoster
              src={game.backgroundImage}
              alt={game.title}
              className="w-full h-full object-cover md:absolute md:inset-0"
            />
          </div>

          {/* Datos y Ficha */}
          <div className="flex-1 flex flex-col justify-between min-h-[480px] gap-6">
            {/* 1. Categoría y Metacritic Arriba */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-sm font-semibold w-fit tracking-wide shadow-sm">
                <Gamepad2 className="w-4 h-4 text-purple-400" />
                <span>Videojuego</span>
              </div>
              {game.metacritic && (
                <a
                  href={rawgUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow inline-flex items-center gap-1.5 transition-colors group cursor-pointer"
                  title="Ver ficha en RAWG"
                >
                  <span>Metacritic {game.metacritic}</span>
                  <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                </a>
              )}
              {criticScore && (
                <span className="text-xs sm:text-sm text-cine-400 font-mono">
                  (Crítica:{" "}
                  <strong className="text-cyan-300">{criticScore}/10</strong>)
                </span>
              )}
            </div>

            {/* 2. Bloque Central: Título, Desarrollador, Metadatos, Plataformas y Géneros */}
            <div className="space-y-3.5">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                  {game.title}
                </h1>

                {game.developers && game.developers.length > 0 && (
                  <p className="text-xs sm:text-sm text-purple-300 mt-0.5 flex items-center gap-1.5 font-medium">
                    <Building className="w-4 h-4 text-purple-400" />
                    {game.developers.join(", ")}
                  </p>
                )}
              </div>

              {/* Metadatos Rápidos */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 text-xs sm:text-sm text-cine-200 font-medium">
                {game.released && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-cine-400" />
                    <span>{game.released}</span>
                  </div>
                )}

                {typeof game.userGame?.hoursPlayed === "number" &&
                  game.userGame.hoursPlayed > 0 && (
                    <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{game.userGame.hoursPlayed}h jugadas</span>
                    </div>
                  )}

                {/* Atlas Score Oficial */}
                <MasterHubScoreBadge
                  score={game.masterHubScore || null}
                  totalVotes={game.masterHubVotes || 0}
                  distribution={game.masterHubDistribution}
                  themeColor="purple"
                />
              </div>

              {/* Plataformas */}
              {game.platforms && game.platforms.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-cine-300 block">
                    Plataformas disponibles:
                  </span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {game.platforms.map((plat) => (
                      <span
                        key={plat}
                        className="px-3 py-1 rounded-lg text-xs font-mono font-medium bg-cine-900 border border-cine-700/80 text-cine-300 shadow-sm"
                      >
                        {plat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Géneros */}
              {game.genres && game.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {game.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/40 border border-purple-500/30 text-purple-300 shadow-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Botones de Acción Abajo */}
            <div className="w-full flex flex-wrap md:flex-nowrap items-center gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={handleToggleBacklog}
                disabled={isUpdatingBacklog}
                className={`flex-1 min-w-[160px] px-3.5 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  isBacklog
                    ? "bg-cyan-500 text-cine-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "glass-card border border-purple-500/30 text-cine-200 hover:text-white hover:bg-purple-950/40"
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${isBacklog ? "fill-cine-950" : "text-cyan-400"}`}
                />
                {isBacklog ? "En tu Backlog" : "+ Añadir a Backlog"}
              </button>

              <button
                onClick={() => setIsReviewOpen(true)}
                className={`flex-1 min-w-[155px] px-3.5 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  isFinished
                    ? "bg-emerald-500 text-cine-950 font-bold shadow"
                    : "bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {game.userGame && game.userGame.status !== "BACKLOG"
                  ? "Modificar veredicto"
                  : "Registrar partida"}
              </button>

              {!isFinished ? (
                <button
                  onClick={handleMarkPlayedLongAgo}
                  disabled={isUpdatingPlayedLongAgo}
                  className="flex-1 min-w-[150px] px-3.5 sm:px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap glass-card border border-cyan-500/30 text-cyan-200 hover:text-white hover:bg-cyan-950/40 active:scale-95 shadow"
                  title="Marcar como jugado en su día sin nota exacta ni horas (+15 XP)"
                >
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Jugado en su día</span>
                </button>
              ) : game.userGame?.completedDate === null ? (
                <div className="flex-1 min-w-[150px] px-3.5 sm:px-4 py-3 rounded-xl text-sm font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Jugado en el pasado</span>
                </div>
              ) : null}

              {rawgUrl && (
                <a
                  href={rawgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[140px] px-3.5 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-purple-500/60 text-white shadow-md hover:shadow-purple-500/20 group active:scale-95"
                  title="Abrir ficha oficial en RAWG"
                >
                  <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 leading-none tracking-tight">
                    RAWG
                  </span>
                  <span className="font-semibold text-sm">Ver en RAWG</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-purple-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sección: Tu Veredicto Gamer (Si está registrado y no es solo backlog) */}
      {game.userGame && game.userGame.status !== "BACKLOG" && (
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/30 via-cine-900 to-cine-950 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-cine-800 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Tu Veredicto Gamer
              </h2>
            </div>
            <button
              onClick={() => setIsReviewOpen(true)}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-cine-800/80 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Modificar datos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-2">
            {/* Mi Calificación */}
            <div className="space-y-1">
              <span className="text-xs text-cine-400 font-medium">
                Tu Puntuación
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-400 font-mono">
                  {game.userGame.userRating?.toFixed(1) ?? "—"}
                </span>
                <span className="text-sm text-cine-500 font-mono">
                  {game.userGame.userRating !== null &&
                  game.userGame.userRating !== undefined
                    ? "/ 10"
                    : "(Sin puntuar)"}
                </span>
                {criticScore && (
                  <span className="text-xs text-cine-400 ml-1">
                    (MC: <strong className="text-white">{criticScore}</strong>)
                  </span>
                )}
              </div>
              {game.userGame.difference !== null &&
                game.userGame.difference !== undefined && (
                  <div className="text-xs text-cine-400 font-mono">
                    Diferencia:{" "}
                    <strong
                      className={
                        Math.abs(game.userGame.difference) <= 0.3
                          ? "text-cyan-400"
                          : game.userGame.difference > 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                      }
                    >
                      {game.userGame.difference > 0
                        ? `+${game.userGame.difference}`
                        : game.userGame.difference}{" "}
                      pts
                    </strong>
                  </div>
                )}
            </div>

            {/* Game Knowledge */}
            <div className="space-y-2">
              <span className="text-xs text-cine-400 font-medium">
                Índice Game Knowledge
              </span>
              <div>
                <GameKnowledgeBadge
                  score={game.userGame.gameKnowledge}
                  difference={game.userGame.difference}
                  size="lg"
                />
              </div>
            </div>

            {/* Horas Jugadas y Plataformas */}
            <div className="space-y-1">
              <span className="text-xs text-cine-400 font-medium">
                Tiempo & Plataformas
              </span>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {game.userGame.hoursPlayed
                  ? `${game.userGame.hoursPlayed} h`
                  : "No registrado"}
              </div>
              <div className="pt-1">
                {game.userGame.platform ? (
                  <PlatformBadge platform={game.userGame.platform} size="sm" />
                ) : (
                  <span className="text-[11px] text-cine-500 italic">
                    Sin plataforma
                  </span>
                )}
              </div>
            </div>

            {/* Estado y Fecha */}
            <div className="space-y-1">
              <span className="text-xs text-cine-400 font-medium">
                Estado & Fecha
              </span>
              <div className="pt-1 flex flex-col gap-1">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 w-fit">
                  {game.userGame.status === "COMPLETED"
                    ? "🏆 Completado"
                    : game.userGame.status === "PLATINUM"
                      ? "👑 Platino"
                      : game.userGame.status === "PLAYING"
                        ? "🕹️ Jugando"
                        : game.userGame.status === "CONTINUOUS"
                          ? "♾️ Continuo / Sin fin"
                          : "💀 Abandonado"}
                </span>
                <span className="text-[11px] text-cine-400">
                  {game.userGame.status === "CONTINUOUS" ? (
                    <span className="text-sky-300/90 font-mono">
                      ♾️ Juego Continuo
                    </span>
                  ) : game.userGame.completedDate ? (
                    formatSpanishDate(game.userGame.completedDate)
                  ) : (
                    <span className="text-cyan-300/90 font-mono">
                      🕹️ Jugado en su día
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Desglose Multi-Plataforma si existe */}
          {(() => {
            const platformProgress: any[] = game.userGame?.platformDetails
              ? Array.isArray(game.userGame.platformDetails)
                ? game.userGame.platformDetails
                : (() => {
                    try {
                      return JSON.parse(
                        game.userGame.platformDetails as string,
                      );
                    } catch {
                      return [];
                    }
                  })()
              : [];

            if (!platformProgress || platformProgress.length === 0) return null;

            return (
              <div className="pt-4 border-t border-cine-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cine-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />{" "}
                    Desglose por Plataforma
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                    {game.userGame.hoursPlayed || 0} h totales dedicadas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {platformProgress.map((item) => (
                    <div
                      key={item.platform}
                      className="p-3.5 rounded-2xl bg-cine-950/80 border border-purple-500/20 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-white truncate">
                          {item.platform}
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          {item.hours} h
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-cine-800/60">
                        <span className="text-cine-500">Estado:</span>
                        <span className="font-semibold text-purple-300">
                          {item.status === "COMPLETED"
                            ? "🏆 Completado"
                            : item.status === "PLATINUM"
                              ? "👑 100% Platino"
                              : item.status === "PLAYING"
                                ? "🕹️ Jugando Ahora"
                                : item.status === "CONTINUOUS"
                                  ? "♾️ Continuo / Sin fin"
                                  : item.status === "BACKLOG"
                                    ? "📥 Backlog"
                                    : "💀 Abandonado"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Reseña Completa */}
          {game.userGame.review && (
            <div className="pt-4 border-t border-cine-800/80">
              <span className="text-xs text-cine-400 font-medium block mb-1">
                Tu Crítica
              </span>
              <blockquote className="p-4 rounded-xl bg-cine-950/70 border border-purple-500/20 text-cine-200 text-sm italic leading-relaxed">
                &quot;{game.userGame.review}&quot;
              </blockquote>
            </div>
          )}
        </section>
      )}

      {/* Trailer de Vídeo (Si existe) */}
      {game.trailerUrl && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Trailer Oficial
            </h2>
          </div>
          <div className="rounded-3xl overflow-hidden glass-panel border border-purple-500/30 aspect-video max-w-4xl bg-black">
            <video
              src={game.trailerUrl}
              controls
              poster={game.backgroundImage || undefined}
              className="w-full h-full object-contain"
            />
          </div>
        </section>
      )}

      {/* Galería de Capturas (Screenshots) */}
      {game.screenshots && game.screenshots.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Galería de Capturas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {game.screenshots.slice(0, 6).map((imgUrl, idx) => (
              <div
                key={idx}
                className="aspect-video rounded-2xl overflow-hidden border border-white/10 glass-card group relative"
              >
                <img
                  src={imgUrl}
                  alt={`${game.title} screenshot ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sinopsis / Descripción */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-wide border-b border-cine-800 pb-2">
          Sinopsis
        </h2>
        <div className="text-cine-300 text-sm sm:text-base leading-relaxed whitespace-pre-line max-w-4xl">
          {game.description ||
            "Sin descripción disponible para este videojuego."}
        </div>
      </section>

      {/* Muro de Reseñas de la Comunidad */}
      <CommunityReviewsSection
        reviews={game.communityReviews || []}
        title={game.title}
        themeColor="purple"
        onOpenReviewModal={() => setIsReviewOpen(true)}
      />

      {/* Modal de Registro Gamer */}
      <GameReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSaved={fetchGame}
        game={{
          rawgId: game.rawgId,
          title: game.title,
          released: game.released,
          backgroundImage: game.backgroundImage,
          metacritic: game.metacritic,
          platforms: game.platforms,
        }}
        initialStatus={
          game.userGame?.status && game.userGame.status !== "BACKLOG"
            ? game.userGame.status
            : "COMPLETED"
        }
        initialRating={game.userGame?.userRating}
        initialHours={game.userGame?.hoursPlayed}
        initialPlatform={game.userGame?.platform}
        initialPlatformDetails={game.userGame?.platformDetails}
        initialReview={game.userGame?.review}
      />
    </div>
  );
}
