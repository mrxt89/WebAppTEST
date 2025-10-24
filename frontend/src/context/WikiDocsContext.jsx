import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const WikiDocsContext = createContext();

export const useWikiDocs = () => {
  const context = useContext(WikiDocsContext);
  if (!context) {
    throw new Error("useWikiDocs must be used within WikiDocsProvider");
  }
  return context;
};

export const WikiDocsProvider = ({ children }) => {
  const location = useLocation();
  const [pageId, setPageId] = useState(null);
  const [pageName, setPageName] = useState(null);
  const [componentKey, setComponentKey] = useState(null);

  // Mappa route → pageId
  const routeToPageMap = {
    "/dashboard": { pageId: 1, pageName: "Dashboard" },
    "/progetti/dashboard": { pageId: 16, pageName: "Dashboard Progetti" },
    "/progetti/attivita": { pageId: 20, pageName: "Lista Attività" },
    "/progetti/templates": { pageId: 21, pageName: "Templates Progetti" },
    "/progetti/categorie": { pageId: 19, pageName: "Categorie Progetti" },
    "/progetti/clienti": { pageId: 22, pageName: "Clienti Progetti" },
    "/progetti/articoli": { pageId: 23, pageName: "Costificazione Distinte" },
    "/progetti/intercompany": { pageId: 1023, pageName: "Intercompany" },
    "/admin/dashboard": { pageId: 2, pageName: "Permessi" },
    "/anagrafiche/articoli": { pageId: 5, pageName: "Articoli" },
    "/anagrafiche/clientiFornitori": { pageId: 6, pageName: "Clienti e Fornitori" },
    "/pianificazione/ODP": { pageId: 8, pageName: "Ordini di Produzione" },
    "/produzione/avanzamentoODP": { pageId: 10, pageName: "Avanzamento" },
    "/anagrafiche/distinte": { pageId: 12, pageName: "Distinte Basi" },
    "/anagrafiche/risorse": { pageId: 13, pageName: "Risorse" },
    "/pianificazione/calendari": { pageId: 14, pageName: "Calendari di Produzione" },
  };

  useEffect(() => {
    const pathname = location.pathname;

    // Trova la route corrispondente
    let pageInfo = null;
    for (const [route, info] of Object.entries(routeToPageMap)) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        pageInfo = info;
        break;
      }
    }

    if (pageInfo) {
      setPageId(pageInfo.pageId);
      setPageName(pageInfo.pageName);
    } else {
      setPageId(null);
      setPageName(null);
    }

    // Reset componentKey quando cambia route
    setComponentKey(null);
  }, [location.pathname]);

  const value = {
    pageId,
    pageName,
    componentKey,
    setComponentKey, // I componenti possono settare il componentKey attivo
  };

  return <WikiDocsContext.Provider value={value}>{children}</WikiDocsContext.Provider>;
};

export default WikiDocsContext;
