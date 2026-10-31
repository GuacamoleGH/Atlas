"use client";

import React from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  ArrowUpRight,
  User,
  Sparkles,
  LogIn,
} from "lucide-react";
import { LeaderboardUserEntry } from "@/app/api/leaderboard/route";
import { useSession } from "next-auth/react";
import { sounds } from "@/lib/sounds";

interface UserRankCardProps {
  currentUserEntry: LeaderboardUserEntry | undefined;
  category: "global" | "cinema" | "gaming";
  ranking: LeaderboardUserEntry[];
}

export default function UserRankCard({
  currentUserEntry,
  category,
  ranking,
}: UserRankCardProps) {
  const { data: session } = useSession();

  const categoryName =
    category === "global"
      ? "Atlas Global"
      : category === "cinema"
        ? "Cinefilia & Sofa Knowledge"
        : "Gaming & Game Knowledge";

  if (!session?.user) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-cine-900/60 to-purple-950/40 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">
              ¿Quieres unirte al podio de la comunidad?
            </h3>
            <p className="text-xs text-cine-300">
              Inicia sesión para acumular XP, subir de nivel y aparecer en el
              ranking oficial.
            </p>
          </div>
        </div>

        <Link
          href="/login"
          onClick={() => sounds.click()}
          className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-gold-glow"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Iniciar Sesión</span>
        </Link>
      </div>
    );
  }

  if (!currentUserEntry) {
    return (
      <div className="rounded-2xl border border-cine-800 bg-cine-900/60 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cine-800 flex items-center justify-center text-cine-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">
              Aún no tienes actividad en {categoryName}
            </h4>
            <p className="text-xs text-cine-400">
              Registra tu primera película o juego para entrar a la tabla
              clasificatoria.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si tiene entrada en el ranking:
  const isLeader = currentUserEntry.rank === 1;
  const userAhead =
    currentUserEntry.rank > 1 ? ranking[currentUserEntry.rank - 2] : null;
  const xpDifference = userAhead ? userAhead.xp - currentUserEntry.xp : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-cine-900/80 to-purple-500/10 p-5 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Lado izquierdo: Posición y Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex flex-col items-center justify-center text-amber-400 shadow-gold-glow">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
              Puesto
            </span>
            <span className="text-xl font-black font-mono">
              #{currentUserEntry.rank}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-white text-base sm:text-lg">
                Tu Posición en {categoryName}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Nvl {currentUserEntry.level}
              </span>
            </div>

            <p className="text-xs text-cine-300 mt-0.5 flex items-center gap-2">
              <span className="font-semibold text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {currentUserEntry.xp.toLocaleString()} XP acumulados
              </span>
              <span>•</span>
              <span className="text-cine-400 italic">
                {currentUserEntry.title}
              </span>
            </p>
          </div>
        </div>

        {/* Lado derecho: Mensaje de superación o liderato */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
          {isLeader ? (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 rounded-xl">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>¡Lideras el podio indiscutiblemente! 👑</span>
            </div>
          ) : userAhead ? (
            <div className="text-xs text-cine-300 text-left md:text-right">
              <span className="text-cine-400">Siguiente objetivo: </span>
              <span className="font-bold text-white">
                +{xpDifference.toLocaleString()} XP
              </span>{" "}
              para adelantar a{" "}
              <Link
                href={`/u/${userAhead.username}`}
                className="text-amber-400 hover:underline font-semibold"
              >
                @{userAhead.username}
              </Link>{" "}
              (Puesto #{userAhead.rank})
            </div>
          ) : null}

          <Link
            href={`/u/${currentUserEntry.username}`}
            onClick={() => sounds.click()}
            className="shrink-0 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cine-200 hover:text-white transition-colors"
            title="Ver mi perfil público"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
