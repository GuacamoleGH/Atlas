/**
 * Configuración y constantes del motor de recomendaciones del Gamer Hub
 */

// Pesos del algoritmo ponderado
export const WEIGHTS = {
  wG: 0.20, // Géneros (G)
  wM: 0.22, // Sagas y similitud con semillas (M)
  wT: 0.20, // Tags y mecánicas finas (T)
  wD: 0.10, // Desarrolladores y editores (D)
  wQ: 0.13, // Consenso y calidad crítica (Q)
  wP: 0.08, // Plataformas activas del usuario (P)
  wY: 0.07, // Época y duración de juego (Y)
};

// Límite de contribución por dimensión para evitar saturación
export const MAX_DIMENSION_CONTRIBUTION = 0.45;

// Tags genéricos de Steam/RAWG a filtrar (no aportan señal de diseño o gameplay)
export const GENERIC_TAGS_TO_IGNORE = new Set([
  "steam-achievements",
  "full-controller-support",
  "steam-trading-cards",
  "steam-cloud",
  "partial-controller-support",
  "stats",
  "steam-leaderboards",
  "trackpad-support",
  "remote-play-on-phone",
  "remote-play-on-tablet",
  "remote-play-on-tv",
  "remote-play-together",
  "captions-available",
  "commentary-available",
  "includes-source-sdk",
  "mods",
  "hdr-available",
  "vr-support",
  "native-steam-controller-support",
  "family-sharing",
  "cross-platform-multiplayer",
]);

/**
 * Mapeo centralizado de plataformas de Atlas a IDs numéricos de RAWG (verificados contra /platforms)
 */
export const ATLAS_TO_RAWG_PLATFORMS: Record<string, number[]> = {
  // PC & Tiendas
  "pc-steam": [4],
  "pc-epic": [4],
  "pc-gog": [4],
  "pc-gamepass": [4],
  "pc-battlenet": [4],
  "pc": [4],
  "steam-deck": [4],

  // PlayStation
  "ps5": [187],
  "ps4": [18],
  "ps3": [16],
  "ps2": [15],
  "ps1": [27],
  "psp": [17],
  "psvita": [19],

  // Xbox
  "xbox-series": [186],
  "xbox-one": [1],
  "xbox-360": [14],
  "xbox-original": [80],

  // Nintendo
  "switch": [7],
  "wii-u": [10],
  "wii": [11],
  "gamecube": [105],
  "n64": [83],
  "ds-3ds": [8, 9],
  "gba": [24, 43, 26, 79, 49],

  // Emulación (incluye PC y retro general)
  "emulador": [4, 15, 27, 83, 79, 49, 24, 105],
};

/**
 * Nombres amigables para plataformas de RAWG
 */
export const RAWG_PLATFORM_NAMES: Record<number, string> = {
  4: "PC",
  187: "PlayStation 5",
  18: "PlayStation 4",
  16: "PlayStation 3",
  15: "PlayStation 2",
  27: "PlayStation 1",
  19: "PS Vita",
  17: "PSP",
  186: "Xbox Series X/S",
  1: "Xbox One",
  14: "Xbox 360",
  80: "Xbox Clásica",
  7: "Nintendo Switch",
  10: "Wii U",
  11: "Nintendo Wii",
  105: "GameCube",
  83: "Nintendo 64",
  8: "Nintendo 3DS",
  9: "Nintendo DS",
  24: "Game Boy Advance",
  43: "Game Boy Color",
  26: "Game Boy",
  79: "SNES",
  49: "NES",
};

/**
 * Traduce una lista de IDs de plataforma de Atlas a IDs de RAWG
 */
export function mapAtlasPlatformsToRawg(atlasPlatformIds: string[]): number[] {
  const result = new Set<number>();
  for (const plat of atlasPlatformIds) {
    const rawgIds = ATLAS_TO_RAWG_PLATFORMS[plat.toLowerCase().trim()];
    if (rawgIds) {
      rawgIds.forEach((id) => result.add(id));
    } else {
      // Intento por heurística de texto
      const clean = plat.toLowerCase();
      if (clean.includes("pc") || clean.includes("steam") || clean.includes("windows")) result.add(4);
      if (clean.includes("ps5") || clean.includes("playstation 5")) result.add(187);
      if (clean.includes("ps4") || clean.includes("playstation 4")) result.add(18);
      if (clean.includes("switch")) result.add(7);
      if (clean.includes("series") || clean.includes("xbox")) result.add(186);
    }
  }
  return Array.from(result);
}
