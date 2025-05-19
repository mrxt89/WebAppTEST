import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { config } from "../config";

const CompanyContext = createContext();

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }) => {
  const { user } = useAuth();
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load company data when user is authenticated
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user || !user.CompanyId) return;

      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${config.API_BASE_URL}/company/${user.CompanyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const company = response.data;
        setCompanyData(company);

        // Apply company theme colors
        applyCompanyTheme(company);
      } catch (err) {
        console.error("Error fetching company data:", err);
        setError("Failed to load company data");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [user]);

  // Function to apply company theme colors
  const applyCompanyTheme = (company) => {
    if (!company) return;

    const root = document.documentElement;

    // Verifica che i colori esistano e applica solo se ci sono
    if (company.w_PrimaryColor) {
      // Controlla se il colore è in formato esadecimale e aggiunge # se necessario
      const primaryColor = company.w_PrimaryColor.startsWith("#")
        ? company.w_PrimaryColor
        : `#${company.w_PrimaryColor}`;

      root.style.setProperty("--primary", primaryColor);
    }

    if (company.w_SecondaryColor) {
      const secondaryColor = company.w_SecondaryColor.startsWith("#")
        ? company.w_SecondaryColor
        : `#${company.w_SecondaryColor}`;

      root.style.setProperty("--secondary", secondaryColor);
    }
  };

  // Function to get company logo URL
  const getCompanyLogoUrl = () => {
    if (!companyData || !companyData.CompanyId) return "/images/logos/Logo.png"; // Default logo

    // Try different extensions (case insensitive)
    const extensions = ["png", "jpeg", "jpg"];
    const companyId = companyData.CompanyId;

    // For development, we can just return the path and let the component handle fallback
    return `/images/logos/${companyId}`;
  };

  return (
    <CompanyContext.Provider
      value={{
        company: companyData,
        loading,
        error,
        getCompanyLogoUrl,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export default CompanyContext;
