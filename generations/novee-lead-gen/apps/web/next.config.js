/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@novee/shared'],
  serverExternalPackages: ['@supabase/ssr'],
};

module.exports = nextConfig;
