// Modifiche a Login.jsx per inizializzare le notifiche dopo il login

import React, {useReducer, useState, useEffect, useCallback, useMemo, useRef} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye, faEyeSlash, faUser, faLock, faIndustry, faSpinner,
  faTimes, faExclamationTriangle, faTicketAlt, faBuilding
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { config } from "@/config";
import notificationService from "@/services/notifications/NotificationService"; // Importa il servizio notifiche

// Constants
const LOGIN_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_DURATION: 5 * 60 * 1000, // 5 minutes
  COMPANY_FETCH_DEBOUNCE: 500,
  VALIDATION_MESSAGES: {
      REQUIRED_USERNAME: "Inserisci il nome utente",
      REQUIRED_PASSWORD: "Inserisci la password",
      WEAK_PASSWORD: "La password deve contenere almeno 8 caratteri",
      REQUIRED_COMPANY: "Seleziona un'azienda",
      INVALID_CREDENTIALS: "Username o password non validi",
      ACCESS_DENIED: "Accesso negato",
      RATE_LIMITED: "Troppi tentativi. Riprova tra qualche minuto",
      NETWORK_ERROR: "Verifica la connessione internet",
      SERVER_ERROR: "Errore del server. Riprova più tardi"
  }
};

const TERMS_CONTENT = [
  {
      title: "1. Finalità del sistema",
      content: "Il sistema è destinato esclusivamente a scopi aziendali. Ogni utilizzo deve essere coerente con le attività lavorative e le finalità dell'azienda."
  },
  {
      title: "2. Accesso riservato",
      content: "L'accesso è consentito solo al personale autorizzato tramite credenziali personali. L'utente è responsabile della riservatezza delle proprie credenziali e di ogni attività eseguita con il proprio account."
  },
  {
      title: "3. Tracciabilità",
      content: "Tutte le operazioni eseguite nel sistema possono essere tracciate per motivi di sicurezza, audit e miglioramento dei servizi."
  },
  {
      title: "4. Obblighi dell'utente",
      content: "L'utente si impegna a:",
      list: [
          "non divulgare le proprie credenziali a terzi;",
          "non utilizzare il sistema per finalità illecite o non autorizzate;",
          "segnalare tempestivamente eventuali anomalie, accessi sospetti o violazioni."
      ]
  },
  {
      title: "5. Protezione dei dati",
      content: "I dati presenti nel sistema sono proprietà dell'azienda. È vietata qualsiasi copia, diffusione o uso improprio dei dati aziendali."
  },
  {
      title: "6. Sospensione o revoca dell'accesso",
      content: "L'azienda si riserva il diritto di sospendere o revocare l'accesso al sistema in caso di violazioni dei presenti termini o per motivi di sicurezza."
  },
  {
      title: "7. Aggiornamenti",
      content: "I presenti termini possono essere aggiornati nel tempo. L'utilizzo continuato del sistema dopo modifiche implica l'accettazione delle nuove condizioni."
  }
];

// Initial state for useReducer
const initialState = {
  username: '',
  password: '',
  showPassword: false,
  selectedCompanyId: '',
  companies: [],
  isLoading: false,
  fetchingCompanies: false,
  error: '',
  showTermsModal: false,
  showAnonymousTicketModal: false,
  failedAttempts: 0,
  lockoutTime: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  noCompaniesChecked: false,
  lastFetchedUsername: '',
  // Animation states
  showCompanySelect: false,
  showErrorMessage: false,
  showFailedAttempts: false,
  showOfflineWarning: false
};

// Reducer for state management
const loginReducer = (state, action) => {
  switch (action.type) {
      case 'SET_FIELD':
          // Reset company-related state when username changes
          if (action.field === 'username' && action.value !== state.username) {
              return {
                  ...state,
                  [action.field]: action.value,
                  error: '',
                  noCompaniesChecked: false,
                  companies: [],
                  selectedCompanyId: '',
                  lastFetchedUsername: '',
                  showCompanySelect: false,
                  showErrorMessage: false
              };
          }
          return {...state, [action.field]: action.value, error: '', showErrorMessage: false};

      case 'SET_COMPANIES':
          return {
              ...state,
              companies: action.companies,
              fetchingCompanies: false,
              selectedCompanyId: action.companies.length === 1 ? action.companies[0].CompanyId : state.selectedCompanyId,
              noCompaniesChecked: true,
              lastFetchedUsername: action.username,
              error: action.companies.length === 0 ? "Nessuna azienda disponibile per questo utente" : '',
              showCompanySelect: action.companies.length > 0,
              showErrorMessage: action.companies.length === 0
          };

      case 'START_FETCHING_COMPANIES':
          return {
              ...state,
              fetchingCompanies: true,
              error: '',
              noCompaniesChecked: false,
              showErrorMessage: false
          };

      case 'CLEAR_COMPANIES':
          return {
              ...state,
              companies: [],
              selectedCompanyId: '',
              error: '',
              noCompaniesChecked: false,
              lastFetchedUsername: '',
              showCompanySelect: false,
              showErrorMessage: false
          };

      case 'SET_LOADING':
          return {...state, [action.loadingType]: action.isLoading};

      case 'SET_ERROR':
          return {
              ...state,
              error: action.error,
              showErrorMessage: true
          };

      case 'INCREMENT_FAILED_ATTEMPTS':
          const newFailedAttempts = state.failedAttempts + 1;
          const shouldLockout = newFailedAttempts >= LOGIN_CONSTANTS.MAX_FAILED_ATTEMPTS;
          return {
              ...state,
              failedAttempts: newFailedAttempts,
              lockoutTime: shouldLockout ? Date.now() + LOGIN_CONSTANTS.LOCKOUT_DURATION : null,
              showFailedAttempts: true
          };

      case 'RESET_FAILED_ATTEMPTS':
          return {
              ...state,
              failedAttempts: 0,
              lockoutTime: null,
              showFailedAttempts: false
          };

      case 'SET_ONLINE_STATUS':
          return {
              ...state,
              isOnline: action.isOnline,
              showOfflineWarning: !action.isOnline
          };

      case 'CLEAR_ERROR':
          return {
              ...state,
              error: '',
              showErrorMessage: false
          };

      default:
          return state;
  }
};

// Custom hook for debouncing
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
      if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

// Custom hook for form validation
const useLoginValidation = () => {
  const validateForm = useCallback((username, password, companyId, companies) => {
      if (!username.trim()) return LOGIN_CONSTANTS.VALIDATION_MESSAGES.REQUIRED_USERNAME;
      if (!password.trim()) return LOGIN_CONSTANTS.VALIDATION_MESSAGES.REQUIRED_PASSWORD;
      if (password.length < LOGIN_CONSTANTS.MIN_PASSWORD_LENGTH) return LOGIN_CONSTANTS.VALIDATION_MESSAGES.WEAK_PASSWORD;
      if (companies.length > 0 && !companyId) return LOGIN_CONSTANTS.VALIDATION_MESSAGES.REQUIRED_COMPANY;
      return null;
  }, []);

  return {validateForm};
};

// Utility functions
const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '');
};

const getErrorMessage = (error) => {
  if (!error.response) {
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
          return LOGIN_CONSTANTS.VALIDATION_MESSAGES.NETWORK_ERROR;
      }
      return "Si è verificato un errore durante il login";
  }

  switch (error.response.status) {
      case 401:
          return LOGIN_CONSTANTS.VALIDATION_MESSAGES.INVALID_CREDENTIALS;
      case 403:
          return LOGIN_CONSTANTS.VALIDATION_MESSAGES.ACCESS_DENIED;
      case 429:
          return LOGIN_CONSTANTS.VALIDATION_MESSAGES.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
          return LOGIN_CONSTANTS.VALIDATION_MESSAGES.SERVER_ERROR;
      default:
          return error.response.data?.message || "Errore durante il login";
  }
};

// Animated Alert Component
const AnimatedAlert = React.memo(({show, children, className, variant = "default"}) => {
  const variantClasses = {
      error: "bg-red-50 border-red-200 text-red-700",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
      info: "bg-orange-50 border-orange-200 text-orange-700",
      default: "bg-gray-50 border-gray-200 text-gray-700"
  };

  return (
      <div
          className={`
      overflow-hidden transition-all duration-300 ease-in-out
      ${show
              ? 'max-h-40 opacity-100 transform translate-y-0 mb-4'
              : 'max-h-0 opacity-0 transform -translate-y-2 mb-0'
          }
    `}
      >
          <div className={`border rounded-lg p-4 ${variantClasses[variant]} ${className}`}>
              {children}
          </div>
      </div>
  );
});

// Animated Field Component
const AnimatedField = React.memo(({show, children, className = ""}) => {
  return (
      <div
          className={`
      overflow-hidden transition-all duration-300 ease-in-out
      ${show
              ? 'max-h-96 opacity-100 transform translate-y-0'
              : 'max-h-0 opacity-0 transform -translate-y-4'
          }
    `}
      >
          <div className={`${className} ${show ? 'mb-6' : 'mb-0'}`}>
              {children}
          </div>
      </div>
  );
});

// Loading Button Component
const LoadingButton = React.memo(({isLoading, children, className, ...props}) => (
  <button
      {...props}
      className={`${className} transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}`}
  >
      <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-100' : 'opacity-0 absolute'}`}>
          <div className="flex items-center justify-center space-x-2">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin"/>
              <span>Accesso in corso...</span>
          </div>
      </div>
      <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          {children}
      </div>
  </button>
));

// Modal Component with animations
const AnimatedModal = React.memo(({show, onClose, children}) => {
  useEffect(() => {
      if (show) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = 'unset';
      }

      return () => {
          document.body.style.overflow = 'unset';
      };
  }, [show]);

  if (!show) return null;

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
              className={`
        absolute inset-0 bg-black transition-opacity duration-300 ease-out
        ${show ? 'opacity-50' : 'opacity-0'}
      `}
              onClick={onClose}
          />

          {/* Modal */}
          <div
              className={`
        relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] 
        flex flex-col transition-all duration-300 ease-out
        ${show
                  ? 'opacity-100 transform scale-100 translate-y-0'
                  : 'opacity-0 transform scale-95 translate-y-4'
              }
      `}
          >
              {children}
          </div>
      </div>
  );
});

const Login = () => {
  const [state, dispatch] = useReducer(loginReducer, initialState);
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
                    Accedendo accetti i     {" "}
                    <button
                        type="button"
                        onClick={() => dispatch({type: 'SET_FIELD', field: 'showTermsModal', value: true})}
                        className="text-slate-700 underline hover:text-slate-900 transition-all duration-200 font-medium hover:scale-105 transform inline-block"
                    >
                        termini di utilizzo del sistema aziendale
                    </button>
                </p>
            </div>
          </div>
        </div>
      </div>

                  {/* Modal Termini di Utilizzo - Animated */}
                  <AnimatedModal
                show={state.showTermsModal}
                onClose={() => dispatch({type: 'SET_FIELD', field: 'showTermsModal', value: false})}
            >
                {/* Header del modal */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-slate-800">
                        Termini di utilizzo del sistema aziendale
                    </h3>
                    <button
                        onClick={() => dispatch({type: 'SET_FIELD', field: 'showTermsModal', value: false})}
                        className="text-slate-400 hover:text-slate-600 transition-all duration-200 transform hover:scale-110 hover:rotate-90"
                        aria-label="Chiudi modal"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-lg"/>
                    </button>
                </div>

                {/* Contenuto scrollabile */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-6">
                        {TERMS_CONTENT.map((section, index) => (
                            <div
                                key={index}
                                className="pb-2 transform transition-all duration-300 hover:translate-x-1"
                                style={{animationDelay: `${index * 100}ms`}}
                            >
                                <h4 className="font-semibold text-slate-800 mb-2">{section.title}</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">{section.content}</p>
                                {section.list && (
                                    <ul className="mt-2 ml-4 space-y-1">
                                        {section.list.map((item, i) => (
                                            <li key={i} className="text-slate-600 text-sm leading-relaxed">
                                                • {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer del modal */}
                <div className="p-4 border-t border-gray-200 text-center">
                    <button
                        onClick={() => dispatch({type: 'SET_FIELD', field: 'showTermsModal', value: false})}
                        className="w-25 sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                    >
                        Chiudi
                    </button>
                </div>
            </AnimatedModal>



    </div>
  );
};

export default Login;