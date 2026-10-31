"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function DynamicFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/games")) {
    return (
      <footer className="border-t border-purple-900/40 bg-cine-950/80 py-6 text-center text-xs text-cine-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-400">Gamer</span>
            <span>•</span>
            <span className="text-cyan-400 font-mono">
              Game Knowledge Engine 🧠
            </span>
          </div>
          <p className="text-cine-500">
            Datos impulsados por{" "}
            <strong className="text-purple-300">RAWG</strong> &{" "}
            <strong className="text-cyan-300">Metacritic</strong>. Hecho por{" "}
            <a
              href="https://github.com/GuacamoleGH"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 hover:text-white font-semibold transition-colors"
            >
              Guacamole
            </a>
            .
          </p>
        </div>
      </footer>
    );
  }

  if (pathname === "/") {
    return (
      <footer className="border-t border-cine-800/80 bg-cine-950/60 py-6 text-center text-xs text-cine-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Atlas" className="w-4 h-4 object-contain rounded" />
            <span className="font-bold text-white">Atlas</span>
            <span>•</span>
            <span className="text-amber-400">Cinephile</span>
            <span>+</span>
            <span className="text-purple-400">Gamer</span>
          </div>
          <p className="text-cine-500">
            Ecosistema de entretenimiento personal. Hecho por{" "}
            <a
              href="https://github.com/GuacamoleGH"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cine-300 hover:text-white font-semibold transition-colors"
            >
              Guacamole
            </a>
            .
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-cine-800/80 bg-cine-950/60 py-6 text-center text-xs text-cine-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-cine-300">Cinephile</span>
          <span>•</span>
          <span>Sofa Knowledge Engine 🛋️</span>
        </div>
        <p className="text-cine-500">
          Datos impulsados por TMDB & OMDb. Hecho por{" "}
          <a
            href="https://github.com/GuacamoleGH"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-300 hover:text-white font-semibold transition-colors"
          >
            Guacamole
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
