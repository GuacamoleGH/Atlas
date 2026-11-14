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
  Gamepad2,
  Globe,
  Lock,
  Bookmark,
  Upload,
  Camera,
  Trash2,
} from "lucide-react";
import { PRESET_AVATARS } from "@/lib/avatars";
import { sounds } from "@/lib/sounds";
import { useSession } from "next-auth/react";

interface EditGamerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialName: string;
  initialBio: string | null;
  initialAvatar: string | null;
  initialIsBacklogPublic?: boolean;
}

export default function EditGamerProfileModal({
  isOpen,
  onClose,
  onSaved,
  initialName,
  initialBio,
  initialAvatar,
  initialIsBacklogPublic = true,
}: EditGamerProfileModalProps) {
  const { data: session, update } = useSession();
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(initialBio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || "");
  const [isBacklogPublic, setIsBacklogPublic] = useState(
    initialIsBacklogPublic,
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
      setIsBacklogPublic(initialIsBacklogPublic);
      setUploadError(null);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialName, initialBio, initialAvatar, initialIsBacklogPublic]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Permitir volver a seleccionar el mismo archivo si se desea
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
      console.error("Error al subir avatar gamer:", err);
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
      const res = await fetch("/api/games/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          isBacklogPublic,
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
      console.error("Error al actualizar perfil gamer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl border border-purple-500/30 overflow-hidden shadow-2xl bg-cine-950/95 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-6 border-b border-cine-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Editar Perfil Gamer
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-cine-400 hover:text-white hover:bg-cine-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Nombre de usuario */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" /> Nombre de Jugador
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu alias o gamertag..."
              required
              className="w-full px-3.5 py-2.5 bg-cine-900 border border-cine-700 rounded-xl text-sm text-white placeholder-cine-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Avatar & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-cyan-400" /> Avatar de Perfil
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
                className="relative group/avatar-edit w-14 h-14 rounded-2xl overflow-hidden border-2 border-purple-500 shadow-md flex-shrink-0 bg-cine-900 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
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
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/avatar-edit:opacity-100 transition-opacity flex flex-col items-center justify-center text-cyan-300">
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
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
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
                  className="w-full px-3 py-1.5 bg-cine-900 border border-cine-700 rounded-xl text-xs text-white placeholder-cine-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {uploadError && (
              <p className="text-[11px] text-rose-400 font-medium bg-rose-500/10 border border-rose-500/30 px-2.5 py-1.5 rounded-xl animate-fade-in">
                {uploadError}
              </p>
            )}

            <span className="text-[10px] text-cine-500 block pt-1">
              O elige un avatar predeterminado:
            </span>

            {/* Presets */}
            <div className="flex gap-2 pt-1 overflow-x-auto pb-1 scrollbar-thin">
              {PRESET_AVATARS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => {
                    sounds.playClick();
                    setAvatarUrl(preset.dataUrl);
                  }}
                  title={preset.name}
                  className={`relative w-11 h-11 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    avatarUrl === preset.dataUrl
                      ? "border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)] scale-105"
                      : "border-cine-800 hover:border-purple-400"
                  }`}
                >
                  <img
                    src={preset.dataUrl}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                  />
                  {avatarUrl === preset.dataUrl && (
                    <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-cyan-300 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Biografía */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" /> Biografía
              Gamer
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntanos tus géneros favoritos, consolas favoritas, o tu filosofía como jugador..."
              rows={3}
              className="w-full p-3 bg-cine-900 border border-cine-700 rounded-xl text-sm text-cine-200 placeholder-cine-500 focus:outline-none focus:border-purple-400 resize-none"
            />
          </div>

          {/* Visibilidad de Backlog */}
          <div className="p-3.5 rounded-2xl bg-cine-900/90 border border-cine-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">
                  Visibilidad de Backlog
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.switch();
                  setIsBacklogPublic(!isBacklogPublic);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isBacklogPublic
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/40"
                }`}
              >
                {isBacklogPublic ? (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Pública</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Privada</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-cine-400 leading-tight">
              {isBacklogPublic
                ? "Tus amigos y visitantes pueden ver los videojuegos que tienes pendientes en tu perfil público."
                : "Tu backlog es privado. Solo tú puedes ver tus videojuegos pendientes."}
            </p>
          </div>

          {/* Botones */}
          <div className="pt-3 border-t border-cine-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-cine-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-[0_0_12px_rgba(139,92,246,0.4)] flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
