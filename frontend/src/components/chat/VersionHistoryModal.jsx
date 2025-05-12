import React from 'react';
import Modal from 'react-modal';
import { X, Clock } from 'lucide-react';

// Assicurati che Modal sia configurato correttamente
Modal.setAppElement('#root');

const VersionHistoryModal = ({ 
  isOpen, 
  onClose, 
  versionData, 
  loadingVersions 
}) => {
  if (!versionData && !loadingVersions) return null;
  
  // Funzioni helper per formattare le date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Cronologia versioni"
      className="react-modal-content" // Classe personalizzata
      overlayClassName="react-modal-overlay" // Classe personalizzata
      style={{
        overlay: {
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          position: 'relative',
          top: '50%', // Posiziona al 50% dall'alto
          left: '50%', // Posiziona al 50% da sinistra
          transform: 'translate(-50%, -50%)', // Sposta indietro del 50% delle sue dimensioni
          maxHeight: '80vh',
          width: '100%',
          maxWidth: '500px',
          border: 'none',
          borderRadius: '8px',
          outline: 'none',
          padding: '20px',
          backgroundColor: 'white',
          inset: 'auto', // Rimuove le impostazioni predefinite di inset di react-modal
        }
      }}
    >
      {/* CSS inline per assicurarsi che il modale sia centrato */}
      <style jsx="true">{`
        .react-modal-overlay {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        .react-modal-content {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          right: auto !important;
          bottom: auto !important;
          transform: translate(-50%, -50%) !important;
          margin: 0 !important;
          max-height: 80vh !important;
          width: 100% !important;
          max-width: 500px !important;
        }
      `}</style>
      
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h3 className="text-lg font-medium">Cronologia del messaggio</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {loadingVersions ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Caricamento cronologia...</p>
          </div>
        ) : versionData ? (
          <div className="flex-1 overflow-y-auto">
            {versionData.currentMessage && (
              <div className="mb-4">
                <div className="font-medium text-sm mb-1 flex items-center">
                  <span>Versione corrente</span>
                  <span className="ml-auto text-xs text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {versionData.currentMessage.lastEditDate ? (
                      <>
                        {formatDate(versionData.currentMessage.lastEditDate)}{' '}
                        {formatTime(versionData.currentMessage.lastEditDate)}
                      </>
                    ) : 'Data non disponibile'}
                  </span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 whitespace-pre-line">
                  {versionData.currentMessage.CurrentMessage}
                </div>
              </div>
            )}
            
            {versionData.versionHistory && versionData.versionHistory.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Versioni precedenti</h4>
                {versionData.versionHistory.map((version, index) => (
                  <div key={version.VersionID || index} className="border-t pt-3">
                    <div className="font-medium text-xs mb-1 flex items-center text-gray-500">
                      <span>Versione {versionData.versionHistory.length - index}</span>
                      <span className="ml-auto">
                        {formatDate(version.EditedDate)}{' '}
                        {formatTime(version.EditedDate)}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-line">
                      {version.PreviousMessage}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      Modificato da: {version.EditedByName || 'Utente'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                Non sono disponibili versioni precedenti
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-6">
            Nessuna cronologia disponibile
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VersionHistoryModal;