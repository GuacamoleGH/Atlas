"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Film,
  Gamepad2,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      if (
        urlError === "OAuthCallback" ||
        urlError === "OAuthSignin" ||
        urlError === "Callback"
      ) {
        setError(
          "Error al autenticar con el proveedor (Google/Discord). Si estás en localhost, verifica que 'http://localhost:3000/api/auth/callback/google' (o discord) esté agregada en los Redirect URIs autorizados de tu consola de desarrollador.",
        );
      } else if (urlError === "OAuthAccountNotLinked") {
        setError(
          "Este correo ya está vinculado a otra cuenta o método de inicio de sesión.",
        );
      } else if (urlError === "CredentialsSignin") {
        setError("Usuario o contraseña incorrectos.");
      } else {
        setError(`Error de autenticación (${urlError}).`);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier: identifier.trim(),
        password,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError("Ha ocurrido un error inesperado. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-cine-900/80 backdrop-blur-xl border border-cine-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center gap-2 p-3 bg-cine-800/70 rounded-2xl border border-cine-700/50 mb-4">
              <Film className="w-6 h-6 text-purple-400" />
              <div className="w-1 h-4 bg-cine-700 rounded" />
              <Gamepad2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              Iniciar Sesión
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            </h1>
            <p className="text-xs text-cine-400 mt-1">
              Accede a tu colección personal de cine y videojuegos
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-950/50 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones Sociales (Google y Discord) */}
          <div className="space-y-2.5 mb-6">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full py-2.5 px-4 bg-[#4285F4]/15 hover:bg-[#4285F4]/25 border border-[#4285F4]/40 hover:border-[#4285F4]/70 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-3 transition-all shadow-[0_0_12px_rgba(66,133,244,0.15)] group"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <button
              type="button"
              onClick={() => signIn("discord", { callbackUrl })}
              className="w-full py-2.5 px-4 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 border border-[#5865F2]/40 hover:border-[#5865F2]/70 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-3 transition-all shadow-[0_0_12px_rgba(88,101,242,0.15)] group"
            >
              <svg className="w-4 h-4 fill-[#5865F2]" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Continuar con Discord</span>
            </button>
          </div>

          {/* Divisor */}
          <div className="relative flex items-center justify-center my-6">
            <div className="w-full border-t border-cine-800" />
            <span className="bg-cine-900/90 px-3 text-[11px] text-cine-400 font-mono uppercase tracking-wider absolute">
              o con email / usuario
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-cine-300 mb-1.5">
                Usuario o Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cine-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="tu_usuario o tu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-cine-950/60 border border-cine-800 rounded-xl text-white text-sm placeholder-cine-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-cine-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cine-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-cine-950/60 border border-cine-800 rounded-xl text-white text-sm placeholder-cine-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar a Atlas</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-cine-800/80 text-center">
            <p className="text-xs text-cine-400">
              ¿Aún no tienes cuenta?{" "}
              <Link
                href="/register"
                className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4 transition-colors"
              >
                Crear una cuenta gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
