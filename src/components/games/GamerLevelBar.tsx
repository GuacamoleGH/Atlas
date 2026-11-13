"use client";

import React from "react";
import { Trophy, Zap } from "lucide-react";
import { calculateGamerLevelAndRank } from "@/lib/gameKnowledge";

interface GamerLevelBarProps {
  totalXp: number;
  className?: string;
}

export default function GamerLevelBar({
  totalXp,
  className = "",
}: GamerLevelBarProps) {
  const {
    level,
    rankTitle,
    rankIcon,
    rankColor,
    currentLevelBaseXp,
    nextLevelXp,
    xpProgressPercent,
  } = calculateGamerLevelAndRank(totalXp);

  const xpInCurrentLevel = totalXp - currentLevelBaseXp;
  const xpNeededForNext = nextLevelXp - currentLevelBaseXp;

  return (
    <div
      className={`glass-panel p-4 sm:p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-cine-900 to-cine-950 shadow-lg relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Luz ambiental decorativa */}
      <div
        className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: rankColor }}
      />

      <div className="flex items-center gap-3 relative z-10">
        {/* Icono */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shadow-inner shrink-0"
          style={{
            backgroundColor: `${rankColor}20`,
            borderColor: `${rankColor}50`,
          }}
        >
          <span>{rankIcon}</span>
        </div>

        {/* Bloque de dos filas con altura sincronizada a la del icono (h-12) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-12 py-0.5">
          {/* Fila superior: Rango + Nivel (izq) y Exp. Total (der) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-purple-400 font-mono whitespace-nowrap">
                Rango Gamer
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold leading-none bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 whitespace-nowrap">
                Nvl. {level}
              </span>
            </div>

            <div className="text-[10px] sm:text-[11px] text-cine-400 flex items-center gap-1 font-mono font-medium whitespace-nowrap shrink-0">
              <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
              <span>Exp. Total</span>
            </div>
          </div>

          {/* Fila inferior: Título del Rango (izq) y Puntos XP (der) alineados en la misma base */}
          <div className="flex items-baseline justify-between gap-2">
            <h3
              className="text-base sm:text-lg font-black tracking-tight truncate leading-none"
              style={{ color: rankColor }}
              title={rankTitle}
            >
              {rankTitle}
            </h3>

            <div
              suppressHydrationWarning
              className="text-lg sm:text-xl font-black text-white font-mono tracking-tight leading-none shrink-0"
            >
              {(totalXp || 0).toLocaleString()}{" "}
              <span className="text-xs font-bold text-purple-400">XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progreso interactiva */}
      <div className="mt-3.5 space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-xs text-cine-400 font-mono">
          <span>
            Progreso nivel {level}:{" "}
            <strong className="text-purple-300">
              {xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
            </strong>
          </span>
          <span className="text-cyan-400 font-bold">{xpProgressPercent}%</span>
        </div>

        <div className="w-full h-2.5 bg-cine-900 rounded-full overflow-hidden p-0.5 border border-purple-900/50">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-purple-500 to-cyan-400 shadow-[0_0_12px_rgba(139,92,246,0.5)]"
            style={{ width: `${xpProgressPercent > 0 ? Math.max(3, Math.min(100, xpProgressPercent)) : 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-cine-500 pt-0.5 font-mono">
          <span>{currentLevelBaseXp.toLocaleString()} XP</span>
          <span className="flex items-center gap-1 text-cine-400">
            <Trophy className="w-3 h-3 text-purple-400" /> Siguiente nivel:{" "}
            {nextLevelXp.toLocaleString()} XP
          </span>
        </div>
      </div>
    </div>
  );
}
