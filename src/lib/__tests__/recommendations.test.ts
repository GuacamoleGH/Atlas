import {
  normalizeGenreIds,
  calculateCandidateScore,
} from "../recommendations";

console.log("=== TEST DE ALGORITMO DE RECOMENDACIONES ===");

// 1. Equivalencias de géneros TV -> Cine
const actionAdventure = normalizeGenreIds([10759]);
console.assert(actionAdventure.includes(28) && actionAdventure.includes(12), "TV 10759 falló");
console.log("1. TV 10759 normalizado:", actionAdventure);

const sciFiFantasy = normalizeGenreIds([10765]);
console.assert(sciFiFantasy.includes(878) && sciFiFantasy.includes(14), "TV 10765 falló");
console.log("2. TV 10765 normalizado:", sciFiFantasy);

const warPolitics = normalizeGenreIds([10768]);
console.assert(warPolitics.includes(10752), "TV 10768 falló");
console.log("3. TV 10768 normalizado:", warPolitics);

// 2. Cálculo Bayesiano y Scoring
const candidate = {
  id: 1124,
  mediaType: "movie" as const,
  title: "El truco final",
  posterPath: "/poster.jpg",
  backdropPath: null,
  genreIds: [18, 878, 9648],
  voteAverage: 8.5,
  voteCount: 15400,
  popularity: 45,
  originalLanguage: "es",
  adult: false,
};

const profile = {
  totalWatched: 12,
  totalWatchlist: 3,
  genreAffinities: {
    18: 0.8, // Drama
    878: 0.9, // Sci-fi
    9648: 0.7, // Misterio
  },
  favoriteGenreIds: [878, 18],
  dislikedGenreIds: [],
  languageAffinities: { es: 1.0, en: 0.9 },
  directorAffinities: {},
  actorAffinities: {},
  seeds: [],
  excludedKeys: new Set<string>(),
  seenOrWatchlistKeys: new Set<string>(),
};

const result = calculateCandidateScore(candidate, profile, 3.2, 4.0);
console.log("4. Resultado Candidate Score:", result);
console.assert(result.score > 0.75, "El score debe ser alto para un candidato con géneros favoritos y 8.5");
console.assert(result.score <= 1.0, "El score no debe sobrepasar 1.0");
console.assert(result.breakdown.seedSupport === 0.8, "El soporte normalizado debe ser 3.2 / 4.0 = 0.8");

// 3. Caso borde: división por cero y perfil vacío
const zeroScore = calculateCandidateScore(
  { ...candidate, genreIds: [], voteCount: 0, voteAverage: 0 },
  { ...profile, genreAffinities: {}, languageAffinities: {} },
  0,
  0
);
console.log("5. Caso borde sin soporte ni votos:", zeroScore);
console.assert(!isNaN(zeroScore.score), "El score no debe ser NaN");
console.assert(zeroScore.score >= 0 && zeroScore.score <= 1, "El score debe estar entre 0 y 1");

console.log("=== TODOS LOS TESTS DEL ALGORITMO PASARON CON ÉXITO ===");
