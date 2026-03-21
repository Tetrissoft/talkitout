// Application configuration
// Development: VITE_API_URL=http://localhost:3001/api (from .env)
// Production:  VITE_API_URL=/api (relative, Nginx proxies to backend)

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  env: import.meta.env.VITE_ENV || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
