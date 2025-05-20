// hooks/useApiRequest.js
import { useRef, useEffect, useCallback } from "react";

const useApiRequest = () => {
  const abortControllerRef = useRef(null);
  const pendingRequestRef = useRef({});
  const controllersMap = useRef(new Map());

  const makeRequest = useCallback(async (url, options = {}) => {
    const requestKey = `${options.method || "GET"}-${url}`;

    // Cancella eventuale controller esistente per questa richiesta
    if (controllersMap.current.has(requestKey)) {
      try {
        controllersMap.current.get(requestKey).abort();
      } catch (e) {
        console.warn("Failed to abort previous request", e);
      }
    }

    // Crea un nuovo controller
    const controller = new AbortController();
    controllersMap.current.set(requestKey, controller);

    try {
      // Prepara gli headers base
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };

      // Se c'è un FormData, NON aggiungere Content-Type
      // Il browser lo imposterà automaticamente con il boundary corretto
      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...options.headers, // Gli headers specifici sovrascrivono quelli di default
        },
      });

      // Una volta completata, rimuovi il controller
      controllersMap.current.delete(requestKey);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Per le richieste che aspettano un blob (come download di file)
      if (options.responseType === "blob") {
        return await response.blob();
      }

      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      controllersMap.current.delete(requestKey);

      if (error.name === "AbortError") {
        console.error(`Request was aborted: ${requestKey}`);
        return null;
      }
      throw error;
    }
  }, []);

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      controllersMap.current.forEach((controller) => {
        try {
          controller.abort();
        } catch (e) {
          console.warn("Failed to abort on cleanup", e);
        }
      });
      controllersMap.current.clear();
    };
  }, []);

  return { makeRequest };
};

export default useApiRequest;
