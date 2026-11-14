"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Si se está restaurando una posición guardada al volver a recomendaciones, no resetear a (0, 0)
      const hasSavedScroll =
        sessionStorage.getItem("recs_scroll_pos") ||
        sessionStorage.getItem("recs_last_clicked_id") ||
        sessionStorage.getItem("game_recs_scroll_pos") ||
        sessionStorage.getItem("game_recs_last_clicked_id");

      if (hasSavedScroll && pathname.includes("/recommendations")) {
        return;
      }

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      });
    }
  }, [pathname]);

  return null;
}
