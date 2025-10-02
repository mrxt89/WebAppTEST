/**
 * Utilità per la gestione della costificazione BOM
 * Funzioni per parsare e visualizzare i dettagli dei costi
 */

/**
 * Parsa il JSON dei dettagli costi dalla BOM
 * @param {string} detailsJson - JSON string dei dettagli
 * @returns {object|null} Oggetto con i dettagli parsati o null se errore
 */
export const parseBOMCostingDetails = (detailsJson) => {
  if (!detailsJson) return null;
  
  try {
    const details = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson;
    return {
      prezzo: parseFloat(details.prezzo) || 0,
      costo_mp: parseFloat(details.costo_mp) || 0,
      costo_ope: parseFloat(details.costo_ope) || 0,
      costi_fissi: parseFloat(details.costi_fissi) || 0,
      ricarico_mp: parseFloat(details.ricarico_mp) || 0,
      ricarico_op: parseFloat(details.ricarico_op) || 0,
      ricarico_tr: parseFloat(details.ricarico_tr) || 0,
      costo_totale: parseFloat(details.costo_totale) || 0,
      ricarico_scarto: parseFloat(details.ricarico_scarto) || 0,
      ricarico_sconto: parseFloat(details.ricarico_sconto) || 0,
      ricarico_totale: parseFloat(details.ricarico_totale) || 0
    };
  } catch (error) {
    console.error('Errore nel parsing dei dettagli costi:', error);
    return null;
  }
};

/**
 * Parsa le note della BOM per estrarre i riferimenti
 * @param {string} notes - Stringa delle note
 * @returns {object|null} Oggetto con i riferimenti parsati o null se errore
 */
export const parseBOMNotes = (notes) => {
  if (!notes) return null;
  
  try {
    // Pattern per estrarre: || lotto(rif): 100 | Prezzo(rif): 51.44 | Costo(rif): 36.32 ||
    const pattern = /\|\|\s*lotto\(rif\):\s*(\d+)\s*\|\s*Prezzo\(rif\):\s*([\d.]+)\s*\|\s*Costo\(rif\):\s*([\d.]+)\s*\|\|/;
    const match = notes.match(pattern);
    
    if (match) {
      return {
        lottoRif: parseInt(match[1]),
        prezzoRif: parseFloat(match[2]),
        costoRif: parseFloat(match[3])
      };
    }
    
    return null;
  } catch (error) {
    console.error('Errore nel parsing delle note:', error);
    return null;
  }
};

/**
 * Formatta un valore monetario
 * @param {number} value - Valore da formattare
 * @param {string} currency - Valuta (default: '€')
 * @param {number} decimals - Decimali (default: 2)
 * @returns {string} Valore formattato
 */
export const formatCurrency = (value, currency = '€', decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value).replace('EUR', currency);
};

/**
 * Formatta una percentuale
 * @param {number} value - Valore da formattare (es: 0.15 per 15%)
 * @param {number} decimals - Decimali (default: 1)
 * @returns {string} Percentuale formattata
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Formatta un numero
 * @param {number} value - Valore da formattare
 * @param {number} decimals - Decimali (default: 2)
 * @returns {string} Numero formattato
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Calcola il totale dei ricarichi
 * @param {object} details - Dettagli parsati
 * @returns {number} Totale ricarichi
 */
export const calculateTotalMarkups = (details) => {
  if (!details) return 0;
  
  return (details.ricarico_mp || 0) + 
         (details.ricarico_op || 0) + 
         (details.ricarico_tr || 0) + 
         (details.ricarico_scarto || 0) + 
         (details.ricarico_sconto || 0) + 
         (details.ricarico_totale || 0);
};

/**
 * Calcola il costo base (senza ricarichi)
 * @param {object} details - Dettagli parsati
 * @returns {number} Costo base
 */
export const calculateBaseCost = (details) => {
  if (!details) return 0;
  
  return (details.costo_mp || 0) + 
         (details.costo_ope || 0) + 
         (details.costi_fissi || 0);
};

/**
 * Valida i dettagli della costificazione
 * @param {object} details - Dettagli da validare
 * @returns {object} Risultato della validazione
 */
export const validateCostingDetails = (details) => {
  if (!details) {
    return { isValid: false, errors: ['Dettagli non forniti'] };
  }
  
  const errors = [];
  
  // Controlla che i valori siano numeri validi
  const numericFields = [
    'prezzo', 'costo_mp', 'costo_ope', 'costi_fissi',
    'ricarico_mp', 'ricarico_op', 'ricarico_tr',
    'ricarico_scarto', 'ricarico_sconto', 'ricarico_totale'
  ];
  
  numericFields.forEach(field => {
    const value = details[field];
    if (value !== null && value !== undefined && (isNaN(value) || value < 0)) {
      errors.push(`${field} deve essere un numero positivo`);
    }
  });
  
  // Controlla coerenza dei calcoli
  const baseCost = calculateBaseCost(details);
  const totalMarkups = calculateTotalMarkups(details);
  const expectedTotal = baseCost + totalMarkups;
  
  if (Math.abs((details.costo_totale || 0) - expectedTotal) > 0.01) {
    errors.push('Il costo totale non corrisponde alla somma dei componenti');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    baseCost,
    totalMarkups,
    expectedTotal
  };
};

/**
 * Genera un riepilogo testuale della costificazione
 * @param {object} details - Dettagli parsati
 * @param {object} notes - Note parsate
 * @returns {string} Riepilogo formattato
 */
export const generateCostingSummary = (details, notes) => {
  if (!details) return 'Nessun dettaglio disponibile';
  
  const summary = [];
  
  // Costi base
  summary.push('=== COSTI BASE ===');
  summary.push(`Materia Prima: ${formatCurrency(details.costo_mp)}`);
  summary.push(`Operazioni: ${formatCurrency(details.costo_ope)}`);
  summary.push(`Costi Fissi: ${formatCurrency(details.costi_fissi)}`);
  summary.push(`Totale Base: ${formatCurrency(calculateBaseCost(details))}`);
  
  // Ricarichi
  summary.push('\n=== RICARICHI ===');
  summary.push(`MP (15%): ${formatCurrency(details.ricarico_mp)}`);
  summary.push(`Operazioni (15%): ${formatCurrency(details.ricarico_op)}`);
  summary.push(`Trasporto (2%): ${formatCurrency(details.ricarico_tr)}`);
  summary.push(`Scarto (4%): ${formatCurrency(details.ricarico_scarto)}`);
  summary.push(`Sconto (0%): ${formatCurrency(details.ricarico_sconto)}`);
  summary.push(`Totale (20%): ${formatCurrency(details.ricarico_totale)}`);
  summary.push(`Totale Ricarichi: ${formatCurrency(calculateTotalMarkups(details))}`);
  
  // Risultato finale
  summary.push('\n=== RISULTATO FINALE ===');
  summary.push(`Costo Totale: ${formatCurrency(details.costo_totale)}`);
  summary.push(`Prezzo: ${formatCurrency(details.prezzo)}`);
  
  // Riferimenti
  if (notes) {
    summary.push('\n=== RIFERIMENTI ===');
    summary.push(`Lotto: ${notes.lottoRif} pz`);
    summary.push(`Prezzo/Rif: ${formatCurrency(notes.prezzoRif)}`);
    summary.push(`Costo/Rif: ${formatCurrency(notes.costoRif)}`);
  }
  
  return summary.join('\n');
};

export default {
  parseBOMCostingDetails,
  parseBOMNotes,
  formatCurrency,
  formatPercentage,
  formatNumber,
  calculateTotalMarkups,
  calculateBaseCost,
  validateCostingDetails,
  generateCostingSummary
};
