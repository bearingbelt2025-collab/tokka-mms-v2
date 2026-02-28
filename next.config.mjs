/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://lrrdswtxahplctjqavwf.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycmRzd3R4YWhwbGN0anFhdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTk2OTcsImV4cCI6MjA4Nzc5NTY5N30.AbBf7oRwG5L5XYFVxAnYx4PvqaWY3aFGzAt7LCbZv2E',
  },
};

export default nextConfig;
