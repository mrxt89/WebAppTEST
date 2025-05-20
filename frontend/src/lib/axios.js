// src/lib/axios.js
import axios from "axios";
import { config } from "../config";
import { swal } from "./common";

const axiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Interceptor per aggiungere il token a tutte le richieste
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor per gestire gli errori di autenticazione
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Gestione errori di autenticazione (401 o 403)
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Pulisci lo storage e reindirizza al login
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Mostra un messaggio all'utente
      await swal.fire({
        title: "Sessione scaduta",
        text: "La tua sessione è scaduta. Effettua nuovamente il login.",
        icon: "warning",
        confirmButtonText: "OK",
      });

      // Reindirizza al login
      window.location.href = "/login";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
