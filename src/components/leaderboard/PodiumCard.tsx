"use client";

import React from "react";
import Link from "next/link";
import {
  Crown,
  Medal,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";
import { LeaderboardUserEntry } from "@/app/api/leaderboard/route";
import { sounds } from "@/lib/sounds";

interface PodiumCardProps {
  user: LeaderboardUserEntry;
  position: 1 | 2 | 3;
}

export default function PodiumCard({ user, position }: PodiumCardProps) {
  const isFirst = position === 1;
  const isSecond = position === 2;
  const isThird = position === 3;

  const handleCardClick = () => {
    if (isFirst) {
      sounds.fanfare();
    } else {
      sounds.nav();
    }
  };

  // Estilos y temas por posición
  const theme = isFirst
    ? {
        border: "border-amber-500/70 hover:border-amber-400",
        shadow:
          "shadow-[0_0_35px_rgba(245,158,11,0.25)] hover:shadow-[0_0_50px_rgba(245,158,11,0.4)]",
        badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950",
        ringColor: "ring-amber-400/80 shadow-gold-glow",
        pedestalBg:
          "bg-gradient-to-b from-amber-500/20 via-amber-950/30 to-cine-950",
        icon: Crown,
        medalLabel: "1º LUGAR",
        heightClass: "h-auto md:h-[435px]",
        avatarSize: "w-20 h-20 sm:w-24 sm:h-24",
        glowAccent: "text-amber-400",
      }
    : isSecond
      ? {
          border: "border-slate-300/50 hover:border-slate-200",
          shadow:
            "shadow-[0_0_25px_rgba(203,213,225,0.15)] hover:shadow-[0_0_40px_rgba(203,213,225,0.3)]",
          badgeBg:
            "bg-gradient-to-r from-slate-300 to-slate-100 text-slate-950",
          ringColor: "ring-slate-300/80",
          pedestalBg:
            "bg-gradient-to-b from-slate-400/15 via-slate-900/40 to-cine-950",
          icon: Medal,
          medalLabel: "2º LUGAR",
          heightClass: "h-auto md:h-[385px]",
          avatarSize: "w-16 h-16 sm:w-20 sm:h-20",
          glowAccent: "text-slate-200",
        }
      : {
          border: "border-amber-700/60 hover:border-amber-600",
          shadow:
            "shadow-[0_0_25px_rgba(180,83,9,0.15)] hover:shadow-[0_0_40px_rgba(180,83,9,0.3)]",
          badgeBg: "bg-gradient-to-r from-amber-700 to-amber-600 text-amber-50",
          ringColor: "ring-amber-700/80",
          pedestalBg:
            "bg-gradient-to-b from-amber-900/20 via-zinc-900/40 to-cine-950",
          icon: Trophy,
          medalLabel: "3º LUGAR",
          heightClass: "h-auto md:h-[340px]",
          avatarSize: "w-16 h-16 sm:w-20 sm:h-20",
          glowAccent: "text-amber-500",
        };

  const IconComponent = theme.icon;

  return (
    <Link
      href={`/u/${user.username}`}
      onClick={handleCardClick}
      className={`group relative flex flex-col items-center justify-between rounded-3xl p-4 sm:p-6 border ${theme.border} ${theme.shadow} ${theme.pedestalBg} ${theme.heightClass} transition-all duration-300 hover:-translate-y-2 cursor-pointer w-full overflow-hidden`}
    >
      {/* Resplandor decorativo de fondo */}
      {isFirst && (
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/25 transition-all" />
      )}

      {/* Badge de Posición / Medalla Superior */}
      <div className="relative z-10 flex items-center gap-1.5 mb-2">
        <span
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black tracking-wider shadow-md ${theme.badgeBg}`}
        >
          <IconComponent className="w-3.5 h-3.5" />
          {theme.medalLabel}
        </span>
        {user.isCurrentUser && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
            TÚ
          </span>
        )}
      </div>

      {/* Avatar con Corona/Anillo */}
      <div className={`relative ${isFirst ? "mt-7 mb-2" : "my-2"}`}>
        {isFirst && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce z-20 pointer-events-none">
            <Crown className="w-7 h-7 drop-shadow-[0_0_10px_rgba(245,158,11,0.85)] fill-amber-400" />
          </div>
        )}
        <div
          className={`rounded-2xl ring-4 ${theme.ringColor} overflow-hidden bg-cine-900 flex items-center justify-center transition-transform group-hover:scale-105 ${theme.avatarSize}`}
        >
          {user.image ? (
            <img
              src={user.image}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-cine-900 to-cine-800 text-white font-extrabold text-2xl">
              {(user.name || user.username)[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Datos del Usuario */}
      <div className="text-center w-full z-10 flex flex-col items-center">
        <h3 className="font-extrabold text-white text-base sm:text-lg group-hover:text-amber-400 transition-colors truncate max-w-[180px]">
          {user.name || user.username}
        </h3>
        <p className="text-xs text-cine-400 font-mono -mt-0.5">
          @{user.username}
        </p>

        {/* Título Honorífico */}
        <div className="mt-2 px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-cine-200 tracking-wide flex items-center gap-1">
          <Sparkles className={`w-3 h-3 ${theme.glowAccent}`} />
          <span className="truncate max-w-[160px]">{user.title}</span>
        </div>

        {/* XP y Nivel */}
        <div className="mt-3 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-cine-900/90 border border-cine-700/60 text-xs font-black text-amber-400 flex items-center gap-1 shadow-inner">
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {user.xp.toLocaleString()} XP
          </span>
          <span className="text-xs font-bold text-cine-300">
            Nvl {user.level}
          </span>
        </div>

        {/* Resumen de actividad */}
        <p className="mt-2 text-[11px] text-cine-400 text-center font-medium line-clamp-1 max-w-[200px]">
          {user.statsSummary}
        </p>
      </div>
    </Link>
  );
}
