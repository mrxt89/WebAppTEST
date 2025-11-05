import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import useWikiManagement from "@/hooks/useWikiManagement";

const WikiDocsContext = createContext();
const BreadcrumbContext = createContext(null);

// Hook per registrare il breadcrumb corrente
export const useBreadcrumbRegistration = () => {
  const setBreadcrumbRef = useContext(BreadcrumbContext);
  return setBreadcrumbRef;
};

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
  const breadcrumbRef = useRef(null);

  // Funzione per registrare il breadcrumb corrente
  const setBreadcrumb = (breadcrumb) => {
    breadcrumbRef.current = breadcrumb;
  };

  useEffect(() => {
    const pathname = location.pathname;

    // Reset componentKey quando cambia route
    setComponentKey(null);

    // Se pathname è root o vuoto, prova a usare il pageId dal breadcrumb
    if (pathname === "/" || pathname === "") {
      // Se c'è un breadcrumb con un item, usa il suo pageId
      if (breadcrumbRef.current && breadcrumbRef.current.length > 0) {
        const lastItem = breadcrumbRef.current[breadcrumbRef.current.length - 1];
        if (lastItem && lastItem.pageId) {
          setPageId(lastItem.pageId);
          setPageName(lastItem.pageName || null);
          return;
        }
      }
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
          // Se non trova la pagina per route, prova a usare il pageId dal breadcrumb
          if (breadcrumbRef.current && breadcrumbRef.current.length > 0) {
            const lastItem = breadcrumbRef.current[breadcrumbRef.current.length - 1];
            if (lastItem && lastItem.pageId) {
              setPageId(lastItem.pageId);
              setPageName(lastItem.pageName || null);
            } else {
              setPageId(null);
              setPageName(null);
            }
          } else {
            setPageId(null);
            setPageName(null);
          }
        }
      } catch (error) {
        console.error("Errore nel recupero della pagina per route:", error);
        // In caso di errore, prova a usare il pageId dal breadcrumb
        if (breadcrumbRef.current && breadcrumbRef.current.length > 0) {
          const lastItem = breadcrumbRef.current[breadcrumbRef.current.length - 1];
          if (lastItem && lastItem.pageId) {
            setPageId(lastItem.pageId);
            setPageName(lastItem.pageName || null);
          } else {
            setPageId(null);
            setPageName(null);
          }
        } else {
          setPageId(null);
          setPageName(null);
        }
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

  return (
    <BreadcrumbContext.Provider value={setBreadcrumb}>
      <WikiDocsContext.Provider value={value}>{children}</WikiDocsContext.Provider>
    </BreadcrumbContext.Provider>
  );
};

export default WikiDocsContext;
