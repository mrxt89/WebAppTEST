import axios from 'axios';
import { config } from '../config';
import { swal } from './common';

const axiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Flag per evitare loop di refresh
let isRefreshing = false;
let failedQueue = [];
let isForceLogoutInProgress = false;

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Funzione per forzare il logout
const forceLogoutFromAxios = async (reason = "Sessione scaduta") => {
  if (isForceLogoutInProgress) return;
  isForceLogoutInProgress = true;

  try {
    // Emetti evento per il logout forzato
    window.dispatchEvent(new CustomEvent("force-logout", { 
      detail: { reason } 
    }));
  } finally {
    isForceLogoutInProgress = false;
  }
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const tokenExpiryTime = localStorage.getItem('tokenExpiryTime');
    
    // Verifica se il token è scaduto prima di fare la richiesta
    if (tokenExpiryTime && Date.now() > parseInt(tokenExpiryTime)) {
      console.log('🔒 Token scaduto prima della richiesta');
      forceLogoutFromAxios("La tua sessione è scaduta. Effettua nuovamente il login.");
      return Promise.reject(new Error('Token expired'));
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor con gestione migliorata
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se è un errore 401 o 403, forza il logout immediato
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔒 Errore di autenticazione ricevuto dal server');
      
      // Se è un errore specifico di token scaduto, prova il refresh
      if (error.response?.status === 401 && 
          error.response?.data?.error === 'TOKEN_EXPIRED' && 
          !originalRequest._retry &&
          !isRefreshing) {
        
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const currentToken = localStorage.getItem('token');
          const response = await axios.post(
            `${config.API_BASE_URL}/refresh-token`,
            {},
            {
              headers: {
                Authorization: `Bearer ${currentToken}`
              }
            }
          );

          const { accessToken } = response.data;
          localStorage.setItem('token', accessToken);
          
          // Aggiorna anche il tempo di scadenza se il server lo fornisce
          if (response.data.expiresIn) {
            const newExpiryTime = Date.now() + (response.data.expiresIn * 60 * 1000);
            localStorage.setItem('tokenExpiryTime', newExpiryTime.toString());
          }
          
          processQueue(null, accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
          
        } catch (refreshError) {
          processQueue(refreshError, null);
          
          // Il refresh è fallito, forza il logout
          forceLogoutFromAxios("La tua sessione è scaduta. Effettua nuovamente il login.");
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Per tutti gli altri errori 401/403, forza il logout immediato
        forceLogoutFromAxios("Errore di autenticazione. Effettua nuovamente il login.");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Aggiungi retry automatico per errori di rete
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error;
    
    // Retry solo per errori di rete, non per errori HTTP
    if (!error.response && config && !config.__retryCount) {
      config.__retryCount = 0;
    }
    
    if (!error.response && config && config.__retryCount < 3) {
      config.__retryCount += 1;
      
      // Aspetta con backoff esponenziale
      const backoffDelay = Math.pow(2, config.__retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return axiosInstance(config);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;