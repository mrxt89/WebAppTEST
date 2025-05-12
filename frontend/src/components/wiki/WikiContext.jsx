import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { z } from 'zod';

// Crea il contesto
const WikiContext = createContext();

/**
 * Provider del contesto Wiki
 * Gestisce lo stato del wiki e dei tour guidati con navigazione contestuale migliorata
 */
export const WikiProvider = ({ children }) => {
  // Stati per il modale principale
  const [isWikiOpen, setIsWikiOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [currentWikiContent, setCurrentWikiContent] = useState(null);
  
  // Stati per il tour guidato
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTour, setCurrentTour] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Stato per tenere traccia se la wiki è stata aperta dalla sidebar delle notifiche
  const [openedFromNotificationSidebar, setOpenedFromNotificationSidebar] = useState(false);
  
  // Recupera il percorso corrente
  const location = useLocation();
  
  // Aggiorna il percorso quando cambia la location
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location]);
  
  // Funzione per aprire il modale wiki in modo contestuale
  const openWiki = (specificSection = null, fromNotificationSidebar = false) => {
    // Memorizza se la wiki è stata aperta dalla sidebar notifiche
    setOpenedFromNotificationSidebar(fromNotificationSidebar);
    
    // Se c'è un tour attivo, lo fermiamo
    if (isTourActive) {
      setIsTourActive(false);
    }
    
    // Apriamo il modale wiki
    setIsWikiOpen(true);
    
    // Carichiamo il contenuto wiki appropriato
    loadWikiContent(currentPath, specificSection);
  };
  
  // Funzione per chiudere il modale wiki
  const closeWiki = () => {
    setIsWikiOpen(false);
    // Quando chiudiamo, resettiamo anche il flag
    setOpenedFromNotificationSidebar(false);
  };

  // Esegue la navigazione all'interno della pagina
  const executeNavigation = async (navigationCallback, maxRetries = 5) => {
    if (!navigationCallback) return true;
    
    let retries = 0;
    
    // Funzione ricorsiva per tentare la navigazione con ritardi crescenti
    const tryNavigation = async () => {
      try {
        const success = navigationCallback();
        
        if (success) {
          return true;
        } else if (retries < maxRetries) {
          retries++;
          // Aumenta il ritardo ad ogni tentativo fallito
          const delay = 100 * retries;
          await new Promise(resolve => setTimeout(resolve, delay));
          return tryNavigation();
        } else {
          console.warn('Impossibile navigare alla visualizzazione richiesta dopo diversi tentativi.');
          return false;
        }
      } catch (error) {
        console.error('Errore durante la navigazione:', error);
        return false;
      }
    };
    
    return tryNavigation();
  };
  
  // Funzione per caricare il contenuto wiki in base al percorso
  const loadWikiContent = async (path, specificSection = null) => {
    console.log('Caricamento contenuto wiki per:', path, specificSection);
    try {
      // Determina quale file JSON caricare in base al percorso
      let contentFile;
      let navigateCallback = null;
      
      // Verifica se stiamo caricando la guida delle notifiche
      if (specificSection === 'notifications') {
        contentFile = 'Notifications';
      }
      else if (specificSection === 'notificationChannels') {
        contentFile = 'NotificationChannels';
      }
      else if (specificSection === 'chatmodal') {
        contentFile = 'chatModal';
      }
      else if (path === '/' || path === '') {
        contentFile = 'HomePage';
      } else if (path.includes('/progetti/categorie')) {
        contentFile = 'ProjectCategories';
      } else if (path.includes('/progetti/attivita')) {
        // Se esiste l'elemento html con id "task-time-tracking" allora siamo nella pagina delle Ore lavorate (TaskTimesheet)
        if (document.getElementById('task-time-tracking')) {     
          // Carica il contenuto del TaskTimesheet
          contentFile = 'TaskTimesheet';
        }
        // Se id = 'tasks-view-toggler' allora siamo nella pagina delle attività 
        else if (document.getElementById('tasks-view-toggler')) {
          contentFile = 'MyTasksPage';
        }
        // Per la visualizzazione predefinita della pagina attività
        else {
          contentFile = 'MyTasksPage';
        }
      } 
      // PROGETTI: Gestione dashboard e dettagli progetto
      else if (path.includes('/progetti/dashboard')) {
        contentFile = 'ProjectsDashboard';
      } else if (path.includes('/progetti/detail')) {
        // Determina quale tab è attualmente attiva per caricare il contenuto appropriato
        const activeTab = document.querySelector('button[data-state="active"][role="tab"]');
        console.log('Tab attivo:', activeTab);
        if (activeTab) {
          const tabId = activeTab.getAttribute('id');
          console.log('ID tab attivo:', tabId);
          switch (tabId) {
            case 'project-overview-tab':
              contentFile = 'ProjectDetailsOverview';
              break;
            case 'project-tasks-tab':
              // Determina quale visualizzazione task è attiva
              const tasksViewToggler = document.getElementById('project-tasks-view');
              if (tasksViewToggler) {
                const viewMode = tasksViewToggler.getAttribute('data-view-mode');
                if (viewMode === 'kanban') {
                  contentFile = 'ProjectDetailsTasksKanban';
                } else if (viewMode === 'table') {
                  contentFile = 'ProjectDetailsTasksTable';
                } else if (viewMode === 'gantt') {
                  contentFile = 'ProjectDetailsTasksGantt';
                } else {
                  contentFile = 'ProjectDetailsTasks';
                }
              } else {
                contentFile = 'ProjectDetailsTasks';
              }
              break;
            case 'project-team-tab':
              contentFile = 'ProjectDetailsTeam';
              break;
            case 'project-attachments-tab':
              contentFile = 'ProjectDetailsAttachments';
              break;
            case 'project-analytics-tab':
              contentFile = 'ProjectDetailsAnalytics';
              break;
            default:
              contentFile = 'ProjectDetail';
          }
        } else {
          contentFile = 'ProjectDetail';
        }
      }
      else {
        // Estrai l'ultimo segmento del percorso come nome del file
        const segments = path.split('/').filter(Boolean);
        contentFile = segments[segments.length - 1] || 'HomePage';
      }
      
      // Importa dinamicamente il file JSON
      console.log(`Caricamento contenuto wiki: ${contentFile}.json`);
      
      try {
        const content = await import(`./content/${contentFile}.json`);
        
        // Imposta il contenuto wiki
        setCurrentWikiContent({
          ...content.default,
          _navigateCallback: navigateCallback, // Memorizza la callback per cambiare visualizzazione
          _viewType: specificSection || contentFile.toLowerCase() // Memorizza il tipo di visualizzazione
        });
        
        // Se c'è una callback di navigazione, eseguila con retry
        if (navigateCallback) {
          // Prima di eseguire la navigazione, imposta un messaggio di caricamento
          const loadingToast = toast({
            title: "Caricamento",
            description: "Cambio visualizzazione in corso...",
            duration: 1500
          });
          
          try {
            // Prova a navigare alla vista corretta
            const success = await executeNavigation(navigateCallback);
            
            if (!success) {
              console.warn('Non è stato possibile navigare alla visualizzazione richiesta.');
            }
          } catch (error) {
            console.error('Errore durante la navigazione:', error);
            setIsWikiOpen(false);
          }
        }
      } catch (error) {
        console.error(`Errore nel caricamento del file ${contentFile}.json:`, error);
        // Cerca di caricare un file alternativo se il file originale non è trovato
        try {
          // Se siamo in una visualizzazione specifica ma il file non esiste, torna alla guida principale
          if (specificSection) {
            // Per progetti, carica il file ProjectDetail.json come fallback
            if (path.includes('/progetti/detail')) {
              const content = await import('./content/ProjectDetail.json');
              setCurrentWikiContent({
                ...content.default,
                title: `Guida ${specificSection.charAt(0).toUpperCase() + specificSection.slice(1)}`,
                description: `La guida specifica per ${specificSection} non è disponibile. Visualizzazione della guida generale.`
              });
            } else if (specificSection !== 'tasks') {
              const content = await import('./content/MyTasksPage.json');
              setCurrentWikiContent({
                ...content.default,
                title: `Guida ${specificSection.charAt(0).toUpperCase() + specificSection.slice(1)}`,
                description: `La guida specifica per ${specificSection} non è disponibile. Visualizzazione della guida generale.`
              });
            } else {
              throw new Error('Impossibile caricare il contenuto wiki');
            }
          } else {
            throw new Error('Impossibile caricare il contenuto wiki');
          }
        } catch (fallbackError) {
          // Carica un contenuto di fallback generico
          setCurrentWikiContent({
            title: 'Guida Applicazione',
            description: 'Benvenuto nella wiki dell\'applicazione.',
            sections: [
              {
                title: 'Contenuto non disponibile',
                content: '<p>La guida per questa pagina non è ancora disponibile. Stiamo lavorando per aggiungerla al più presto!</p>'
              }
            ]
          });
        }
      }
    } catch (error) {
      console.error('Errore generale nel caricamento del contenuto wiki:', error);
      // Carica un contenuto di fallback generico
      setCurrentWikiContent({
        title: 'Guida Applicazione',
        description: 'Si è verificato un errore durante il caricamento della guida.',
        sections: [
          {
            title: 'Errore',
            content: '<p>Si è verificato un errore durante il caricamento della guida. Riprova più tardi.</p>'
          }
        ]
      });
    }
  };

  // Funzione per avviare un tour guidato
  const startTour = (tourName) => {
    if (!currentWikiContent || !currentWikiContent.tours || !currentWikiContent.tours[tourName]) {
      console.error(`Tour "${tourName}" non trovato`);
      return;
    }
    
    // Chiudi il modale wiki
    setIsWikiOpen(false);
    
    // Imposta il tour corrente
    setCurrentTour(currentWikiContent.tours[tourName]);
    setCurrentStep(0);
    setIsTourActive(true);
  };
  
  // Funzioni per la navigazione nel tour
  const nextStep = () => {
    if (currentStep < currentTour.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Fine del tour
      endTour();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const endTour = () => {
    setIsTourActive(false);
    setCurrentTour([]);
    setCurrentStep(0);
  };
  
  // Valore del contesto da fornire ai componenti
  const contextValue = {
    isWikiOpen,
    openWiki,
    closeWiki,
    currentWikiContent,
    isTourActive,
    currentTour,
    currentStep,
    startTour,
    nextStep,
    prevStep,
    endTour,
    openedFromNotificationSidebar
  };
  
  return (
    <WikiContext.Provider value={contextValue} >
      {children}
    </WikiContext.Provider>
  );
};

// Hook personalizzato per usare il contesto
export const useWikiContext = () => {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWikiContext deve essere usato all\'interno di un WikiProvider');
  }
  return context;
};