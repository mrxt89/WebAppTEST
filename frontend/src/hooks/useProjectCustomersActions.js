// hooks/useProjectCustomersActions.js
import { useState, useCallback, useEffect } from "react";
import { config } from "../config";
import useApiRequest from "./useApiRequest";

// Constants for CustSuppType (riutilizzo gli stessi valori del gestionale)
export const CUSTOMER_TYPE = 3211264;
export const SUPPLIER_TYPE = 3211265;

const useProjectCustomersActions = () => {
  const [projectCustomers, setProjectCustomers] = useState([]);
  const [erpCustomers, setErpCustomers] = useState([]);
  const [countriesData, setCountriesData] = useState([]);
  const [uniqueCountries, setUniqueCountries] = useState([]);
  const [uniqueRegions, setUniqueRegions] = useState([]);
  const [uniqueCounties, setUniqueCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingErp, setLoadingErp] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const { makeRequest } = useApiRequest();

  // Fetch country data from MA_Countries
  const fetchCountriesData = useCallback(async () => {
    try {
      setLoadingCountries(true);
      const url = `${config.API_BASE_URL}/countriesData`;
      const data = await makeRequest(url);

      if (data) {
        setCountriesData(data || []);

        // Create unique lists for dropdowns
        const countries = [
          ...new Set(data.map((item) => item.Country).filter(Boolean)),
        ].sort();
        const regions = [
          ...new Set(data.map((item) => item.Region).filter(Boolean)),
        ].sort();
        const counties = [
          ...new Set(data.map((item) => item.County).filter(Boolean)),
        ].sort();

        setUniqueCountries(countries);
        setUniqueRegions(regions);
        setUniqueCounties(counties);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei dati delle nazioni:", error);
      setCountriesData([]);
      if (!error.message.includes("aborted")) {
        console.error("Errore nel caricamento dei dati delle nazioni:", error);
      }
    } finally {
      setLoadingCountries(false);
    }
  }, [makeRequest]);

  // Fetch all project customers
  const fetchProjectCustomers = useCallback(async () => {
    try {
      setLoadingCustomers(true);
      const url = `${config.API_BASE_URL}/projectCustomers`;
      const data = await makeRequest(url);

      if (data) {
        setProjectCustomers(data || []);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei clienti progetto:", error);
      setProjectCustomers([]);
      if (!error.message.includes("aborted")) {
        console.error("Errore nel caricamento dei clienti progetto:", error);
      }
    } finally {
      setLoadingCustomers(false);
    }
  }, [makeRequest]);

  // Search ERP customers for linking
  const searchErpCustomers = useCallback(
    async (searchText) => {
      try {
        setLoadingErp(true);
        const url = `${config.API_BASE_URL}/erpCustomers?search=${encodeURIComponent(searchText || "")}`;
        const data = await makeRequest(url);

        if (data) {
          setErpCustomers(data || []);
        }
        return data;
      } catch (error) {
        console.error("Errore nella ricerca dei clienti ERP:", error);
        setErpCustomers([]);
        if (!error.message.includes("aborted")) {
          console.error("Errore nella ricerca dei clienti ERP:", error);
        }
        return [];
      } finally {
        setLoadingErp(false);
      }
    },
    [makeRequest],
  );

  // Get a single project customer by ID
  const getProjectCustomerById = useCallback(
    async (id) => {
      try {
        const url = `${config.API_BASE_URL}/projectCustomers/${encodeURIComponent(id)}`;
        return await makeRequest(url);
      } catch (error) {
        console.error(
          `Errore nel caricamento del cliente progetto con ID ${id}:`,
          error,
        );
        if (!error.message.includes("aborted")) {
          throw error;
        }
      }
    },
    [makeRequest],
  );

  // Update or create a project customer
  const updateProjectCustomer = useCallback(
    async (id, customerData) => {
      try {
        const method = id ? "PUT" : "POST";
        const url = id
          ? `${config.API_BASE_URL}/projectCustomers/${encodeURIComponent(id)}`
          : `${config.API_BASE_URL}/projectCustomers`;

        const result = await makeRequest(url, {
          method,
          body: JSON.stringify(customerData),
        });

        await fetchProjectCustomers();
        return result;
      } catch (error) {
        console.error(
          `Errore nell'${id ? "aggiornamento" : "inserimento"} del cliente progetto:`,
          error,
        );
        if (!error.message.includes("aborted")) {
          throw error;
        }
      }
    },
    [makeRequest, fetchProjectCustomers],
  );

  // Toggle disable status for a project customer
  const toggleDisableProjectCustomer = useCallback(
    async (id) => {
      try {
        const url = `${config.API_BASE_URL}/projectCustomers/${encodeURIComponent(id)}`;
        const result = await makeRequest(url, {
          method: "DELETE",
        });

        await fetchProjectCustomers();
        return result;
      } catch (error) {
        console.error(
          "Errore nella modifica dello stato di disabilitazione:",
          error,
        );
        if (!error.message.includes("aborted")) {
          throw error;
        }
      }
    },
    [makeRequest, fetchProjectCustomers],
  );

  // Link a project customer to an ERP customer
  const linkToErpCustomer = useCallback(
    async (id, erpCustSupp) => {
      try {
        const url = `${config.API_BASE_URL}/projectCustomers/${encodeURIComponent(id)}/link`;
        const result = await makeRequest(url, {
          method: "POST",
          body: JSON.stringify({ erpCustSupp }),
        });

        await fetchProjectCustomers();
        return result;
      } catch (error) {
        console.error("Errore nel collegamento al cliente ERP:", error);
        if (!error.message.includes("aborted")) {
          throw error;
        }
      }
    },
    [makeRequest, fetchProjectCustomers],
  );

  // Import multiple project customers
  const importProjectCustomers = useCallback(
    async (customersData) => {
      try {
        const url = `${config.API_BASE_URL}/projectCustomers/import`;
        const result = await makeRequest(url, {
          method: "POST",
          body: JSON.stringify(customersData),
        });

        await fetchProjectCustomers();
        return result;
      } catch (error) {
        console.error("Errore nell'importazione dei clienti progetto:", error);
        if (!error.message.includes("aborted")) {
          throw error;
        }
      }
    },
    [makeRequest, fetchProjectCustomers],
  );

  // Importa un cliente ERP come prospect
  const importFromERP = useCallback(
    async (erpCustSupp) => {
      try {
        const url = `${config.API_BASE_URL}/projectCustomers/importFromERP`;
        const result = await makeRequest(url, {
          method: "POST",
          body: JSON.stringify({ erpCustSupp }),
        });

        if (result && result.success) {
          // Ricarica la lista dei prospect dopo l'importazione
          await fetchProjectCustomers();
        }

        return result;
      } catch (error) {
        console.error("Errore nell'importazione del cliente da ERP:", error);
        if (!error.message.includes("aborted")) {
          throw error;
        }
      }
    },
    [makeRequest, fetchProjectCustomers],
  );

  return {
    projectCustomers,
    erpCustomers,
    countriesData,
    uniqueCountries,
    uniqueRegions,
    uniqueCounties,
    loadingCustomers,
    loadingErp,
    loadingCountries,
    fetchProjectCustomers,
    fetchCountriesData,
    searchErpCustomers,
    getProjectCustomerById,
    updateProjectCustomer,
    toggleDisableProjectCustomer,
    linkToErpCustomer,
    importProjectCustomers,
    importFromERP,
    // Export constants
    CUSTOMER_TYPE,
    SUPPLIER_TYPE,
  };
};

export default useProjectCustomersActions;
