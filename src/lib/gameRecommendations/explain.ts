import { RawgApiGameItem } from "./rawgClient";

export interface ReasonInput {
  breakdown: {
    G: number;
    M: number;
    T: number;
    D: number;
    Q: number;
    P: number;
    Y: number;
  };
  seedMatch?: string;
  genreMatch?: string;
  game: RawgApiGameItem;
}

/**
 * Genera una explicación honesta, concisa y humana del motivo de recomendación
 */
export function generateRecommendationReason(input: ReasonInput): string {
  const { breakdown, seedMatch, genreMatch, game } = input;

  // 1. Si hay coincidencia de saga o semilla fuerte
  if (seedMatch && breakdown.M >= 15) {
    return `Porque jugaste ${seedMatch}`;
  }

  // 2. Si el estudio desarrollador es un factor dominante
  const dev = game.developers?.[0]?.name;
  if (dev && breakdown.D >= 12) {
    return `Del aclamado estudio ${dev}`;
  }

  // 3. Si las mecánicas o tags específicos destacan
  const keyTag = game.tags?.find((t) =>
    ["souls-like", "roguelike", "open-world", "story-rich", "metroidvania", "cyberpunk", "survival-horror"].includes(
      t.slug.toLowerCase()
    )
  );
  if (keyTag && breakdown.T >= 15) {
    return `Por su estilo y temática ${keyTag.name}`;
  }

  // 4. Si el género es el principal conector
  if (genreMatch && breakdown.G >= 15) {
    return `Por tu pasión por los juegos de ${genreMatch}`;
  }

  // 5. Consenso de crítica sobresaliente
  if (game.metacritic && game.metacritic >= 88 && breakdown.Q >= 15) {
    return `Aclamado con ${game.metacritic} en Metacritic`;
  }

  // 6. Plataforma predilecta
  const mainPlat = game.platforms?.[0]?.platform?.name;
  if (mainPlat && breakdown.P >= 15) {
    return `Muy recomendado para ${mainPlat}`;
  }

  // 7. Genérica de alta afinidad
  if (seedMatch) {
    return `Similar a ${seedMatch}`;
  }

  return "Selección especial para tus gustos";
}
