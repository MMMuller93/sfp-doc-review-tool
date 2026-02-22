/**
 * Application configuration.
 * Uses Vite env vars (VITE_*) with sensible defaults for development.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
