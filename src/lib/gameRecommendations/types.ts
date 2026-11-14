/**
 * Tipos de datos para el sistema de recomendaciones de videojuegos
 */

export interface GameSeed {
  rawgId: number;
  title: string;
  weight: number;
  genres: string[];
  tags: string[];
  developers: string[];
}

export interface GameTasteProfile {
  genreAffinities: Record<string, number>;
  tagAffinities: Record<string, number>;
  developerAffinities: Record<string, number>;
  publisherAffinities: Record<string, number>;
  seedGames: GameSeed[];
  activePlatformIds: number[];
  activePlatformNames: string[];
  eraPreferences: Record<string, number>; // "1990s", "2000s", "2010s", "2020s"
  avgPreferredPlaytime: number; // en horas
  gameKnowledgeAvg: number; // 0 a 100
  totalGamesCount: number;
  userRatingsCount: number;
  confidence: "baja" | "media" | "alta";
}

export interface ScoredGameCandidate {
  rawgId: number;
  title: string;
  slug: string;
  backgroundImage: string | null;
  released: string | null;
  metacritic: number | null;
  rating: number | null;
  ratingsCount: number;
  genres: string[];
  platforms: { id: number; name: string }[];
  tags: string[];
  developers: string[];
  publishers: string[];
  playtime: number;
  score: number; // 0 - 100
  affinityPercentage: number; // 0 - 100
  breakdown: {
    G: number;
    M: number;
    T: number;
    D: number;
    Q: number;
    P: number;
    Y: number;
  };
  primaryReason: string;
  seedMatch?: string;
  genreMatch?: string;
  statusInAtlas?: string;
  userAtlasId?: string;
}

export interface GameRecommendationRow {
  id: string;
  title: string;
  subtitle: string;
  type: "top" | "seed" | "genre" | "hidden_gems" | "platform" | "backlog";
  items: ScoredGameCandidate[];
}

export interface GameRecommendationsResponse {
  rows: GameRecommendationRow[];
  profile: {
    totalGames: number;
    confidence: "baja" | "media" | "alta";
    topGenres: string[];
    topPlatforms: string[];
    avgKnowledge: number;
  };
  isColdStart: boolean;
  cachedAt: string;
}
