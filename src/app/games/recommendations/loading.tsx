import React from "react";
import { Gamepad2, Sparkles } from "lucide-react";

export default function GameRecommendationsLoading() {
  return (
    <div className="space-y-8 pb-20 animate-pulse">
      {/* Skeleton del Banner Cyberpunk Gamer Hub */}
      <section className="relative rounded-3xl overflow-hidden glass-panel border border-purple-500/20 p-6 sm:p-10 bg-gradient-to-br from-purple-950/40 via-zinc-950 to-cyan-950/30 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Analizando biblioteca gamer...</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Para ti ·</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
                Recomendaciones
              </span>
            </h1>

            <p className="text-sm text-zinc-400">
              Calculando afinidad multidimensional en géneros, tags de RAWG, sagas y plataformas...
            </p>
          </div>

          <div className="w-36 h-9 rounded-xl bg-purple-950/50 border border-purple-500/20" />
        </div>
      </section>

      {/* Skeleton de Filtros */}
      <div className="space-y-4 pt-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 w-24 rounded-full bg-zinc-900 border border-zinc-800"
            />
          ))}
        </div>
      </div>

      {/* Skeleton de Cuadrícula de Videojuegos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden glass-card border border-zinc-800/80 bg-zinc-950 flex flex-col"
          >
            <div className="aspect-[2/3] w-full bg-zinc-900 relative">
              <div className="absolute top-2 left-2 w-16 h-4 rounded bg-purple-950/60 border border-purple-500/20" />
              <div className="absolute top-2 right-2 w-8 h-4 rounded bg-cyan-950/60 border border-cyan-500/20" />
            </div>
            <div className="p-3 space-y-2">
              <div className="h-4 w-4/5 rounded bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-900" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
