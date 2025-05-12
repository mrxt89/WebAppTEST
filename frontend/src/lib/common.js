// lib/common.js
import Swal from 'sweetalert2';

// Configura Swal per un utilizzo coerente in tutto il progetto
export const swal = Swal.mixin({
  confirmButtonColor: '#2C3E50',
  cancelButtonColor: 'rgb(224, 42, 42);',
  confirmButtonText: 'OK',
  customClass: {
    icon: 'swal-icon',
    title: 'swal-title',
    content: 'swal-content',
    // Aggiungi queste classi
    container: 'swal-container',
    popup: 'swal-popup',
    backdrop: 'swal-backdrop'
  },
});

/**
 * Formatta i bytes in unità leggibili (KB, MB, GB, etc.)
 * @param {number} bytes - Dimensione in bytes
 * @param {number} decimals - Numero di decimali da visualizzare
 * @returns {string} Dimensione formattata con unità
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Altre funzioni comuni possono essere aggiunte qui
export const someCommonFunction = () => {
  // Implementazione della funzione comune
};

export const playSuccessSound = () => {
  try {
    const audio = new Audio('/audio/success.wav');
    
    audio.addEventListener('error', (e) => {
      console.error('Errore durante il caricamento dell\'audio:', e);
    });

    audio.addEventListener('canplaythrough', () => {
      console.log('Audio pronto per la riproduzione');
    });

    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Audio in riproduzione');
        })
        .catch(error => {
          console.warn('Riproduzione audio non riuscita:', error);
        });
    }
  } catch (error) {
    console.error('Errore nella creazione dell\'oggetto Audio:', error);
  }
};