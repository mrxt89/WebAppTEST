import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";

const CompanyLogo = ({ className, style = {}, onClick }) => {
  const { getCompanyLogoUrl } = useCompany();
  const [logoUrl, setLogoUrl] = useState("/images/logos/Logo.png"); // Default logo
  const [attemptedUrls, setAttemptedUrls] = useState([]);

  useEffect(() => {
    const baseUrl = getCompanyLogoUrl();
    if (!baseUrl) return;

    // Prepara una lista di URL da provare in ordine
    const extensions = ["png", "jpg", "jpeg"];
    const urlsToTry = extensions.map((ext) => `${baseUrl}.${ext}`);
    urlsToTry.push(baseUrl); // Prova anche l'URL base senza estensione

    // Inizia con il primo URL
    if (urlsToTry.length > 0) {
      setLogoUrl(urlsToTry[0]);
      setAttemptedUrls(urlsToTry);
    }
  }, [getCompanyLogoUrl]);

  const handleError = () => {
    // Se c'è un errore, prova il prossimo URL nella lista
    const currentIndex = attemptedUrls.indexOf(logoUrl);
    if (currentIndex >= 0 && currentIndex < attemptedUrls.length - 1) {
      const nextUrl = attemptedUrls[currentIndex + 1];
      setLogoUrl(nextUrl);
    } else {
      // Se abbiamo provato tutti gli URL, usiamo il logo di default
      setLogoUrl("/images/logos/Logo.png");
    }
  };

  return (
    <img
      id="company-logo"
      src={logoUrl}
      alt="Company Logo"
      className={className || "h-10 w-auto"}
      style={style}
      onClick={onClick}
      onError={handleError}
    />
  );
};

export default CompanyLogo;
