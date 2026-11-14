"use client";

import React from "react";
import { X, Sparkles, Trophy, Tag, Layers, Star, Laptop, Clock } from "lucide-react";
import { ScoredGameCandidate } from "@/lib/gameRecommendations/types";

interface GameBreakdownModalProps {
  game: ScoredGameCandidate | null;
  onClose: () => void;
}

export default function GameBreakdownModal({
  game,
  onClose,
}: GameBreakdownModalProps) {
  if (!game) return null;

  const dimensions = [
    {
      key: "G",
      label: "Géneros afines",
      score: game.breakdown.G,
      max: 20,
      icon: Layers,
      desc: "Compatibilidad con tus categorías preferidas",
    },
    {
      key: "M",
      label: "Sagas y favoritos",
      score: game.breakdown.M,
      max: 22,
      icon: Trophy,
      desc: game.seedMatch ? `Inspirado en ${game.seedMatch}` : "Similitud con tus mejores juegos",
    },
    {
      key: "T",
      label: "Tags y mecánicas",
      score: game.breakdown.T,
      max: 20,
      icon: Tag,
      desc: "Mundo abierto, souls-like, narrativa, etc.",
    },
    {
      key: "D",
      label: "Estudio creador",
      score: game.breakdown.D,
      max: 10,
      icon: Sparkles,
      desc: game.developers[0] || "Desarrollador y editor",
    },
    {
      key: "Q",
      label: "Calidad y consenso",
      score: game.breakdown.Q,
      max: 13,
      icon: Star,
      desc: "Metacritic y notas de la comunidad",
    },
    {
      key: "P",
      label: "Tus plataformas",
      score: game.breakdown.P,
      max: 8,
      icon: Laptop,
      desc: "Disponible en tus dispositivos activos",
    },
    {
      key: "Y",
      label: "Época y duración",
      score: game.breakdown.Y,
      max: 7,
      icon: Clock,
      desc: `Ajuste a tu ritmo (${game.playtime}h de juego)`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cine-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl glass-card border border-purple-500/30 bg-cine-900/95 p-6 shadow-[0_0_35px_rgba(139,92,246,0.3)]">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Desglose de Afinidad
            </span>
            <h3 className="text-lg font-black text-white">{game.title}</h3>
          </div>
        </div>

        {/* Total Score */}
        <div className="mb-6 p-4 rounded-xl bg-cine-950/80 border border-purple-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400">Afinidad Calculada</span>
            <p className="text-sm font-semibold text-zinc-200 mt-0.5">{game.primaryReason}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-cyan-300 font-mono">
              {game.affinityPercentage}%
            </span>
          </div>
        </div>

        {/* Barras de cada dimensión */}
        <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
          {dimensions.map((dim) => {
            const Icon = dim.icon;
            const percentage = Math.min(100, Math.round((dim.score / dim.max) * 100));

            return (
              <div key={dim.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-200">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{dim.label}</span>
                  </span>
                  <span className="font-mono text-zinc-400">
                    +{dim.score} pts
                  </span>
                </div>
                <div className="h-1.5 w-full bg-cine-950 rounded-full overflow-hidden border border-purple-500/10">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 truncate">{dim.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
