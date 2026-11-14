"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Flame, Sparkles, Film, Gamepad2 } from "lucide-react";
import { LeaderboardUserEntry } from "@/app/api/leaderboard/route";
import { sounds } from "@/lib/sounds";

interface LeaderboardRowProps {
  user: LeaderboardUserEntry;
  category?: "global" | "cinema" | "gaming";
}

export default function LeaderboardRow({
  user,
  category = "global",
}: LeaderboardRowProps) {
  const isGaming = category === "gaming";

  const handleRowClick = () => {
    sounds.nav();
  };

  return (
    <Link
      href={`/u/${user.username}`}
      onClick={handleRowClick}
      className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
        user.isCurrentUser
          ? isGaming
            ? "bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:bg-purple-500/15"
            : "bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:bg-amber-500/15"
          : "bg-cine-900/60 hover:bg-cine-800/80 border-cine-800/80 hover:border-cine-700"
      }`}
    >
      {/* Izquierda: Posición + Avatar + Nombre */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Número de posición */}
        <div
          className={`w-8 sm:w-10 text-center font-mono font-black text-sm sm:text-base ${
            user.rank <= 10
              ? isGaming
                ? "text-purple-400"
                : "text-amber-400"
              : "text-cine-500 group-hover:text-cine-300"
          }`}
        >
          #{user.rank}
        </div>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ring-2 ring-white/10 overflow-hidden bg-cine-950 flex items-center justify-center transition-all ${
              isGaming
                ? "group-hover:ring-purple-400/50"
                : "group-hover:ring-amber-400/50"
            }`}
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cine-800 text-white font-bold text-sm">
                {(user.name || user.username)[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {user.isCurrentUser && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-cine-950" />
          )}
        </div>

        {/* Detalles de Usuario */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`font-bold text-white text-sm sm:text-base transition-colors truncate ${
                isGaming
                  ? "group-hover:text-purple-400"
                  : "group-hover:text-amber-400"
              }`}
            >
              {user.name || user.username}
            </h4>
            <span className="text-xs text-cine-400 font-mono hidden xs:inline">
              @{user.username}
            </span>
            {user.isCurrentUser && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                TÚ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] font-semibold text-cine-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
              <Sparkles
                className={`w-2.5 h-2.5 ${
                  isGaming ? "text-purple-400" : "text-amber-400"
                }`}
              />
              {user.title}
            </span>
            <span className="text-xs text-cine-400 hidden sm:inline truncate max-w-[280px]">
              {user.statsSummary}
            </span>
          </div>
        </div>
      </div>

      {/* Derecha: XP, Nivel y Flecha */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0 pl-2">
        <div className="flex flex-col items-end text-right">
          <div
            className={`flex items-center gap-1 font-mono font-black text-xs sm:text-sm ${
              isGaming ? "text-purple-400" : "text-amber-400"
            }`}
          >
            {isGaming ? (
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            )}
            <span>{user.xp.toLocaleString()} XP</span>
          </div>
          <span className="text-[11px] font-bold text-cine-400">
            Nivel {user.level}
          </span>
        </div>

        <ChevronRight
          className={`w-4 h-4 text-cine-500 group-hover:translate-x-0.5 transition-all ${
            isGaming
              ? "group-hover:text-purple-400"
              : "group-hover:text-amber-400"
          }`}
        />
      </div>
    </Link>
  );
}
