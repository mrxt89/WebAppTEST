import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Genera l'URL per l'avanzamento fasi in base alla companyid
 * @param {number} companyId - ID dell'azienda (1=Ricos, 2=Cbl, 3=TL)
 * @param {string} prj - Nome del progetto
 * @param {number|string} stp - Sequenza fase
 * @param {number} ute - ID utente ERP
 * @param {string} ope - Operazione
 * @returns {string} URL completo per l'avanzamento fasi
 */
export function getPhaseProgressUrl(companyId, prj, stp, ute, ope) {
  const baseUrl = "http://192.168.42.118";
  let path = "";
  
  // Determina il path in base alla companyid
  switch (parseInt(companyId)) {
    case 1: // Ricos
      path = "/ricos/webapp/wap_01.asp";
      break;
    case 2: // Cbl
      path = "/ERP/webapp/wap_01.asp";
      break;
    case 3: // TL
      path = "/TECNO/webapp/wap_01.asp";
      break;
    default:
      // Default a Ricos se companyid non riconosciuto
      path = "/ricos/webapp/wap_01.asp";
      break;
  }
  
  const encodedPrj = encodeURIComponent(prj || "");
  const encodedOpe = encodeURIComponent(ope || "");
  
  return `${baseUrl}${path}?prj=${encodedPrj}&stp=${stp}&ute=${ute}&ope=${encodedOpe}`;
}