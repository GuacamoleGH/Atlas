"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Image,
  FileText,
  Loader2,
  Check,
  Film,
  Sparkles,
  Bookmark,
  Globe,
  Lock,
  Upload,
  Camera,
  Trash2,
} from "lucide-react";
import { PRESET_AVATARS } from "@/lib/avatars";
import { sounds } from "@/lib/sounds";
import { useSession } from "next-auth/react";

interface EditCinephileProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialName: string;
  initialBio: string | null;
  initialAvatar: string | null;
  initialIsWatchlistPublic?: boolean;
}

export default function EditCinephileProfileModal({
  isOpen,
  onClose,
  onSaved,
  initialName,
  initialBio,
  initialAvatar,
  initialIsWatchlistPublic = true,
}: EditCinephileProfileModalProps) {
  const { data: session, update } = useSession();
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(initialBio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || "");
  const [isWatchlistPublic, setIsWatchlistPublic] = useState(
    initialIsWatchlistPublic,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(initialName);
      setBio(initialBio || "");
      setAvatarUrl(initialAvatar || "");
      setIsWatchlistPublic(initialIsWatchlistPublic);
      setUploadError(null);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    isOpen,
    initialName,
    initialBio,
    initialAvatar,
    initialIsWatchlistPublic,
  ]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Permitir volver a seleccionar el mismo archivo si es necesario
    e.target.value = "";

    // 1. Validación de cliente de formato
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedMimes.includes(file.type.toLowerCase())) {
      setUploadError(
        "Formato no permitido. Solo se admiten imágenes JPG, PNG, WEBP o GIF.",
      );
      sounds.delete();
      return;
    }

    // 2. Validación de cliente de tamaño (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("La imagen supera el límite de 5 MB.");
      sounds.delete();
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al subir la imagen");
      }

      setAvatarUrl(json.url);
      sounds.star();
      if (update) {
        await update({ image: json.url });
      }
    } catch (err: any) {
      console.error("Error al subir avatar:", err);
      setUploadError(err.message || "Error al subir la imagen al servidor.");
      sounds.delete();
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !mounted || !session?.user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          isWatchlistPublic,
        }),
      });

      if (res.ok) {
        if (update) {
          await update({
            name: displayName.trim(),
            image: avatarUrl.trim() || null,
          });
        }
        sounds.playSuccess();
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error("Error al actualizar perfil cinéfilo:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl border border-amber-500/30 overflow-hidden shadow-2xl bg-cine-950/95 flex flex-col max-h-[92vh]">
        {/* Cabecera fija */}
        <div className="p-4 sm:p-5 border-b border-cine-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-gold-glow">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Editar Perfil Cinéfilo
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-cine-400 hover:text-white hover:bg-cine-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Cuerpo con scroll solo si la pantalla es muy reducida */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
            {/* Nombre de usuario */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Nombre de Cinéfilo
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre o alias cinéfilo..."
                required
                className="w-full px-3.5 py-2 bg-cine-900 border border-cine-700 rounded-xl text-sm text-white placeholder-cine-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Avatar & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-amber-400" /> Avatar de Perfil
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setAvatarUrl("");
                    }}
                    className="text-[10px] text-cine-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Quitar avatar"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Quitar foto</span>
                  </button>
                )}
              </div>

              {/* Input oculto para subida segura de archivo */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Vista previa y controles de subida / URL */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className="relative group/avatar-edit w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500 shadow-gold-glow flex-shrink-0 bg-cine-900 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                  title="Haz clic para subir una foto desde tu dispositivo"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-cine-500" />
                  )}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/avatar-edit:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-300">
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-bold">Subir</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir Foto</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-cine-400 truncate">
                      JPG, PNG, WebP (máx. 5 MB)
                    </span>
                  </div>

                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setUploadError(null);
                    }}
                    placeholder="O pega una URL externa..."
                    className="w-full px-3 py-1.5 bg-cine-900 border border-cine-700 rounded-xl text-xs text-white placeholder-cine-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {uploadError && (
                <p className="text-[11px] text-rose-400 font-medium bg-rose-500/10 border border-rose-500/30 px-2.5 py-1.5 rounded-xl animate-fade-in">
                  {uploadError}
                </p>
              )}

              {/* Presets en tira horizontal compacta (sin ocupar 240px verticales) */}
              <div className="space-y-1 pt-0.5">
                <span className="text-[10px] text-cine-500 block">
                  O elige un avatar predeterminado:
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  {PRESET_AVATARS.map((av) => {
                    const isSelected = avatarUrl === av.dataUrl;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          sounds.star();
                          setAvatarUrl(av.dataUrl);
                        }}
                        title={av.name}
                        className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shrink-0 flex items-center justify-center bg-cine-950 cursor-pointer ${
                          isSelected
                            ? "border-amber-500 shadow-gold-glow scale-105"
                            : "border-cine-800 hover:border-amber-500/50"
                        }`}
                      >
                        <img
                          src={av.dataUrl}
                          alt={av.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Biografía */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Biografía Cinéfila
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Explorador y crítico del séptimo arte..."
                className="w-full px-3.5 py-2 bg-cine-900 border border-cine-700 rounded-xl text-xs text-white placeholder-cine-500 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* Visibilidad de Watchlist */}
            <div className="p-3 rounded-2xl bg-cine-900/90 border border-cine-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Visibilidad de Watchlist
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sounds.switch();
                    setIsWatchlistPublic(!isWatchlistPublic);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isWatchlistPublic
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/40"
                  }`}
                >
                  {isWatchlistPublic ? (
                    <>
                      <Globe className="w-3 h-3" />
                      <span>Pública</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Privada</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-cine-400 leading-tight">
                {isWatchlistPublic
                  ? "Tus amigos y visitantes pueden ver los títulos pendientes en tu perfil."
                  : "Tu watchlist es privada. Solo tú puedes ver tus títulos pendientes."}
              </p>
            </div>
          </div>

          {/* Barra inferior fija: NUNCA requiere scroll para pulsar Guardar Cambios */}
          <div className="p-3.5 sm:px-6 border-t border-cine-800 bg-cine-950 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-cine-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-gold-glow flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
