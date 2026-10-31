"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession, signOut } from "next-auth/react";
import {
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Loader2,
  X,
  Lock,
  Gamepad2,
  Film,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastContext";
import { sounds } from "@/lib/sounds";

interface WipeoutDangerZoneProps {
  onDataWiped?: () => void;
  universe?: "CINE" | "GAMING";
}

export function WipeoutDangerZone({
  onDataWiped,
  universe = "CINE",
}: WipeoutDangerZoneProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [typedWord, setTypedWord] = useState("");
  const [deleteAccount, setDeleteAccount] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const canExecute =
    confirmedCheck && typedWord.trim() === "ELIMINAR" && !isWiping;

  const handleOpen = () => {
    sounds.modalOpen();
    setConfirmedCheck(false);
    setTypedWord("");
    setDeleteAccount(false);
    setErrorMessage(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    sounds.modalClose();
    setIsOpen(false);
    setConfirmedCheck(false);
    setTypedWord("");
    setDeleteAccount(false);
    setErrorMessage(null);
  };

  const isGaming = universe === "GAMING";

  const handleWipeout = async () => {
    if (!canExecute) return;

    setIsWiping(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/profile/wipeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationWord: typedWord.trim(),
          deleteAccount,
          universe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al purgar los datos");
      }

      sounds.delete();

      toast({
        type: "success",
        title: isGaming
          ? "Wipeout Gamer completado"
          : "Wipeout Cinéfilo completado",
        description:
          data.message ||
          "Tus registros han sido purgados correctamente de la base de datos.",
      });

      handleClose();

      if (deleteAccount) {
        setTimeout(() => {
          signOut({ callbackUrl: "/" });
        }, 1200);
      } else {
        if (onDataWiped) {
          onDataWiped();
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      sounds.pop();
      setErrorMessage(err.message || "Ocurrió un problema inesperado");
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <>
      {/* Tarjeta de Zona de Peligro al pie del perfil */}
      <section className="glass-panel p-6 sm:p-7 rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/20 via-cine-900/60 to-cine-950/80 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Zona de Peligro
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  {isGaming ? "Wipeout Gamer" : "Wipeout Cinéfilo"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cine-400 max-w-4xl leading-relaxed">
                {isGaming ? (
                  <>
                    Purgar de forma permanente todos los registros de
                    videojuegos de tu cuenta (horas jugadas, backlog,
                    completados, platinos, notas y críticas gamer).{" "}
                    <span className="text-cine-300 font-semibold">
                      Tus películas y series de Televisión permanecerán
                      intactas.
                    </span>
                  </>
                ) : (
                  <>
                    Purgar de forma permanente todas las películas y series
                    registradas de tu cuenta (visionados, watchlist, notas y
                    críticas de cine).{" "}
                    <span className="text-cine-300 font-semibold">
                      Tus videojuegos, horas y logros de Juegos permanecerán
                      intactos.
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleOpen}
              disabled={!session?.user}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                session?.user
                  ? "bg-red-500/10 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500 hover:shadow-red-600/30 cursor-pointer"
                  : "bg-cine-900 text-cine-600 border border-cine-800 cursor-not-allowed"
              }`}
              title={
                session?.user
                  ? isGaming
                    ? "Abrir asistente de wipeout de videojuegos"
                    : "Abrir asistente de wipeout de cine y series"
                  : "Inicia sesión para gestionar los datos de tu cuenta"
              }
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isGaming
                  ? "Wipeout de videojuegos"
                  : "Wipeout de cine & series"}
              </span>
            </button>
            {!session?.user && (
              <p className="text-[10px] text-cine-500 text-right mt-1">
                Requiere iniciar sesión
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Modal de Múltiples Capas de Seguridad */}
      {isOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg bg-cine-950 border border-red-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-5 animate-scale-up">
              {/* Cabecera del modal */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-cine-800">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                      {deleteAccount
                        ? "Purgar Todos los Datos y Cuenta"
                        : isGaming
                          ? "Confirmar Wipeout de Videojuegos"
                          : "Confirmar Wipeout de Cine & Series"}
                    </h3>
                    <p className="text-xs text-red-400/90 font-mono leading-tight mt-0.5">
                      {deleteAccount
                        ? "Eliminación total de cuenta • Cierre de sesión inmediato"
                        : "Acción destructiva permanente"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isWiping}
                  className="p-1.5 rounded-lg text-cine-400 hover:text-white hover:bg-cine-800 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Capa 1: Desglose específico de lo que se destruirá */}
              <div className="bg-red-950/30 border border-red-500/20 rounded-2xl p-4 text-xs space-y-2.5 text-cine-300">
                <div className="flex items-center gap-2 font-bold text-red-300">
                  <Lock className="w-4 h-4 text-red-400 shrink-0" />
                  <span>
                    Se purgarán los siguientes registros asociados a tu cuenta (
                    <strong className="font-mono text-white font-semibold">
                      {session?.user?.email ||
                        session?.user?.name ||
                        "tu perfil"}
                    </strong>
                    ):
                  </span>
                </div>

                {deleteAccount ? (
                  <ul className="list-disc pl-5 space-y-1.5 text-cine-400">
                    <li>
                      <strong className="text-red-300">
                        Catálogo de Cine & Series:
                      </strong>{" "}
                      Películas y series vistas, pendientes, notas y críticas en
                      Cinephile.
                    </li>
                    <li>
                      <strong className="text-red-300">
                        Biblioteca de Videojuegos:
                      </strong>{" "}
                      Horas registradas, títulos, backlog, completados, platinos
                      y críticas en Juegos.
                    </li>
                    <li className="text-rose-400 font-medium">
                      <strong className="text-rose-300">
                        Cuenta de Usuario & Sesión:
                      </strong>{" "}
                      Tu cuenta se eliminará por completo de la base de datos y
                      se cerrará tu sesión de inmediato.
                    </li>
                  </ul>
                ) : isGaming ? (
                  <ul className="list-disc pl-5 space-y-1.5 text-cine-400">
                    <li>
                      <strong className="text-red-300">
                        Biblioteca de Videojuegos:
                      </strong>{" "}
                      Horas registradas, títulos en progreso, backlog,
                      completados, platinos y críticas personales.
                    </li>
                    <li className="text-emerald-400/90 font-medium">
                      <strong className="text-emerald-300">
                        Televisión Intacto:
                      </strong>{" "}
                      Todas tus películas y series vistas se conservarán
                      exactamente como están.
                    </li>
                    <li>
                      <strong className="text-cine-200">
                        Ajuste de Experiencia:
                      </strong>{" "}
                      Tu XP total se recalculará manteniendo solo los puntos
                      obtenidos en cine y series.
                    </li>
                  </ul>
                ) : (
                  <ul className="list-disc pl-5 space-y-1.5 text-cine-400">
                    <li>
                      <strong className="text-red-300">
                        Catálogo de Cine & Series:
                      </strong>{" "}
                      Todas las películas y temporadas vistas, lista de
                      pendientes, notas y críticas personales.
                    </li>
                    <li className="text-emerald-400/90 font-medium">
                      <strong className="text-emerald-300">
                        Juegos Intacto:
                      </strong>{" "}
                      Toda tu biblioteca de videojuegos, horas y platinos se
                      conservarán exactamente como están.
                    </li>
                    <li>
                      <strong className="text-cine-200">
                        Ajuste de Experiencia:
                      </strong>{" "}
                      Tu XP total se recalculará manteniendo solo los puntos
                      obtenidos en videojuegos.
                    </li>
                  </ul>
                )}
              </div>

              {/* Capa 2: Checkbox de consentimiento consciente */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-cine-900/60 border border-cine-800 hover:border-red-500/30 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmedCheck}
                  onChange={(e) => {
                    sounds.switch();
                    setConfirmedCheck(e.target.checked);
                  }}
                  disabled={isWiping}
                  className="rounded border-cine-700 text-red-600 focus:ring-red-500 h-4 w-4 bg-cine-800 shrink-0 cursor-pointer"
                />
                <span className="text-xs text-cine-300 leading-normal">
                  He leído las advertencias y comprendo que esta eliminación de{" "}
                  <strong className="text-white">
                    {deleteAccount
                      ? "mi cuenta completa y todos mis datos"
                      : isGaming
                        ? "datos de videojuegos"
                        : "datos de cine y series"}
                  </strong>{" "}
                  es{" "}
                  <strong className="text-white">
                    definitiva e irreversible
                  </strong>
                  .
                </span>
              </label>

              {/* Capa 3: Escribir obligatoriamente la palabra ELIMINAR */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-cine-300 block">
                  Escribe la palabra{" "}
                  <span className="font-mono font-bold text-red-400">
                    ELIMINAR
                  </span>{" "}
                  en mayúsculas para confirmar:
                </label>
                <input
                  type="text"
                  value={typedWord}
                  onChange={(e) => setTypedWord(e.target.value)}
                  disabled={isWiping}
                  placeholder="ELIMINAR"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-xl bg-cine-900 border border-cine-700/80 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm font-mono text-white placeholder-cine-600 outline-none transition-all tracking-wider"
                />
                {typedWord && typedWord !== "ELIMINAR" && (
                  <p className="text-[11px] text-amber-400/90 font-mono">
                    Escribe exactamente "ELIMINAR" (todo en mayúsculas).
                  </p>
                )}
              </div>

              {/* Opción adicional: Eliminar también la cuenta completa */}
              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-cine-900/30 border border-cine-800/80 hover:border-cine-700 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteAccount}
                  onChange={(e) => {
                    sounds.switch();
                    setDeleteAccount(e.target.checked);
                  }}
                  disabled={isWiping}
                  className="rounded border-cine-700 text-red-600 focus:ring-red-500 h-4 w-4 bg-cine-800 shrink-0 cursor-pointer"
                />
                <span className="text-xs text-cine-400 leading-normal">
                  Eliminar también mi cuenta de usuario y cerrar sesión
                  automáticamente
                </span>
              </label>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-xs text-red-300">
                  {errorMessage}
                </div>
              )}

              {/* Botones de acción centrados */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isWiping}
                  className="px-5 py-2.5 rounded-xl bg-cine-900 hover:bg-cine-800 text-cine-300 hover:text-white border border-cine-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleWipeout}
                  disabled={!canExecute}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg ${
                    canExecute
                      ? "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-600/40 cursor-pointer animate-pulse"
                      : "bg-cine-900 text-cine-600 border border-cine-800 cursor-not-allowed opacity-60"
                  }`}
                >
                  {isWiping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Purgando registros...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>
                        {deleteAccount
                          ? "Eliminar Cuenta y Todos los Datos"
                          : isGaming
                            ? "Purgar Catálogo de Videojuegos"
                            : "Purgar Catálogo de Cine & Series"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
