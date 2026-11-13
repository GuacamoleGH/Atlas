/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.rawg.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/tv", destination: "/tv/movies", permanent: true },
      { source: "/movies", destination: "/tv/movies", permanent: true },
      { source: "/series", destination: "/tv/series", permanent: true },
      { source: "/series/:id*", destination: "/tv/series/:id*", permanent: true },
      { source: "/movie/:id*", destination: "/tv/movie/:id*", permanent: true },
      { source: "/profile", destination: "/tv/profile", permanent: true },
      { source: "/watchlist", destination: "/tv/watchlist", permanent: true },
      { source: "/watched", destination: "/tv/watched", permanent: true },
      { source: "/recommendations", destination: "/tv/recommendations", permanent: true },
      { source: "/friends", destination: "/tv/friends", permanent: true },
      { source: "/leaderboard", destination: "/tv/leaderboard", permanent: true },
      { source: "/ranking", destination: "/tv/leaderboard", permanent: true },
      { source: "/reviews", destination: "/tv/reviews", permanent: true },
      { source: "/resenas", destination: "/tv/reviews", permanent: true },
      { source: "/search", destination: "/tv/search", permanent: true },
      { source: "/achievements", destination: "/tv/achievements", permanent: true },
    ];
  },
};

export default nextConfig;
