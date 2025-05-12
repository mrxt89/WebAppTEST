import configData from './config.json';

const env = import.meta.env.VITE_ENV || 'development';
const envConfig = configData[env];

export const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || envConfig.API_BASE_URL,
  SWEET_ALERT_COLORS: envConfig.SWEET_ALERT_COLORS
};

// Log per debug
console.log('Current environment:', env);
console.log('Using API URL:', config.API_BASE_URL);