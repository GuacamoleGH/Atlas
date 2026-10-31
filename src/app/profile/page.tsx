"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LogIn,
  User,
  Film,
  Star,
  Sparkles,
  Trophy,
  Loader2,
  RefreshCw,
  Trash2,
  Edit2,
  Check,
  X,
  TrendingUp,
  Brain,
  Award,
  ArrowRight,
  Share2,
} from "lucide-react";
import { ProfileStats } from "@/types/movie";
import CinephileLevelBar from "@/components/CinephileLevelBar";
import BallKnowledgeBadge from "@/components/BallKnowledgeBadge";
import RatingDistributionChart from "@/components/charts/RatingDistributionChart";
import GenreChart from "@/components/charts/GenreChart";
import WatchesTimelineChart from "@/components/charts/WatchesTimelineChart";
import AvatarPickerModal from "@/components/shared/AvatarPickerModal";
import EditCinephileProfileModal from "@/components/movies/EditCinephileProfileModal";
import SocialWrappedModal from "@/components/profile/SocialWrappedModal";
import TopFiveCard, { TopFiveItem } from "@/components/profile/TopFiveCard";
import WatchedCatalogSection, {
  WatchedCatalogItem,
} from "@/components/profile/WatchedCatalogSection";
import WatchlistSection from "@/components/profile/WatchlistSection";
import { WipeoutDangerZone } from "@/components/profile/WipeoutDangerZone";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";
import { Camera } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [profileData, setProfileData] = useState<{
    displayName: string;
    username?: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isWatchlistPublic?: boolean;
  }>({
    displayName: "Invitado",
    username: null,
    avatarUrl: null,
    bio: "",
    isWatchlistPublic: true,
  });

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [topCine, setTopCine] = useState<TopFiveItem[]>([]);
  const [watchedCatalog, setWatchedCatalog] = useState<WatchedCatalogItem[]>(
    [],
  );
  const [watchlistCatalog, setWatchlistCatalog] = useState<
    WatchedCatalogItem[]
  >([]);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  // Modal de edición de perfil cinéfilo
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const handleOpenEdit = () => {
    sounds.click();
    if (!session?.user) {
      router.push("/login?callbackUrl=/profile");
      return;
    }
    setIsEditProfileOpen(true);
  };

  // Acciones de administración (wipe / seed)
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleShare = async () => {
    try {
      const targetUser =
        profileData.username || session?.user?.username || session?.user?.name;
      if (!targetUser) {
        toast.error("Inicia sesión para compartir tu perfil.");
        return;
      }
      const shareUrl = `${window.location.origin}/u/${encodeURIComponent(targetUser)}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      sounds.playSuccess();
      setCopied(true);
      toast.success(
        "¡Enlace de perfil copiado!",
        "Compártelo con tus amigos para que visiten tu vitrina cinéfila.",
      );
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("No se pudo copiar el enlace automáticamente.");
    }
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const resProfile = await fetch("/api/profile");

      if (resProfile.ok) {
        const data = await resProfile.json();
        setProfileData(data.profile);
        setStats(data.stats);
        setTopCine(data.topCine || []);
        setWatchedCatalog(data.watchedCatalog || []);
        setWatchlistCatalog(data.watchlistCatalog || []);
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWatchlistPrivacy = async (newVal: boolean) => {
    setProfileData((prev) => ({ ...prev, isWatchlistPublic: newVal }));

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
      setProfileData((prev) => ({ ...prev, isWatchlistPublic: !newVal }));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAdminAction = async (action: "wipe" | "seed") => {
    const confirmText =
      action === "wipe"
        ? "¿Estás seguro de que deseas vaciar tus valoraciones para comenzar desde cero?"
        : "¿Deseas recargar el catálogo con las películas y reseñas de demostración?";

    if (!window.confirm(confirmText)) return;

    setIsActionLoading(true);
    setAdminMsg(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMsg(data.message);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-sm text-cine-400 font-medium">
          Calculando tus estadísticas cinéfilas...
        </p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* 1. Cabecera del Perfil Cinéfilo */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-cine-900 to-cine-950 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 flex-1 min-w-0">
            {/* Avatar con botón de cambio */}
            <div className="relative group/avatar w-28 h-28 sm:w-36 sm:h-36 lg:w-[166px] lg:h-[166px] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-gold-glow shrink-0 bg-cine-900 flex items-center justify-center">
              {profileData.avatarUrl ? (
                <img
                  src={profileData.avatarUrl}
                  alt={profileData.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-cine-500" />
              )}
              <button
                type="button"
                onClick={handleOpenEdit}
                className="absolute inset-0 w-full h-full bg-black/80 backdrop-blur-xs opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 flex flex-col items-center justify-center text-center p-0 m-0 cursor-pointer"
                title={
                  session?.user ? "Editar avatar y perfil" : "Iniciar sesión"
                }
              >
                {session?.user ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-amber-300">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                    <span className="text-[11px] font-bold tracking-wide leading-none text-center">
                      Cambiar
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-amber-300">
                    <LogIn className="w-6 h-6 text-amber-400" />
                    <span className="text-[11px] font-bold tracking-wide leading-none text-center">
                      Entrar
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* Bloque de Textos Tipográfico */}
            <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Perfil Cinéfilo
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {stats.rankTitle}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {profileData.displayName}
              </h1>

              <p className="text-xs sm:text-sm text-cine-300 max-w-lg leading-relaxed pt-0.5">
                {profileData.bio || "Explorador y crítico del séptimo arte."}
              </p>
            </div>

            {/* Columna de Botones de Acción */}
            <div className="flex flex-row sm:flex-col gap-2.5 sm:gap-3 shrink-0 self-start sm:self-center sm:ml-auto">
              <button
                onClick={handleOpenEdit}
                className="justify-center px-3.5 py-1.5 bg-cine-800/80 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title={
                  session?.user
                    ? "Editar perfil cinéfilo"
                    : "Inicia sesión para editar tu perfil"
                }
              >
                {session?.user ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Perfil</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                className="justify-center px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Copiar enlace a tu perfil público para compartir con amigos"
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
                onClick={() => {
                  sounds.shutter();
                  setIsWrappedOpen(true);
                }}
                className="justify-center px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-cine-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-gold-glow transition-all cursor-pointer"
                title="Generar tarjeta de resumen para redes sociales"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Cinephile Wrapped</span>
              </button>
            </div>
          </div>

          {/* Barra de Nivel Cinéfilo */}
          <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0">
            <CinephileLevelBar
              totalXp={stats.totalXp}
              variant="cinema"
              className="h-full lg:h-[166px]"
            />
          </div>
        </div>
      </section>

      {/* Highlights Rápidos */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Películas Vistas */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Film className="w-4 h-4 text-amber-400" /> Películas Vistas
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.totalWatched}
            <span className="text-xs font-normal text-cine-400"> títulos</span>
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            {stats.totalReviews} reseñas escritas
          </div>
        </div>

        {/* En Watchlist */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Trophy className="w-4 h-4 text-amber-400" /> En Watchlist
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.totalWatchlist}
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
            {stats.globalBallKnowledge !== null
              ? `${stats.globalBallKnowledge}%`
              : "—"}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Frente al consenso de IMDb
          </div>
        </div>

        {/* Tu Nota Media */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Tu Nota
            Media
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.averageRating || "—"}
            <span className="text-xs font-normal text-cine-400"> / 10</span>
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Género top:{" "}
            <strong className="text-amber-400">{stats.topGenre || "—"}</strong>
          </div>
        </div>
      </section>

      {/* Vitrina de Top 5 Cinéfilo (Películas & Series) */}
      <section>
        <TopFiveCard type="cinema" title="Top 5 Cinéfilo" items={topCine} />
      </section>

      {/* Catálogo Completo de Películas y Series Vistas */}
      <WatchedCatalogSection type="cinema" items={watchedCatalog} />

      {/* Watchlist de Cine & Series */}
      <WatchlistSection
        type="cinema"
        items={watchlistCatalog}
        isOwner={true}
        isPublic={profileData.isWatchlistPublic !== false}
        username={profileData.username}
        onTogglePrivacy={handleToggleWatchlistPrivacy}
      />

      {/* 2. Rankings Personales: Biggest W vs Biggest L */}
      {(stats.biggestW || stats.biggestL) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Rankings de Precisión (W & L)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Biggest W */}
            {stats.biggestW && (
              <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-cine-900 to-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👑</span>
                    <h3 className="font-bold text-white text-base">
                      BIGGEST W
                    </h3>
                  </div>
                  <BallKnowledgeBadge
                    score={stats.biggestW.ballKnowledge}
                    size="sm"
                  />
                </div>

                <div className="flex items-center gap-4">
                  {stats.biggestW.posterPath && (
                    <img
                      src={stats.biggestW.posterPath}
                      alt={stats.biggestW.title}
                      className="w-16 h-24 object-cover rounded-xl shadow border border-white/10"
                    />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base">
                      {stats.biggestW.title}
                    </h4>
                    <p className="text-xs text-cine-300">
                      {Math.abs(stats.biggestW.diff || 0) < 0.05
                        ? "Coincidencia idéntica con el consenso de IMDb."
                        : "Coincidencia casi idéntica con el consenso de IMDb."}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-mono pt-1">
                      <span className="text-amber-400 font-bold">
                        Tú: {stats.biggestW.userRating.toFixed(1)}
                      </span>
                      <span className="text-cine-500">vs</span>
                      <span className="text-cine-300">
                        IMDb: {stats.biggestW.imdbRating.toFixed(1)}
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        (Diff:{" "}
                        {stats.biggestW.diff > 0
                          ? `+${stats.biggestW.diff}`
                          : stats.biggestW.diff}
                        )
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Biggest L */}
            {stats.biggestL && (
              <div className="glass-panel p-5 rounded-3xl border border-red-500/30 bg-gradient-to-br from-cine-900 to-red-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤡</span>
                    <h3 className="font-bold text-white text-base">
                      BIGGEST L
                    </h3>
                  </div>
                  <BallKnowledgeBadge
                    score={stats.biggestL.ballKnowledge}
                    size="sm"
                  />
                </div>

                <div className="flex items-center gap-4">
                  {stats.biggestL.posterPath && (
                    <img
                      src={stats.biggestL.posterPath}
                      alt={stats.biggestL.title}
                      className="w-16 h-24 object-cover rounded-xl shadow border border-white/10"
                    />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base">
                      {stats.biggestL.title}
                    </h4>
                    <p className="text-xs text-cine-300">
                      Tu mayor discrepancia respecto a la nota comunitaria de
                      IMDb.
                    </p>
                    <div className="flex items-center gap-3 text-xs font-mono pt-1">
                      <span className="text-amber-400 font-bold">
                        Tú: {stats.biggestL.userRating.toFixed(1)}
                      </span>
                      <span className="text-cine-500">vs</span>
                      <span className="text-cine-300">
                        IMDb: {stats.biggestL.imdbRating.toFixed(1)}
                      </span>
                      <span className="text-red-400 font-semibold">
                        (Diff:{" "}
                        {stats.biggestL.diff > 0
                          ? `+${stats.biggestL.diff}`
                          : stats.biggestL.diff}
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

      {/* 5. Gráficos Analíticos (Recharts) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white tracking-wide">
            Analítica Cinematográfica
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribución de Notas */}
          <div className="glass-panel p-5 rounded-3xl border border-cine-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Distribución de mis valoraciones</span>
              <span className="text-xs text-cine-400 font-normal">
                0 a 10 Estrellas
              </span>
            </h3>
            <RatingDistributionChart data={stats.ratingDistribution} />
          </div>

          {/* Géneros Más Vistos */}
          <div className="glass-panel p-5 rounded-3xl border border-cine-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Géneros más frecuentes</span>
              <span className="text-xs text-cine-400 font-normal">
                Volumen & Nota media
              </span>
            </h3>
            <GenreChart data={stats.genreCounts} />
          </div>

          {/* Línea Temporal de Visionados */}
          <div className="glass-panel p-5 rounded-3xl border border-cine-800 space-y-3 lg:col-span-2">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Evolución de visionados mensuales</span>
              <span className="text-xs text-cine-400 font-normal">
                Ritmo cinematográfico
              </span>
            </h3>
            <WatchesTimelineChart data={stats.watchesByMonth} />
          </div>
        </div>
      </section>

      {/* Zona de Peligro / Wipeout de Datos */}
      <WipeoutDangerZone onDataWiped={fetchProfile} universe="CINE" />

      {/* Modal Moderno de Edición de Perfil Cinéfilo */}
      <EditCinephileProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSaved={fetchProfile}
        initialName={profileData.displayName}
        initialBio={profileData.bio}
        initialAvatar={profileData.avatarUrl}
        initialIsWatchlistPublic={profileData.isWatchlistPublic}
      />

      {/* Modal de Social Wrapped */}
      <SocialWrappedModal
        isOpen={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        universe="CINE"
        user={{
          displayName: profileData.displayName,
          username: session?.user?.username,
          avatarUrl: profileData.avatarUrl,
        }}
        stats={{
          totalMovies: (stats as any).totalMovies ?? stats.totalWatched,
          totalSeries: (stats as any).totalSeries ?? 0,
          totalHours: 0,
          totalCompletedGames: 0,
          averageRating: stats.averageRating,
          ballKnowledge: stats.globalBallKnowledge,
          gameKnowledge: null,
        }}
        topItems={topCine.slice(0, 3)}
      />
    </div>
  );
}
