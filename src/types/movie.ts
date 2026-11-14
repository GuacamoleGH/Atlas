export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface MovieSearchResult {
  id: number;
  title: string;
  originalTitle?: string;
  year?: number;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  voteAverage: number;
  popularity?: number;
  voteCount?: number;
}

export interface MovieDetail {
  id: string; // Internal DB id or string TMDB id
  tmdbId: number;
  imdbId: string | null;
  title: string;
  originalTitle: string | null;
  originalLanguage?: string | null;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  runtime: number | null;
  genres: string[];
  director: string | null;
  directorImage: string | null;
  cast: CastMember[];
  imdbRating: number | null;
  streamingPlatforms?: string[];
  masterHubScore?: number | null;
  masterHubVotes?: number;
  masterHubDistribution?: number[];
  communityReviews?: any[];
  userMovie?: {
    id: string;
    status: "WATCHLIST" | "WATCHED";
    userRating: number | null;
    review: string | null;
    watchedDate: string | null;
    platform: string | null;
    ballKnowledge: number | null;
    difference: number | null;
  } | null;
}

export interface UserMovieItem {
  id: string;
  movieId: string;
  status: "WATCHLIST" | "WATCHED";
  userRating: number | null;
  review: string | null;
  watchedDate: string | null;
  platform: string | null;
  ballKnowledge: number | null;
  difference: number | null;
  createdAt: string;
  movie: {
    id: string;
    tmdbId: number;
    title: string;
    originalTitle: string | null;
    year: number | null;
    posterPath: string | null;
    backdropPath: string | null;
    genres: string[];
    runtime: number | null;
    director: string | null;
    imdbRating: number | null;
    streamingPlatforms?: string[];
  };
}

export interface CinephileRank {
  title: string;
  minLevel: number;
  maxLevel: number;
  icon: string;
  color: string;
}

export interface ProfileStats {
  totalWatched: number;
  totalWatchlist: number;
  totalReviews: number;
  averageRating: number | null;
  averageImdbRating: number | null;
  globalBallKnowledge: number | null;
  averageDifference: number | null;
  totalXp: number;
  level: number;
  rankTitle: string;
  rankIcon: string;
  rankColor: string;
  nextLevelXp: number;
  currentLevelBaseXp: number;
  xpProgressPercent: number;
  topGenre: string | null;
  highestRatedMovie: {
    title: string;
    posterPath: string | null;
    userRating: number;
  } | null;
  lowestRatedMovie: {
    title: string;
    posterPath: string | null;
    userRating: number;
  } | null;
  biggestW: {
    title: string;
    posterPath: string | null;
    userRating: number;
    imdbRating: number;
    ballKnowledge: number;
    diff: number;
  } | null;
  biggestL: {
    title: string;
    posterPath: string | null;
    userRating: number;
    imdbRating: number;
    ballKnowledge: number;
    diff: number;
  } | null;
  ratingDistribution: {
    rating: number;
    count: number;
    movies?: number;
    series?: number;
  }[];
  genreCounts: { genre: string; count: number; avgRating: number }[];
  watchesByMonth: { month: string; count: number }[];
  decadesCount: { decade: string; count: number }[];
}
