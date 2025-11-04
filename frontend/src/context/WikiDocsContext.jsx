import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import useWikiManagement from "@/hooks/useWikiManagement";

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
  const { getPageByRoute } = useWikiManagement();
  const [pageId, setPageId] = useState(null);
  const [pageName, setPageName] = useState(null);
  const [componentKey, setComponentKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pathname = location.pathname;

    // Reset componentKey quando cambia route
    setComponentKey(null);

    // Se pathname è root o vuoto, resetta
    if (pathname === "/" || pathname === "") {
      setPageId(null);
      setPageName(null);
      return;
    }

    // Cerca la pagina tramite query SQL
    const fetchPageByRoute = async () => {
      setLoading(true);
      try {
        const page = await getPageByRoute(pathname);
        if (page) {
          setPageId(page.pageId);
          setPageName(page.pageName);
        } else {
          setPageId(null);
          setPageName(null);
        }
      } catch (error) {
        console.error("Errore nel recupero della pagina per route:", error);
        setPageId(null);
        setPageName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPageByRoute();
  }, [location.pathname, getPageByRoute]);

  const value = {
    pageId,
    pageName,
    componentKey,
    loading,
    setComponentKey, // I componenti possono settare il componentKey attivo
  };

  return <WikiDocsContext.Provider value={value}>{children}</WikiDocsContext.Provider>;
};

export default WikiDocsContext;
