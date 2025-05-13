import React from 'react';
import Modal from 'react-modal';
import { X, Clock, History, AlertCircle, User } from 'lucide-react';

// Ensure Modal is correctly configured
Modal.setAppElement('#root');

const VersionHistoryModal = ({ 
  isOpen, 
  onClose, 
  versionData, 
  loadingVersions 
}) => {
  if (!versionData && !loadingVersions) return null;
  
  // Helper functions to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Data non disponibile';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Data non valida';
    }
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '';
    }
  };
  
  // Get the current version message text (handling different possible property names)
  const getCurrentMessageText = () => {
    if (!versionData || !versionData.currentMessage) return '';
    
    // Try different possible property names
    return versionData.currentMessage.CurrentMessage || 
           versionData.currentMessage.message || 
           (typeof versionData.currentMessage === 'string' ? versionData.currentMessage : '');
  };
  
  // Get the edit date of the current version
  const getCurrentEditDate = () => {
    if (!versionData || !versionData.currentMessage) return null;
    
    return versionData.currentMessage.lastEditDate || 
           versionData.currentMessage.EditedDate ||
           null;
  };
  
  // Extract version history safely
  const getVersionHistory = () => {
    if (!versionData) return [];
    
    return (versionData.versionHistory || []).filter(v => !!v);
  };
  
  // Get the message text from a version history item
  const getVersionMessageText = (version) => {
    if (!version) return '';
    
    return version.PreviousMessage || 
           version.message || 
           (typeof version === 'string' ? version : '');
  };
  
  // Get the editor name from a version history item
  const getEditorName = (version) => {
    if (!version) return 'Utente';
    
    return version.EditedByName || 
           version.editorName || 
           'Utente';
  };
  
  // Get the edit date from a version history item
  const getVersionEditDate = (version) => {
    if (!version) return null;
    
    return version.EditedDate || 
           version.editDate || 
           null;
  };
  
  const versions = getVersionHistory();
  const currentMessageText = getCurrentMessageText();
  const currentEditDate = getCurrentEditDate();
  
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Cronologia versioni"
      className="version-history-modal"
      overlayClassName="version-history-modal-overlay"
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
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '80vh',
          width: '100%',
          maxWidth: '550px',
          border: 'none',
          borderRadius: '12px',
          outline: 'none',
          padding: '0',
          backgroundColor: 'white',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          inset: 'auto',
        }
      }}
    >
      <style jsx="true">{`
        .version-history-modal-overlay {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 20px;
        }
        
        .version-history-modal {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          max-height: 80vh !important;
          width: 100% !important;
          max-width: 550px !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        .version-history-header {
          position: sticky;
          top: 0;
          background-color: white;
          z-index: 10;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .version-card {
          transition: all 0.2s ease;
        }
        
        .version-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .current-version-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
          border-color: #93c5fd;
        }
        
        .edit-badge {
          display: inline-flex;
          align-items: center;
          background-color: #f3f4f6;
          border-radius: 9999px;
          padding: 2px 8px;
          font-size: 0.75rem;
          color: #4b5563;
        }
        
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .animated-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message-text {
          white-space: pre-line;
          word-break: break-word;
        }
      `}</style>
      
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="version-history-header px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <History className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Cronologia del messaggio</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {loadingVersions ? (
            <div className="flex flex-col items-center justify-center py-12 animated-fade-in">
              <div className="loading-spinner rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
              <p className="mt-4 text-gray-600 font-medium">Caricamento cronologia...</p>
            </div>
          ) : versionData ? (
            <div className="space-y-6 animated-fade-in">
              {/* Current Version */}
              {currentMessageText && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="edit-badge">
                      <span className="font-medium mr-1">Versione corrente</span>
                    </div>
                    {currentEditDate && (
                      <div className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        <span>{formatDate(currentEditDate)} {formatTime(currentEditDate)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="version-card current-version-card p-4 rounded-lg border">
                    <div className="message-text text-gray-800">
                      {currentMessageText}
                    </div>
                    
                    {versionData.currentMessage && versionData.currentMessage.editCount > 0 && (
                      <div className="mt-2 text-xs text-blue-500">
                        Modificato {versionData.currentMessage.editCount} {versionData.currentMessage.editCount === 1 ? 'volta' : 'volte'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Version History */}
              {versions.length > 0 ? (
                <div className="space-y-6">
                  <h4 className="text-sm font-semibold text-gray-500 flex items-center border-b pb-2">
                    <History className="h-4 w-4 mr-2" />
                    Versioni precedenti ({versions.length})
                  </h4>
                  
                  <div className="space-y-6">
                    {versions.map((version, index) => (
                      <div key={version.VersionID || index} className="space-y-2 animated-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                        <div className="flex items-center justify-between">
                          <div className="edit-badge">
                            <span>Versione {versions.length - index}</span>
                          </div>
                          {getVersionEditDate(version) && (
                            <div className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              <span>
                                {formatDate(getVersionEditDate(version))} {formatTime(getVersionEditDate(version))}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="version-card bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="message-text text-gray-700">
                            {getVersionMessageText(version)}
                          </div>
                        </div>
                        
                        <div className="flex justify-end text-xs text-gray-500 items-center">
                          <User className="h-3 w-3 mr-1.5" />
                          <span>Modificato da: {getEditorName(version)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Non sono disponibili versioni precedenti</p>
                  <p className="text-gray-400 text-sm mt-1">Questo messaggio non è stato modificato in precedenza</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Nessuna cronologia disponibile</p>
              <p className="text-gray-500 text-sm mt-1">Non è stato possibile recuperare le informazioni</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VersionHistoryModal;