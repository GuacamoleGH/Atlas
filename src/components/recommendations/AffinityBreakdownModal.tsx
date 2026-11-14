"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Film, Tv, CheckCircle2, ShieldCheck, Star } from "lucide-react";
import { RecommendationItem, getLanguageName } from "@/lib/recommendations";

interface AffinityBreakdownModalProps {
  item: RecommendationItem | null;
  onClose: () => void;
}

export default function AffinityBreakdownModal({
  item,
  onClose,
}: AffinityBreakdownModalProps) {
  if (!item) return null;

  const isMovie = item.mediaType === "movie";
  const { seedSupport, genreAffinity, quality, languageAffinity, seedTitle } =
    item.scoreBreakdown;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg glass-panel bg-cine-950 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between gap-4 border-b border-cine-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                Desglose de Afinidad
              </h3>
              <p className="text-xs text-cine-400 mt-0.5">
                {item.title} ({item.releaseYear || "Año N/A"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-cine-400 hover:text-white hover:bg-cine-900 border border-cine-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen de afinidad */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cine-900 to-cine-950 border border-amber-500/20">
          <div>
            <div className="text-xs text-cine-400 uppercase font-mono font-semibold">
              Puntuación Algorítmica
            </div>
            <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5">
              {item.affinityScore}%
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cine-900 border border-cine-700 text-xs text-amber-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Confianza:{" "}
              {item.confidence === "high"
                ? "Alta"
                : item.confidence === "medium"
                  ? "Media"
                  : "Inicial"}
            </span>
            <p className="text-[11px] text-cine-400 mt-1">
              Basado en tu actividad en Atlas
            </p>
          </div>
        </div>

        {/* Motivo contextual */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            ¿Por qué te recomendamos esto?
          </h4>
          <p className="text-xs sm:text-sm text-cine-200 bg-cine-900/80 p-3 rounded-xl border border-cine-800 leading-relaxed">
            {item.matchReason}
          </p>
        </div>

        {/* Criterios y barras de ponderación */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Criterios de la Fórmula
          </h4>

          {/* 1. Soporte de Semillas (40%) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cine-300">
                Soporte de tus obras favoritas (40%)
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {Math.round(seedSupport * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-cine-900 rounded-full overflow-hidden border border-cine-800">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(seedSupport * 100)}%` }}
              />
            </div>
            {seedTitle && (
              <p className="text-[10px] text-cine-500 italic">
                Impulsado principalmente por: {seedTitle}
              </p>
            )}
          </div>

          {/* 2. Afinidad de Géneros (30%) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cine-300">Afinidad por géneros (30%)</span>
              <span className="font-mono text-emerald-400 font-bold">
                {Math.round(genreAffinity * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-cine-900 rounded-full overflow-hidden border border-cine-800">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(genreAffinity * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-cine-500">
              Géneros: {item.genres.join(", ") || "General"}
            </p>
          </div>

          {/* 3. Calidad TMDB (Media Bayesiana) (20%) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cine-300">Calidad crítica TMDB (20%)</span>
              <span className="font-mono text-sky-400 font-bold">
                {Math.round(quality * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-cine-900 rounded-full overflow-hidden border border-cine-800">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(quality * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-cine-500">
              Nota: {item.voteAverage} / 10 ({item.voteCount.toLocaleString()}{" "}
              votos)
            </p>
          </div>

          {/* 4. Idioma (10%) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cine-300">Compatibilidad de idioma (10%)</span>
              <span className="font-mono text-purple-400 font-bold">
                {Math.round(languageAffinity * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-cine-900 rounded-full overflow-hidden border border-cine-800">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(languageAffinity * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-cine-500">
              Idioma original: {item.originalLanguage ? getLanguageName(item.originalLanguage) : "Español"} ({item.originalLanguage?.toUpperCase() || "ES"})
            </p>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cine-900 hover:bg-cine-800 text-white font-semibold text-xs border border-cine-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
