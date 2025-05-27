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

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor con refresh token
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se è un errore di token scaduto e non è già un retry
    if (error.response?.status === 401 && 
        error.response?.data?.error === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      
      if (isRefreshing) {
        // Se stiamo già refreshando, metti in coda
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

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
        
        // Aggiorna il token per tutte le richieste in coda
        processQueue(null, accessToken);
        
        // Riprova la richiesta originale
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Solo se il refresh fallisce completamente, vai al login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        await swal.fire({
          title: 'Sessione scaduta',
          text: 'La tua sessione è scaduta. Effettua nuovamente il login.',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Per altri errori 401/403, comportamento normale
    if ((error.response?.status === 401 || error.response?.status === 403) && 
        !originalRequest._retry) {
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      await swal.fire({
        title: 'Accesso negato',
        text: 'Non hai i permessi per accedere a questa risorsa.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      
      window.location.href = '/login';
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