// Application configuration

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  env: import.meta.env.VITE_ENV || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
