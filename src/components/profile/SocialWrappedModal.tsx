"use client";

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X, Film, Gamepad2, Loader2 } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

export interface WrappedTopItem {
  id: string;
  title: string;
  image?: string | null;
  year?: number | string | null;
  rating?: number | null;
  mediaType?: "movie" | "series" | "game";
}

interface SocialWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  universe?: "CINE" | "GAMING";
  user: {
    displayName: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  stats: {
    totalMovies?: number;
    totalSeries?: number;
    totalHours?: number;
    totalCompletedGames?: number;
    totalPlatinum?: number;
    averageRating?: number | null;
    ballKnowledge?: number | null;
    gameKnowledge?: number | null;
  };
  topItems?: WrappedTopItem[];
}

// Cargar imagen a través del proxy local para evitar problemas de CORS y canvas tainting
const loadProxiedImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (
        !src.startsWith("/api/proxy-image") &&
        (src.startsWith("http://") || src.startsWith("https://"))
      ) {
        const proxySrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
        const fallback = new Image();
        fallback.crossOrigin = "anonymous";
        fallback.onload = () => resolve(fallback);
        fallback.onerror = reject;
        fallback.src = proxySrc;
      } else {
        reject(new Error(`Failed to load ${src}`));
      }
    };

    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.src = `/api/proxy-image?url=${encodeURIComponent(src)}`;
    } else {
      img.src = src;
    }
  });
};

export default function SocialWrappedModal({
  isOpen,
  onClose,
  universe = "CINE",
  user,
  stats,
  topItems = [],
}: SocialWrappedModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const isGaming = universe === "GAMING";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      sounds.modalOpen();
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const drawCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsGenerating(true);

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // 1. Fondo Oscuro Profundo
    const bgGradient = ctx.createLinearGradient(0, 0, W, H);
    if (isGaming) {
      bgGradient.addColorStop(0, "#050612");
      bgGradient.addColorStop(0.5, "#0d1026");
      bgGradient.addColorStop(1, "#03040a");
    } else {
      bgGradient.addColorStop(0, "#08090d");
      bgGradient.addColorStop(0.5, "#121522");
      bgGradient.addColorStop(1, "#050609");
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // 2. Luces radiales atmosféricas
    const glow1 = ctx.createRadialGradient(880, 220, 50, 880, 220, 700);
    if (isGaming) {
      glow1.addColorStop(0, "rgba(168, 85, 247, 0.4)");
      glow1.addColorStop(1, "rgba(168, 85, 247, 0)");
    } else {
      glow1.addColorStop(0, "rgba(245, 158, 11, 0.4)");
      glow1.addColorStop(1, "rgba(245, 158, 11, 0)");
    }
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(200, 1600, 50, 200, 1600, 800);
    if (isGaming) {
      glow2.addColorStop(0, "rgba(6, 182, 212, 0.35)");
      glow2.addColorStop(1, "rgba(6, 182, 212, 0)");
    } else {
      glow2.addColorStop(0, "rgba(217, 119, 6, 0.3)");
      glow2.addColorStop(1, "rgba(217, 119, 6, 0)");
    }
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Marco perimetral
    ctx.strokeStyle = isGaming
      ? "rgba(168, 85, 247, 0.3)"
      : "rgba(245, 158, 11, 0.3)";
    ctx.lineWidth = 10;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(40, 40, W - 80, H - 80, 48);
      ctx.stroke();
    } else {
      ctx.strokeRect(40, 40, W - 80, H - 80);
    }

    // 3. Encabezado
    ctx.fillStyle = isGaming ? "#c084fc" : "#fbbf24";
    ctx.font = "bold 34px monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      isGaming ? "GAMER • WRAPPED" : "CINEPHILE • WRAPPED",
      100,
      135,
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = "26px sans-serif";
    ctx.fillText(
      isGaming
        ? "RESUMEN DE AVENTURAS & PLATINOS"
        : "HISTORIAL DEL SÉPTIMO ARTE & SERIES",
      100,
      175,
    );

    // Año actual
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "bold 34px monospace";
    ctx.fillText(new Date().getFullYear().toString(), W - 100, 135);

    // 4. Tarjeta del Usuario
    const cardY = 225;
    const cardH = 240;
    ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
    ctx.strokeStyle = isGaming
      ? "rgba(168, 85, 247, 0.45)"
      : "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 3;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(100, cardY, W - 200, cardH, 36);
      ctx.fill();
      ctx.stroke();
    }

    // Avatar del Usuario
    const avatarSize = 150;
    const avatarX = 145;
    const avatarY = cardY + (cardH - avatarSize) / 2;

    let avatarDrawn = false;
    if (user.avatarUrl) {
      try {
        const avatarImg = await loadProxiedImage(user.avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2,
        );
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Borde circular brillante alrededor del avatar
        ctx.beginPath();
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2 + 3,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = isGaming ? "#c084fc" : "#f59e0b";
        ctx.lineWidth = 4;
        ctx.stroke();

        avatarDrawn = true;
      } catch (err) {
        console.warn("Could not load user avatar for canvas:", err);
      }
    }

    if (!avatarDrawn) {
      // Fallback Monograma degradado
      const grad = ctx.createLinearGradient(
        avatarX,
        avatarY,
        avatarX + avatarSize,
        avatarY + avatarSize,
      );
      if (isGaming) {
        grad.addColorStop(0, "#a855f7");
        grad.addColorStop(1, "#06b6d4");
      } else {
        grad.addColorStop(0, "#f59e0b");
        grad.addColorStop(1, "#d97706");
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const initial = (user.displayName ||
        (isGaming ? "G" : "C"))[0].toUpperCase();
      ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }

    // Textos del usuario
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 50px sans-serif";

    // Truncar nombre si es muy largo
    let displayName = user.displayName;
    if (displayName.length > 20) {
      displayName = displayName.substring(0, 19) + "…";
    }
    ctx.fillText(displayName, avatarX + avatarSize + 40, avatarY + 70);

    ctx.fillStyle = isGaming ? "#c084fc" : "#fbbf24";
    ctx.font = "bold 28px monospace";
    ctx.fillText(
      user.username ? `@${user.username}` : isGaming ? "@gamer" : "@cinefilo",
      avatarX + avatarSize + 40,
      avatarY + 120,
    );

    // 5. SECCIÓN DE ESTADÍSTICAS (4 CAJAS COMPACTAS Y EQUILIBRADAS)
    const statsY = 495;
    const boxW = (W - 240) / 2;
    const boxH = 220;
    const gapX = 40;
    const gapY = 22;

    const avgRatingFormatted =
      stats.averageRating !== null && stats.averageRating !== undefined
        ? `${stats.averageRating.toFixed(1)} ★`
        : "—";

    if (isGaming) {
      // Caja 1: Videojuegos
      drawStatBox(
        ctx,
        100,
        statsY,
        boxW,
        boxH,
        "VIDEOJUEGOS",
        (stats.totalCompletedGames || 0).toString(),
        "títulos terminados",
        "#a855f7",
      );

      // Caja 2: Horas Gamer
      drawStatBox(
        ctx,
        100 + boxW + gapX,
        statsY,
        boxW,
        boxH,
        "HORAS EN PANTALLA",
        `${Math.round(stats.totalHours || 0)}h`,
        "tiempo acumulado",
        "#06b6d4",
      );

      // Caja 3: Game Knowledge
      drawStatBox(
        ctx,
        100,
        statsY + boxH + gapY,
        boxW,
        boxH,
        "GAME KNOWLEDGE",
        stats.gameKnowledge ? `${stats.gameKnowledge}%` : "—",
        "precisión con Metacritic",
        "#38bdf8",
      );

      // Caja 4: Nota Media (se quita el rango cultural)
      drawStatBox(
        ctx,
        100 + boxW + gapX,
        statsY + boxH + gapY,
        boxW,
        boxH,
        "TU NOTA MEDIA",
        avgRatingFormatted,
        "promedio de veredictos",
        "#fbbf24",
      );
    } else {
      // Caja 1: Películas
      drawStatBox(
        ctx,
        100,
        statsY,
        boxW,
        boxH,
        "PELÍCULAS",
        (stats.totalMovies || 0).toString(),
        "vistas en catálogo",
        "#f59e0b",
      );

      // Caja 2: Series
      drawStatBox(
        ctx,
        100 + boxW + gapX,
        statsY,
        boxW,
        boxH,
        "SERIES",
        (stats.totalSeries || 0).toString(),
        "en seguimiento o vistas",
        "#fbbf24",
      );

      // Caja 3: Sofa Knowledge
      drawStatBox(
        ctx,
        100,
        statsY + boxH + gapY,
        boxW,
        boxH,
        "SOFA KNOWLEDGE",
        stats.ballKnowledge ? `${stats.ballKnowledge}%` : "—",
        "precisión frente a IMDb",
        "#10b981",
      );

      // Caja 4: Nota Media (se quita el rango cultural)
      drawStatBox(
        ctx,
        100 + boxW + gapX,
        statsY + boxH + gapY,
        boxW,
        boxH,
        "TU NOTA MEDIA",
        avgRatingFormatted,
        "promedio de valoración",
        "#f59e0b",
      );
    }

    // 6. SECCIÓN TOP 3 DEL PERFIL (En vez de los logros)
    const topSectionY = statsY + boxH * 2 + gapY + 30;
    const topSectionH = 670;

    ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
    ctx.strokeStyle = isGaming
      ? "rgba(168, 85, 247, 0.45)"
      : "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 3;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(100, topSectionY, W - 200, topSectionH, 36);
      ctx.fill();
      ctx.stroke();
    }

    // Cabecera Top 3
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(
      isGaming
        ? "👑 TOP 3 VIDEOJUEGOS PREDILECTOS"
        : "👑 TOP 3 CINÉFILO PREDILECTO",
      140,
      topSectionY + 68,
    );

    ctx.fillStyle = "rgba(156, 163, 175, 0.9)";
    ctx.font = "24px sans-serif";
    ctx.fillText(
      isGaming
        ? "Las obras maestras e insignia de tu biblioteca gamer"
        : "Las 3 obras cumbres e insignia de tu colección",
      140,
      topSectionY + 108,
    );

    // Dibujar 3 puestos del Top 3
    const topThree = topItems.slice(0, 3);
    const slots = [
      topThree[0] || null,
      topThree[1] || null,
      topThree[2] || null,
    ];

    const slotH = 140;
    const slotGap = 20;
    const slotStartY = topSectionY + 145;

    for (let i = 0; i < 3; i++) {
      const item = slots[i];
      const itemY = slotStartY + i * (slotH + slotGap);
      const itemW = W - 280;
      const itemX = 140;

      // Fondo del slot
      ctx.fillStyle = item ? "rgba(15, 23, 42, 0.7)" : "rgba(15, 23, 42, 0.3)";
      ctx.strokeStyle =
        i === 0
          ? "rgba(234, 179, 8, 0.5)"
          : i === 1
            ? "rgba(203, 213, 225, 0.4)"
            : "rgba(217, 119, 6, 0.4)";
      ctx.lineWidth = 2;

      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(itemX, itemY, itemW, slotH, 20);
        ctx.fill();
        ctx.stroke();
      }

      // Medalla #1, #2, #3
      const medalColors = ["#eab308", "#cbd5e1", "#d97706"];
      const medalBg = medalColors[i];
      const medalX = itemX + 22;
      const medalY = itemY + (slotH - 56) / 2;

      if (typeof ctx.roundRect === "function") {
        ctx.fillStyle = medalBg;
        ctx.beginPath();
        ctx.roundRect(medalX, medalY, 56, 56, 14);
        ctx.fill();
      }
      ctx.fillStyle = i === 1 ? "#090a10" : "#ffffff";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${i + 1}`, medalX + 28, medalY + 29);

      ctx.textBaseline = "alphabetic";

      if (!item) {
        // Espacio disponible
        ctx.textAlign = "left";
        ctx.fillStyle = "#6b7280";
        ctx.font = "italic 26px sans-serif";
        ctx.fillText(
          "Espacio disponible en tu Top 3",
          medalX + 80,
          itemY + slotH / 2 + 8,
        );
        continue;
      }

      // Poster del título
      const posterW = 75;
      const posterH = 100;
      const posterX = medalX + 75;
      const posterY = itemY + (slotH - posterH) / 2;

      let posterDrawn = false;
      if (item.image) {
        try {
          const posterImg = await loadProxiedImage(item.image);
          ctx.save();
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(posterX, posterY, posterW, posterH, 12);
            ctx.clip();
          }
          ctx.drawImage(posterImg, posterX, posterY, posterW, posterH);
          ctx.restore();
          posterDrawn = true;
        } catch {}
      }

      if (!posterDrawn) {
        ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(posterX, posterY, posterW, posterH, 12);
          ctx.fill();
        }
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MH", posterX + posterW / 2, posterY + posterH / 2 + 7);
      }

      // Título y detalles
      const textX = posterX + posterW + 25;
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";

      let titleStr = item.title;
      if (titleStr.length > 25) {
        titleStr = titleStr.substring(0, 24) + "…";
      }
      ctx.fillText(titleStr, textX, itemY + 54);

      // Subtítulo (Año · Tipo)
      const typeLabel =
        item.mediaType === "series"
          ? "Serie TV"
          : item.mediaType === "game"
            ? "Videojuego"
            : "Película";
      const yearStr = item.year ? `${item.year} · ` : "";
      ctx.fillStyle = "#9ca3af";
      ctx.font = "24px monospace";
      ctx.fillText(`${yearStr}${typeLabel}`, textX, itemY + 95);

      // Badge de Calificación a la derecha
      if (item.rating !== null && item.rating !== undefined) {
        const ratingBoxW = 120;
        const ratingBoxH = 50;
        const ratingBoxX = itemX + itemW - ratingBoxW - 25;
        const ratingBoxY = itemY + (slotH - ratingBoxH) / 2;

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(ratingBoxX, ratingBoxY, ratingBoxW, ratingBoxH, 14);
          ctx.fill();
          ctx.stroke();
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 28px monospace";
        ctx.fillText(
          `★ ${item.rating.toFixed(1)}`,
          ratingBoxX + ratingBoxW / 2,
          ratingBoxY + ratingBoxH / 2,
        );
        ctx.textBaseline = "alphabetic";
      }
    }

    // 7. Pie de Tarjeta
    const footerY = 1755;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(
      isGaming
        ? "Gamer • Conectado con RAWG & Metacritic"
        : "Cinephile • Pasión por el Séptimo Arte",
      W / 2,
      footerY,
    );

    ctx.fillStyle = "#9ca3af";
    ctx.font = "24px monospace";
    ctx.fillText(
      user.username ? `atlas.app/u/${user.username}` : "atlas.app",
      W / 2,
      footerY + 45,
    );

    ctx.fillStyle = isGaming
      ? "rgba(168, 85, 247, 0.9)"
      : "rgba(245, 158, 11, 0.9)";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("Hecho con pasión por Guacamole", W / 2, footerY + 85);

    const generated = canvas.toDataURL("image/png");
    setDataUrl(generated);
    setIsGenerating(false);
  };

  const drawStatBox = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    sub: string,
    accentColor: string,
  ) => {
    ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 24);
      ctx.fill();
      ctx.stroke();
    }

    // Etiqueta superior
    ctx.fillStyle = accentColor;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 32, y + 46);

    // Número / Valor Principal (Mucho más grande y visible: 92px bold)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 92px sans-serif";
    ctx.fillText(value, x + 32, y + 140);

    // Subtítulo informativo
    ctx.fillStyle = "rgba(156, 163, 175, 0.9)";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(sub, x + 32, y + 192);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        drawCard();
      }, 100);
    }
  }, [isOpen, universe, topItems]);

  const handleDownload = () => {
    if (!dataUrl) return;
    sounds.success();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = isGaming
      ? `gamer-wrapped-${user.username || "perfil"}.png`
      : `cinephile-wrapped-${user.username || "perfil"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("¡Tarjeta descargada con éxito!");
  };

  const handleShare = async () => {
    sounds.coin();
    const fileName = isGaming ? "gamer-wrapped.png" : "cinephile-wrapped.png";
    const shareTitle = isGaming
      ? `Gamer Wrapped de ${user.displayName}`
      : `Cinephile Wrapped de ${user.displayName}`;
    const shareText = isGaming
      ? `¡Mira mis estadísticas gamer en Atlas! #Atlas #Gaming #Videojuegos`
      : `¡Mira mis estadísticas de cine y series en Atlas! #Atlas #Cine #Peliculas`;

    if (navigator.share && dataUrl) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, {
          type: "image/png",
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files: [file],
          });
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (navigator.clipboard) {
      const url = `${window.location.origin}/u/${user.username || ""}`;
      navigator.clipboard.writeText(url);
      toast.success("Enlace a tu perfil copiado al portapapeles");
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={() => {
        sounds.modalClose();
        onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[95vh] rounded-3xl bg-cine-950 border border-cine-800 p-5 sm:p-7 shadow-2xl flex flex-col relative overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            sounds.modalClose();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-cine-900 text-cine-400 hover:text-white hover:bg-cine-800 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isGaming
                ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
                : "bg-amber-500/20 text-amber-400 border-amber-500/40"
            }`}
          >
            {isGaming ? (
              <Gamepad2 className="w-5 h-5" />
            ) : (
              <Film className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {isGaming ? "Gamer Wrapped" : "Cinephile Wrapped"}
            </h3>
            <p className="text-xs text-cine-400">
              {isGaming
                ? "Tarjeta de hazañas gamer lista para Instagram, X y Discord."
                : "Tarjeta de cinefilia lista para historias de Instagram, X y WhatsApp."}
            </p>
          </div>
        </div>

        {/* Vista previa en miniatura del Canvas */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center py-2 bg-cine-900/40 rounded-2xl border border-cine-800/80 my-2 relative">
          <canvas ref={canvasRef} className="hidden" />

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center p-12 text-cine-400 gap-3">
              <Loader2
                className={`w-8 h-8 animate-spin ${
                  isGaming ? "text-purple-400" : "text-amber-400"
                }`}
              />
              <span className="text-sm font-medium">
                Generando tu tarjeta con Top 3 y telemetría...
              </span>
            </div>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt="Atlas Wrapped"
              className="max-h-[55vh] rounded-xl shadow-2xl border border-cine-700/80 object-contain"
            />
          ) : null}
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-2">
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className={`py-3 px-5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isGaming
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "bg-amber-500 hover:bg-amber-400 text-cine-950 shadow-gold-glow"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Descargar Imagen (PNG)</span>
          </button>
          <button
            onClick={handleShare}
            disabled={!dataUrl}
            className={`py-3 px-5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isGaming
                ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir en Redes</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
