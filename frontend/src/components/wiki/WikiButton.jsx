import React from "react";
import { CircleHelp } from "lucide-react";
import { useWikiContext } from "./WikiContext";
import { useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Pulsante Wiki per la barra superiore (Header)
 * Versione semplificata che apre direttamente la wiki contestuale
 */
const WikiButton = ({
  fromNotificationSidebar = false,
  specificSection = null,
}) => {
  const { openWiki } = useWikiContext();
  const location = useLocation();

  // Determina la vista corrente (se siamo nelle attività)
  const getCurrentView = () => {
    // Verifica se è stato fornito un specificSection
    if (specificSection) {
      return specificSection;
    }

    // Verifica se siamo nella sidebar delle notifiche
    if (fromNotificationSidebar) {
      return "notifications";
    }

    // Verifica se siamo nella pagina delle attività
    const isTasksPage = location.pathname.includes("/progetti/attivita");

    if (!isTasksPage) return null;

    // Verifica se c'è una tab timesheet attiva
    const isTimesheetActive = document.querySelector(
      'button[value="timesheet"].active, button[value="timesheet"][data-state="active"], button[value="timesheet"][aria-selected="true"]',
    );
    if (isTimesheetActive) return "timesheet";

    // Verifica se c'è una tab reportistica attiva
    const isReportActive = document.querySelector(
      'button[value="report"].active, button[value="report"][data-state="active"], button[value="report"][aria-selected="true"]',
    );
    if (isReportActive) return "report";

    // Altrimenti assume che siamo in tasks (attività)
    return "tasks";
  };

  // Apri la wiki contestuale per la vista corrente
  const handleOpenWiki = (e) => {
    // Previene che l'evento si propaghi (importante per evitare che la sidebar si chiuda)
    e.stopPropagation();

    const currentView = getCurrentView();

    // Se siamo già in una pagina supportata, passa il valore esatto della vista
    if (currentView) {
      openWiki(currentView, fromNotificationSidebar);
    } else {
      // Se non siamo in una pagina con più visualizzazioni, apri la wiki senza specificare sezione
      openWiki(null, fromNotificationSidebar);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleOpenWiki}
            className="relative p-2 text-white hover:bg-[var(--secondary)] rounded-full transition-colors flex items-center z-[1100]"
            aria-label="Aiuto e Wiki"
            style={{
              // Assicura che il pulsante sia sempre visibile anche con modali aperti
              position: "relative",
              zIndex: 1100, // Un valore più alto di quello dei modali
            }}
            id={
              fromNotificationSidebar
                ? "notification-sidebar-wiki-button"
                : "header-wiki-button"
            }
          >
            <CircleHelp className="text-xl" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Guida contestuale</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WikiButton;
