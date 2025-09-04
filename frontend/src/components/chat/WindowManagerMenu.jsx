import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid,
  Rows,
  Columns,
  Layers,
  XCircle,
  Minimize,
} from "lucide-react";

/**
 * WindowManagerMenu component provides a floating control panel
 * for managing multiple chat windows arrangement
 */
const WindowManagerMenu = ({
  isOpen,
  onClose,
  windowManager,
  onCloseAll,
  openChats = [],
  minimizedChats = [],
  onMinimizeChat,
  restoreChat,
}) => {


  // Don't render if closed or no chats
  if (!isOpen || openChats.length === 0) {
   
    return null;
  }

  // Animation variants
  const menuVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  const handleArrangeGrid = () => {
   
    
    if (!windowManager) {
      console.error('[WindowManagerMenu] windowManager non disponibile');
      return;
    }
    
    if (!windowManager.arrangeWindowsGrid) {
      console.error('[WindowManagerMenu] windowManager.arrangeWindowsGrid non disponibile');
     
      return;
    }
    
  
    
    try {
      windowManager.arrangeWindowsGrid();
     
    } catch (error) {
      console.error('[WindowManagerMenu] Errore in arrangeWindowsGrid:', error);
    }
    
    onClose();
  };

  const handleTileVertical = () => {
    
    if (!windowManager?.tileWindowsVertically) {
      console.error('[WindowManagerMenu] windowManager.tileWindowsVertically non disponibile');
      return;
    }
    
    try {
      windowManager.tileWindowsVertically();
    
    } catch (error) {
      console.error('[WindowManagerMenu] Errore in tileWindowsVertically:', error);
    }
    
    onClose();
  };

  const handleTileHorizontal = () => {
    
    
    if (!windowManager?.tileWindowsHorizontally) {
      console.error('[WindowManagerMenu] windowManager.tileWindowsHorizontally non disponibile');
      return;
    }
    
    
    
    try {
      windowManager.tileWindowsHorizontally();
     
    } catch (error) {
      console.error('[WindowManagerMenu] Errore in tileWindowsHorizontally:', error);
    }
    
    onClose();
  };

  const handleCascade = () => {
    
    
    if (!windowManager?.cascadeWindows) {
      console.error('[WindowManagerMenu] windowManager.cascadeWindows non disponibile');
      return;
    }
    
    
    
    try {
      windowManager.cascadeWindows();
     
    } catch (error) {
      console.error('[WindowManagerMenu] Errore in cascadeWindows:', error);
    }
    
    onClose();
  };

  const handleMinimizeToggle = () => {
    
      
    // Trova le chat visibili (in openChats ma non in minimizedChats)
    const visibleChats = openChats.filter(
      (chat) =>
        !minimizedChats.some(
          (minChat) => minChat.notificationId === chat.notificationId,
        ),
    );

   

    if (visibleChats.length > 0) {
      // Minimizza tutte le chat visibili
      visibleChats.forEach((chat, index) => {
        setTimeout(() => {
          
          
          if (windowManager?.toggleMinimize) {
            windowManager.toggleMinimize(chat.notificationId);
          }
        }, index * 50);
      });
    } else if (minimizedChats.length > 0) {
      // Ripristina tutte le chat minimizzate
      minimizedChats.forEach((chat, index) => {
        setTimeout(() => {
          
          
          if (windowManager?.toggleMinimize) {
            windowManager.toggleMinimize(chat.notificationId);
          }
        }, index * 50);
      });
    }
    
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="window-manager-menu"
          className="fixed top-20 right-10 z-[10050] bg-white rounded-lg shadow-xl border border-gray-200"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={menuVariants}
          transition={{ duration: 0.2 }}
        >
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Gestione Finestre
              </h3>
              <button
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                onClick={onClose}
              >
                <XCircle className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={handleCascade}
                title="Disponi a cascata"
              >
                <Layers className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-xs text-gray-600">Cascata</span>
              </button>

              <button
                className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={handleTileVertical}
                title="Affianca orizzontalmente"
              >
                <Rows className="h-5 w-5 text-green-600 mb-1" />
                <span className="text-xs text-gray-600">Orizzontale</span>
              </button>

              <button
                className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={handleTileHorizontal}
                title="Affianca verticalmente"
              >
                <Columns className="h-5 w-5 text-purple-600 mb-1" />
                <span className="text-xs text-gray-600">Verticale</span>
              </button>

              <button
                className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={handleArrangeGrid}
                title="Disponi a griglia"
              >
                <Grid className="h-5 w-5 text-amber-600 mb-1" />
                <span className="text-xs text-gray-600">Griglia</span>
              </button>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="flex items-center justify-center p-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  onClick={() => {
                   
                    onCloseAll();
                    onClose();
                  }}
                  title="Chiudi tutte le finestre"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  <span>Chiudi Tutte</span>
                </button>

                <button
                  className="flex items-center justify-center p-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                  onClick={handleMinimizeToggle}
                  title="Minimizza tutte le finestre visibili o ripristina tutte quelle minimizzate"
                >
                  <Minimize className="h-4 w-4 mr-1" />
                  <span>Min/Ripristina</span>
                </button>
              </div>
            </div>
          </div>

          {/* Debug info - rimuovi in produzione */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 border-t border-gray-100 text-xs text-gray-500">
              <div>Open: {openChats.length}, Min: {minimizedChats.length}</div>
              <div>WM: {windowManager ? 'OK' : 'NO'}</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WindowManagerMenu;