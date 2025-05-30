// Modifiche a Login.jsx per inizializzare le notifiche dopo il login

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faUser, faLock, faBuilding, faSpinner, faCog, faIndustry } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { config } from "@/config";
import notificationService from "@/services/notifications/NotificationService"; // Importa il servizio notifiche

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingCompanies, setFetchingCompanies] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Funzione per inizializzare le notifiche audio e web
  const initializeNotifications = async () => {
    try {
      // Inizializza l'audio
      await notificationService.initAudio();

      // Richiedi autorizzazione per le notifiche web
      if (notificationService.webNotificationsEnabled) {
        await notificationService.requestNotificationPermission();
      }

      // Riproduci un suono di test silenziosamente (volume a 0) per inizializzare l'audio
      const originalVolume =
        notificationService.audioContext?.createGain().gain.value;
      if (notificationService.audioContext) {
        const gainNode = notificationService.audioContext.createGain();
        gainNode.gain.value = 0; // Volume a 0

        const source = notificationService.audioContext.createBufferSource();
        if (notificationService.decodedAudioData) {
          source.buffer = notificationService.decodedAudioData;
          source.connect(gainNode);
          gainNode.connect(notificationService.audioContext.destination);
          source.start(0);
        }
      }
    } catch (error) {
      console.warn("Non è stato possibile inizializzare le notifiche:", error);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const fetchUserCompanies = async (username) => {
    if (!username.trim()) return;

    setFetchingCompanies(true);
    setError("");

    try {
      // Usa il nuovo endpoint che accetta username
      const response = await axios.get(
        `${config.API_BASE_URL}/user-companies-by-username/${username}`,
      );
      setCompanies(response.data);

      // Se c'è solo un'azienda, selezionala automaticamente
      if (response.data.length === 1) {
        setSelectedCompanyId(response.data[0].CompanyId);
      } else if (response.data.length === 0) {
        setError("Nessuna azienda disponibile per questo utente");
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      setError("Errore nel recupero delle aziende");
    } finally {
      setFetchingCompanies(false);
    }
  };

  const handleUsernameBlur = () => {
    if (username.trim()) {
      fetchUserCompanies(username);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Inserisci il nome utente");
      return;
    }

    if (!password.trim()) {
      setError("Inserisci la password");
      return;
    }

    if (companies.length > 0 && !selectedCompanyId) {
      setError("Seleziona un'azienda");
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(username, password, selectedCompanyId);
      if (success) {
        // Inizializza le notifiche prima di navigare
        await initializeNotifications();
        navigate("/");
      }
    } catch (error) {
      if (error.response) {
        // Errore di risposta dal server
        if (error.response.status === 401) {
          setError("Username o password non validi");
        } else {
          setError(error.response.data.message || "Errore durante il login");
        }
      } else if (error.request) {
        // Errore di rete
        setError("Impossibile contattare il server");
      } else {
        setError("Si è verificato un errore durante il login");
      }
      console.error("Login Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      // Se l'utente è già autenticato, inizializza le notifiche
      initializeNotifications().then(() => {
        navigate("/");
      });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 flex">
      {/* Sezione sinistra - Immagine/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 relative overflow-hidden">
        {/* Pattern di sfondo industriale */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
          <div className="absolute top-40 right-32 w-24 h-24 border border-white rounded-lg rotate-45"></div>
          <div className="absolute bottom-32 left-32 w-28 h-28 border-2 border-white rounded"></div>
          <div className="absolute bottom-20 right-20 w-20 h-20 border border-white rounded-full"></div>
        </div>
        
        {/* Contenuto principale */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 text-center">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-600 rounded-2xl mb-8 shadow-2xl">
              <FontAwesomeIcon icon={faIndustry} className="text-white text-3xl" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Ricos - CBL - Tecno Line
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-md">
              Piattaforma web per gestire dati e operazioni aziendali 
            </p>
          </div>

        </div>
      </div>

      {/* Sezione destra - Form di login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* Header mobile */}
          <div className="lg:hidden text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-xl mb-6">
              <FontAwesomeIcon icon={faIndustry} className="text-white text-xl" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Sistema Industriale</h1>
            <p className="text-slate-600">Accedi al tuo account</p>
          </div>

          {/* Form container */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">Accesso</h2>
              <p className="text-slate-600 text-sm">Inserisci le tue credenziali per continuare</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome Utente
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faUser} className="text-slate-400 text-sm" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={handleUsernameBlur}
                    required
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Inserisci il tuo username"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Caricamento aziende */}
              {fetchingCompanies && (
                <div className="flex items-center justify-center py-4 bg-slate-50 rounded-lg border border-slate-200">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-slate-500 mr-3 text-sm" />
                  <span className="text-slate-600 text-sm font-medium">Caricamento aziende...</span>
                </div>
              )}

              {/* Campo Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faLock} className="text-slate-400 text-sm" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-12 py-3.5 border border-gray-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Inserisci la tua password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors duration-200 focus:outline-none"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Selezione Azienda */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Azienda
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faBuilding} className="text-slate-400 text-sm" />
                  </div>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    required
                    className="w-full pl-11 pr-10 py-3.5 border border-gray-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                  >
                    <option value="">Seleziona un'azienda</option>
                    {companies.map((company) => (
                      <option key={company.CompanyId} value={company.CompanyId}>
                        {company.Description}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Messaggio di errore */}
              <div className="min-h-[3.5rem] flex items-center">
                {error && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm font-medium text-center">{error}</p>
                  </div>
                )}
              </div>

              {/* Pulsante di accesso */}
              <button
                type="submit"
                disabled={isLoading || fetchingCompanies}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Accesso in corso...</span>
                  </>
                ) : (
                  <span>Accedi al Sistema</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-xs text-slate-500">
                Accedendo accetti i termini di utilizzo del sistema aziendale
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;