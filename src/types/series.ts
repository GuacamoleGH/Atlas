import { CastMember } from "./movie";

export interface SeriesSearchResult {
  id: number;
  name: string;
  originalName?: string;
  firstAirYear?: number;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  voteAverage: number;
  popularity?: number;
  voteCount?: number;
}

export interface SeriesDetail {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  name: string;
  originalName: string | null;
  originalLanguage?: string | null;
  firstAirYear: number | null;
  lastAirYear: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  seriesStatus: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  genres: string[];
  creator: string | null;
  creatorImage: string | null;
  cast: CastMember[];
  imdbRating: number | null;
  streamingPlatforms?: string[];
  userSeries?: {
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

export interface UserSeriesItem {
  id: string;
  seriesId: string;
  status: "WATCHLIST" | "WATCHED";
  userRating: number | null;
  review: string | null;
  watchedDate: string | null;
  platform: string | null;
  ballKnowledge: number | null;
  difference: number | null;
  createdAt: string;
  series: {
    id: string;
    tmdbId: number;
    name: string;
    originalName: string | null;
    firstAirYear: number | null;
    lastAirYear: number | null;
    numberOfSeasons: number | null;
    numberOfEpisodes: number | null;
    posterPath: string | null;
    backdropPath: string | null;
    genres: string[];
    creator: string | null;
    imdbRating: number | null;
    streamingPlatforms?: string[];
  };
}
