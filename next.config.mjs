/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.chesscomfiles.com',
      },
      {
        protocol: 'https',
        hostname: 'www.chess.com',
      },
      {
        protocol: 'https',
        hostname: 'lichess1.org',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
