/**
 * Configurazione centralizzata per host, porte e URLs
 *
 * Questo modulo centralizza tutte le configurazioni relative agli host
 * e agli URLs dell'applicazione, in modo che non sia necessario duplicare
 * queste informazioni in più file.
 */

// Configurazione base dell'host
export const HOST_IP = import.meta.env.VITE_HOST_IP || "10.0.0.129";
export const HOST_DOMAIN = import.meta.env.VITE_HOST_DOMAIN || "localhost";

// Configurazione HTTPS
export const USE_HTTPS = import.meta.env.VITE_USE_HTTPS === "true" || true;
export const HTTPS_PORT = parseInt(import.meta.env.VITE_HTTPS_PORT || "5173");
export const HTTP_PORT = parseInt(import.meta.env.VITE_HTTP_PORT || "5174");

// Configurazione API Backend
export const API_HTTPS_PORT = parseInt(
  import.meta.env.VITE_API_HTTPS_PORT || "3443",
);
export const API_HTTP_PORT = parseInt(
  import.meta.env.VITE_API_HTTP_PORT || "3001",
);

// URLs dell'API
export const API_BASE_URL = USE_HTTPS
  ? `https://${HOST_IP}:${API_HTTPS_PORT}/api`
  : `http://${HOST_IP}:${API_HTTP_PORT}/api`;

export const API_HTTP_URL = `http://${HOST_IP}:${API_HTTP_PORT}/api`;
export const API_HTTPS_URL = `https://${HOST_IP}:${API_HTTPS_PORT}/api`;

// URLs del Frontend
export const FRONTEND_URL = USE_HTTPS
  ? `https://${HOST_IP}:${HTTPS_PORT}`
  : `http://${HOST_IP}:${HTTP_PORT}`;

export const FRONTEND_HTTP_URL = `http://${HOST_IP}:${HTTP_PORT}`;
export const FRONTEND_HTTPS_URL = `https://${HOST_IP}:${HTTPS_PORT}`;

// URLs WebSocket
export const WS_URL = USE_HTTPS
  ? `wss://${HOST_IP}:${API_HTTPS_PORT}`
  : `ws://${HOST_IP}:${API_HTTP_PORT}`;

// Log configurazione
console.log("Host configuration loaded:");
console.log("- Host IP:", HOST_IP);
console.log("- Host Domain:", HOST_DOMAIN);
console.log("- HTTPS Enabled:", USE_HTTPS);
console.log("- API URL:", API_BASE_URL);
console.log("- Frontend URL:", FRONTEND_URL);

// Funzioni helper
export function getUrl(path, useHttps = USE_HTTPS) {
  return useHttps
    ? `https://${HOST_IP}:${API_HTTPS_PORT}${path}`
    : `http://${HOST_IP}:${API_HTTP_PORT}${path}`;
}

export function getApiUrl(endpoint, useHttps = USE_HTTPS) {
  return useHttps
    ? `https://${HOST_IP}:${API_HTTPS_PORT}/api${endpoint}`
    : `http://${HOST_IP}:${API_HTTP_PORT}/api${endpoint}`;
}

export function getFrontendUrl(path = "", useHttps = USE_HTTPS) {
  const baseUrl = useHttps
    ? `https://${HOST_IP}:${HTTPS_PORT}`
    : `http://${HOST_IP}:${HTTP_PORT}`;

  return path ? `${baseUrl}/${path}` : baseUrl;
}

// Esporta tutto come oggetto per comodità
export default {
  HOST_IP,
  HOST_DOMAIN,
  USE_HTTPS,
  HTTPS_PORT,
  HTTP_PORT,
  API_HTTPS_PORT,
  API_HTTP_PORT,
  API_BASE_URL,
  API_HTTP_URL,
  API_HTTPS_URL,
  FRONTEND_URL,
  FRONTEND_HTTP_URL,
  FRONTEND_HTTPS_URL,
  WS_URL,
  getUrl,
  getApiUrl,
  getFrontendUrl,
};
