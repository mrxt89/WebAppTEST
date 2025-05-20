import configData from "./config.json";
import hostConfig from "./lib/config/host";

const env = import.meta.env.VITE_ENV || "development";
const envConfig = configData[env];

export const config = {
  // Importa tutte le configurazioni di host da hostConfig
  ...hostConfig,

  // Sovrascrive API_BASE_URL solo se definito esplicitamente in .env o config.json
  API_BASE_URL: import.meta.env.VITE_API_URL || hostConfig.API_BASE_URL,

  // Configurazione SweetAlert dai file di configurazione
  SWEET_ALERT_COLORS: envConfig.SWEET_ALERT_COLORS,
};

// Log configurazione
console.log("Application config loaded:");
console.log("Environment:", env);
console.log("API URL:", config.API_BASE_URL);
console.log("Frontend URL:", config.FRONTEND_URL);
