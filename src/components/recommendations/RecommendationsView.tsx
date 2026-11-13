"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Film,
  Tv,
  HelpCircle,
  TrendingUp,
  Bookmark,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  RecommendationItem,
  RecommendationsResponse,
  RecommendationRow as RowType,
} from "@/lib/recommendations";
import RecommendationRow from "./RecommendationRow";
import AffinityBreakdownModal from "./AffinityBreakdownModal";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface RecommendationsViewProps {
  initialData: RecommendationsResponse;
}

export default function RecommendationsView({
  initialData,
}: RecommendationsViewProps) {
  const [data, setData] = useState<RecommendationsResponse>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [breakdownItem, setBreakdownItem] = useState<RecommendationItem | null>(null);
  const toast = useToast();

  // Función para refrescar manualmente las recomendaciones
  const handleRefresh = async () => {
    setIsRefreshing(true);
    sounds.playClick();
    try {
      const res = await fetch("/api/recommendations?refresh=true");
      if (res.ok) {
        const freshData: RecommendationsResponse = await res.json();
        setData(freshData);
        sounds.playSuccess();
        toast.success("Recomendaciones actualizadas con tu última actividad.");
      } else {
        toast.toast({
          type: "error",
          title: "Error al actualizar recomendaciones",
        });
      }
    } catch (err) {
      console.error("Error al refrescar recomendaciones:", err);
      toast.toast({
        type: "error",
        title: "No se pudieron actualizar las recomendaciones",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Manejar exclusión local instantánea
  const handleExcludeItem = (itemId: string) => {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => ({
        ...row,
        items: row.items.filter((item) => item.id !== itemId),
      })),
    }));
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Cabecera Principal */}
      <section className="relative rounded-3xl overflow-hidden glass-panel border border-amber-500/20 p-6 sm:p-10 bg-gradient-to-br from-cine-900 via-cine-950 to-cine-900 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold shadow-gold-glow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Algoritmo Cinephile Atlas · Basado en Contenido</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Para ti · <span className="text-amber-400">Recomendaciones</span>
            </h1>
            <p className="text-sm sm:text-base text-cine-300 leading-relaxed">
              Descubre títulos minuciosamente seleccionados para tus gustos a partir de tus películas y series vistas, tus valoraciones y tu Watchlist. Sin algoritmos externos, calculado íntegramente con tus preferencias.
            </p>
          </div>

          {/* Controles de actualización */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl bg-cine-900 hover:bg-cine-800 border border-cine-700 text-amber-300 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              title="Recalcular recomendaciones ahora"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-amber-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>
                {isRefreshing ? "Calculando..." : "Actualizar recomendaciones"}
              </span>
            </button>

            {data.cachedAt && (
              <span className="text-[10px] font-mono text-cine-500">
                Último análisis:{" "}
                {new Date(data.cachedAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Banner de Cold Start (si el usuario tiene menos de 3 obras vistas) */}
      {data.isColdStart && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/30 bg-sky-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Todavía estamos conociendo tus gustos
              </h3>
              <p className="text-xs text-cine-300 mt-1 max-w-2xl leading-relaxed">
                Has registrado {data.watchedCount} {data.watchedCount === 1 ? "obra vista" : "obras vistas"}. Valora al menos 3 películas o series para que Atlas pueda generar un perfil de afinidad personalizado con desglose matemático completo. Mientras tanto, aquí tienes las mejores tendencias de la semana.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tv/movies"
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-cine-950 font-bold rounded-xl text-xs transition-colors shadow"
            >
              Explorar Catálogo
            </Link>
          </div>
        </div>
      )}

      {/* Filas de Recomendaciones */}
      <div className="space-y-12">
        {data.rows.map((row) => (
          <RecommendationRow
            key={row.id}
            row={row}
            onExclude={handleExcludeItem}
            onOpenBreakdown={(item) => setBreakdownItem(item)}
          />
        ))}

        {data.rows.length === 0 && (
          <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center space-y-3 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-cine-900 border border-cine-800 flex items-center justify-center text-cine-500 mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              No hay recomendaciones disponibles
            </h3>
            <p className="text-xs text-cine-400">
              Comprueba que tienes conexión a internet o añade algunas películas a tu Watchlist o catálogo visto.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Desglose de Afinidad */}
      <AffinityBreakdownModal
        item={breakdownItem}
        onClose={() => setBreakdownItem(null)}
      />
    </div>
  );
}
