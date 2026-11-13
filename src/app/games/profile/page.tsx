"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LogIn,
  Gamepad2,
  Trophy,
  Clock,
  Layers,
  Tv,
  Star,
  Brain,
  Loader2,
  Bookmark,
  Edit3,
  Trash2,
  RefreshCw,
  Sparkles,
  Award,
  ArrowRight,
  Play,
  CheckCircle2,
  Flame,
  Camera,
  Medal,
  Share2,
  Check,
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
import GamerLevelBar from "@/components/games/GamerLevelBar";
import CriticVsYouChart from "@/components/games/CriticVsYouChart";
import HotTakesTable from "@/components/games/HotTakesTable";
import EditGamerProfileModal from "@/components/games/EditGamerProfileModal";
import SocialWrappedModal from "@/components/profile/SocialWrappedModal";
import TopFiveCard, { TopFiveItem } from "@/components/profile/TopFiveCard";
import WatchedCatalogSection, {
  WatchedCatalogItem,
} from "@/components/profile/WatchedCatalogSection";
import WatchlistSection from "@/components/profile/WatchlistSection";
import { WipeoutDangerZone } from "@/components/profile/WipeoutDangerZone";
import { GamerStats } from "@/types/game";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface ProfileResponse {
  profile: {
    id: string;
    displayName: string;
    username?: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isBacklogPublic?: boolean;
  };
  topGames?: TopFiveItem[];
  gamesCatalog?: WatchedCatalogItem[];
  backlogCatalog?: WatchedCatalogItem[];
  stats: GamerStats;
}

export default function GamerProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleShare = async () => {
    try {
      const targetUser =
        profileData?.profile?.username ||
        session?.user?.username ||
        session?.user?.name;
      if (!targetUser) {
        toast.error("Inicia sesión para compartir tu perfil.");
        return;
      }
      const shareUrl = `${window.location.origin}/u/${encodeURIComponent(targetUser)}?tab=gaming`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      sounds.playSuccess();
      setCopied(true);
      toast.success(
        "¡Enlace de perfil copiado!",
        "Compártelo con tus amigos para que exploren tu catálogo gamer.",
      );
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("No se pudo copiar el enlace automáticamente.");
    }
  };

  const handleOpenEdit = () => {
    sounds.playClick();
    if (!session?.user) {
      router.push("/login?callbackUrl=/games/profile");
      return;
    }
    setIsEditOpen(true);
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const resProfile = await fetch("/api/games/profile");

      if (resProfile.ok) {
        const data = await resProfile.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error("Error al cargar perfil gamer:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBacklogPrivacy = async (newVal: boolean) => {
    if (!profileData) return;
    setProfileData({
      ...profileData,
      profile: {
        ...profileData.profile,
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
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              profile: { ...prev.profile, isBacklogPublic: !newVal },
            }
          : prev,
      );
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAdminAction = async (action: "wipe" | "seed") => {
    if (action === "wipe") {
      const confirmWipe = window.confirm(
        "¿Estás seguro de que deseas vaciar tu base de datos de videojuegos? Se eliminarán todas las partidas, veredictos y progreso de nivel para empezar desde cero.",
      );
      if (!confirmWipe) return;
    }

    try {
      setIsActionLoading(true);
      setAdminMsg(null);
      const res = await fetch("/api/games/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMsg(data.message);
        await fetchProfile();
      } else {
        setAdminMsg(data.error || "Error al ejecutar acción");
      }
    } catch (err) {
      console.error(err);
      setAdminMsg("Error de conexión al ejecutar acción en la base de datos.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="text-xs text-cine-400 font-mono">
          Calculando telemetría gamer...
        </span>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-xs text-cine-500">
        No se pudieron cargar los datos del perfil gamer.
      </div>
    );
  }

  const { profile, stats } = profileData;

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* Cabecera del Perfil Gamer */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-cine-900 to-cine-950 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 flex-1 min-w-0">
            {/* Avatar */}
            <div className="relative group/avatar w-28 h-28 sm:w-36 sm:h-36 lg:w-[166px] lg:h-[166px] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.4)] shrink-0 bg-cine-900 flex items-center justify-center text-purple-300">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gamepad2 className="w-12 h-12" />
              )}
              <button
                type="button"
                onClick={handleOpenEdit}
                className="absolute inset-0 w-full h-full bg-black/80 backdrop-blur-xs opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 flex flex-col items-center justify-center text-center p-0 m-0 cursor-pointer"
                title={
                  session?.user ? "Elegir insignia temática" : "Iniciar sesión"
                }
              >
                {session?.user ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-purple-300">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <span className="text-[11px] font-bold tracking-wide leading-none text-center">
                      Cambiar
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-purple-300">
                    <LogIn className="w-6 h-6 text-purple-400" />
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
                <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold">
                  Perfil de Jugador
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {stats.rankTitle}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {profile.displayName}
              </h1>

              <p className="text-xs sm:text-sm text-cine-300 max-w-lg leading-relaxed pt-0.5">
                {profile.bio ||
                  "Jugador y analista del catálogo universal de videojuegos."}
              </p>
            </div>

            {/* Columna de Botones de Acción */}
            <div className="flex flex-row sm:flex-col gap-2.5 sm:gap-3 shrink-0 self-start sm:self-center sm:ml-auto">
              <button
                onClick={handleOpenEdit}
                className="justify-center px-3.5 py-1.5 bg-cine-800/80 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title={
                  session?.user
                    ? "Editar perfil gamer"
                    : "Inicia sesión para editar tu perfil"
                }
              >
                {session?.user ? (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
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
                className="justify-center px-3.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
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
                className="justify-center px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
                title="Generar tarjeta de resumen para redes sociales"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Juegos Wrapped</span>
              </button>
            </div>
          </div>

          {/* Barra de Nivel Gamer */}
          <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0">
            <GamerLevelBar
              totalXp={stats.totalXp}
              className="h-full lg:h-[166px]"
            />
          </div>
        </div>
      </section>

      {/* Highlights Rápidos */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Horas Totales */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Clock className="w-4 h-4 text-cyan-400" /> Horas en Pantalla
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.totalHours}
            <span className="text-sm font-normal text-cyan-400"> h</span>
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Top consola/tienda:{" "}
            <strong className="text-cine-300">
              {stats.topPlatform || "—"}
            </strong>
          </div>
        </div>

        {/* Completados */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Trophy className="w-4 h-4 text-amber-400" /> Títulos Terminados
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.totalCompleted}
            <span className="text-xs font-normal text-cine-400"> juegos</span>
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            {stats.totalPlatinum} trofeos Platino / 100%
          </div>
        </div>

        {/* Global Game Knowledge */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Brain className="w-4 h-4 text-purple-400" /> Game Knowledge
          </div>
          <div className="text-3xl font-black text-purple-400 font-mono">
            {stats.globalGameKnowledge ? `${stats.globalGameKnowledge}%` : "—"}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Frente al consenso de Metacritic
          </div>
        </div>

        {/* Nota Media vs Prensa */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Star className="w-4 h-4 text-purple-400 fill-purple-400" /> Tu Nota
            Media
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.averageRating || "—"}
            <span className="text-xs font-normal text-cine-400"> / 10</span>
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Prensa:{" "}
            <strong className="text-cyan-400">
              {stats.averageMetacritic || "—"}
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
          items={profileData.topGames || []}
        />
      </section>

      {/* Catálogo Completo de Videojuegos */}
      <WatchedCatalogSection
        type="gaming"
        items={profileData.gamesCatalog || []}
      />

      {/* Backlog de Videojuegos */}
      <WatchlistSection
        type="gaming"
        items={profileData.backlogCatalog || []}
        isOwner={true}
        isPublic={profile.isBacklogPublic !== false}
        username={profile.username}
        onTogglePrivacy={handleToggleBacklogPrivacy}
      />

      {/* Récords Personales y Desglose de Biblioteca */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Récord: Mayor Vicio */}
        <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 bg-cine-950 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Mayor Vicio Personal</span>
          </div>

          {stats.longestGame ? (
            <div className="flex-1 flex items-center p-3 rounded-2xl bg-cine-900/60 border border-purple-500/20">
              <div className="flex items-center gap-3.5 w-full">
                {stats.longestGame.cover && (
                  <img
                    src={stats.longestGame.cover}
                    alt={stats.longestGame.title}
                    className="w-16 h-16 rounded-xl object-cover border border-purple-500/30 shadow-md shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {stats.longestGame.title}
                  </p>
                  <p className="text-xl font-black text-purple-400 font-mono mt-0.5">
                    {stats.longestGame.hours}{" "}
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
                Registra horas en tus títulos para descubrir tu récord.
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

          {stats.highestRatedGame ? (
            <div className="flex-1 flex items-center p-3 rounded-2xl bg-cine-900/60 border border-amber-500/20">
              <div className="flex items-center gap-3.5 w-full">
                {stats.highestRatedGame.cover && (
                  <img
                    src={stats.highestRatedGame.cover}
                    alt={stats.highestRatedGame.title}
                    className="w-16 h-16 rounded-xl object-cover border border-amber-500/30 shadow-md shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {stats.highestRatedGame.title}
                  </p>
                  <p className="text-xl font-black text-amber-400 font-mono mt-0.5">
                    ★ {stats.highestRatedGame.rating}{" "}
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
                Puntúa tus títulos favoritos para ver tu obra maestra.
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
              <span className="text-cine-400 block text-[10px]">Jugando</span>
              <span className="text-base font-black text-white font-mono">
                {stats.statusBreakdown?.playing ?? stats.totalPlaying}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
              <span className="text-cine-400 block text-[10px]">Continuos</span>
              <span className="text-base font-black text-sky-400 font-mono">
                {stats.statusBreakdown?.continuous ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
              <span className="text-cine-400 block text-[10px]">
                Completados
              </span>
              <span className="text-base font-black text-purple-400 font-mono">
                {stats.statusBreakdown?.completed ?? stats.totalCompleted}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
              <span className="text-cine-400 block text-[10px]">
                Pendientes
              </span>
              <span className="text-base font-black text-white font-mono">
                {stats.statusBreakdown?.backlog ?? stats.totalBacklog}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
              <span className="text-cine-400 block text-[10px]">
                Platinados
              </span>
              <span className="text-base font-black text-amber-400 font-mono">
                {stats.statusBreakdown?.platinum ?? stats.totalPlatinum}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cine-900/80 border border-cine-800">
              <span className="text-cine-400 block text-[10px]">
                Media / Título
              </span>
              <span className="text-base font-black text-cyan-300 font-mono">
                {stats.averageCompletionHours
                  ? `${stats.averageCompletionHours}h`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Distribución de Puntuaciones (1 al 10) */}
      {stats.ratingDistribution &&
        stats.ratingDistribution.some((d) => d.count > 0) && (
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
                  data={stats.ratingDistribution}
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
                    formatter={(val: any) => [`${val} juego(s)`, "Cantidad"]}
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
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-cine-950 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cine-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              <h2 className="text-lg font-bold text-white">
                Critic vs You (Metacritic vs Tu Veredicto)
              </h2>
            </div>
            <p className="text-xs text-cine-400 mt-0.5">
              Comparativa directa entre tu criterio de juego y la media de los
              analistas especializados.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cine-500">
            {stats.criticVsYou.length} títulos contrastados
          </span>
        </div>

        <CriticVsYouChart data={stats.criticVsYou} />
      </section>

      {/* Tabla de Hot Takes 🔥 */}
      <section className="space-y-4">
        <HotTakesTable hotTakes={stats.hotTakes} />
      </section>

      {/* Horas por Plataforma y Horas por Género */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horas por Plataforma */}
        <section className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-cine-950 space-y-4">
          <div className="flex items-center gap-2 border-b border-cine-800 pb-3">
            <Tv className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Horas por Plataforma
            </h3>
          </div>

          {stats.hoursByPlatform.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-cine-500 italic">
              Registra juegos con plataformas para ver tus horas.
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.hoursByPlatform}
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
                      return [`${val} horas${countStr}${pct}`, "Tiempo"];
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    fill="#06B6D4"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Horas por Género */}
        <section className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-cine-950 space-y-4">
          <div className="flex items-center gap-2 border-b border-cine-800 pb-3">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-base font-bold text-white">Horas por Género</h3>
          </div>

          {stats.hoursByGenre.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-cine-500 italic">
              Sin datos de géneros registrados.
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.hoursByGenre.slice(0, 6)}
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
                    width={100}
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
      </div>

      {/* Zona de Peligro / Wipeout de Datos */}
      <WipeoutDangerZone onDataWiped={fetchProfile} universe="GAMING" />

      {/* Modal para Editar Perfil Gamer */}
      <EditGamerProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => {
          fetchProfile();
        }}
        initialName={profile.displayName}
        initialBio={profile.bio}
        initialAvatar={profile.avatarUrl}
        initialIsBacklogPublic={profile.isBacklogPublic}
      />

      {/* Modal de Social Wrapped */}
      <SocialWrappedModal
        isOpen={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        universe="GAMING"
        user={{
          displayName: profile.displayName,
          username: session?.user?.username,
          avatarUrl: profile.avatarUrl,
        }}
        stats={{
          totalMovies: 0,
          totalSeries: 0,
          totalHours: stats.totalHours,
          totalCompletedGames: stats.totalCompleted,
          totalPlatinum: stats.totalPlatinum,
          averageRating: stats.averageRating,
          ballKnowledge: null,
          gameKnowledge: stats.globalGameKnowledge,
        }}
        topItems={profileData.topGames?.slice(0, 3) || []}
      />
    </div>
  );
}
