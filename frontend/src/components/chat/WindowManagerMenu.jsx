import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid,
  Rows,
  Columns,
  Layers,
  XCircle,
  Maximize,
  Minimize,
  Monitor,
  LayoutGrid
} from 'lucide-react';

/**
 * WindowManagerMenu component provides a floating control panel
 * for managing multiple chat windows arrangement
 * 
 * @param {boolean} isOpen - Whether the menu is visible
 * @param {Function} onClose - Function to call to close the menu
 * @param {Object} windowManager - The window manager instance with window arrangement functions
 * @param {Function} onCloseAll - Function to close all chat windows
 * @param {Array} openChats - Array of open chat objects
 */
const WindowManagerMenu = ({ 
  isOpen, 
  onClose, 
  windowManager, 
  onCloseAll,
  openChats = []
}) => {
  // Don't render if closed or no chats
  if (!isOpen || openChats.length === 0) return null;
  
  // Animation variants
  const menuVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
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
              <h3 className="text-sm font-medium text-gray-700">Gestione Finestre</h3>
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
                onClick={() => {
                  windowManager.cascadeWindows();
                  onClose();
                }}
                title="Disponi a cascata"
              >
                <Layers className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-xs text-gray-600">Cascata</span>
              </button>
              
              <button
                className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  windowManager.tileWindowsVertically();
                  onClose();
                }}
                title="Affianca orizzontalmente"
              >
                <Rows className="h-5 w-5 text-green-600 mb-1" />
                <span className="text-xs text-gray-600">Orizzontale</span>
              </button>
              
              <button
                className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  windowManager.tileWindowsHorizontally();
                  onClose();
                }}
                title="Affianca verticalmente"
              >
                <Columns className="h-5 w-5 text-purple-600 mb-1" />
                <span className="text-xs text-gray-600">Verticale</span>
              </button>
              
              <button
                className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  windowManager.arrangeWindowsGrid();
                  onClose();
                }}
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
                  onClick={() => {
                    // Toggle all windows to minimize or restore
                    const visibleWindows = windowManager.getVisibleWindows();
                    
                    if (visibleWindows.length > 0) {
                      // At least one window is visible - minimize all
                      visibleWindows.forEach(window => {
                        windowManager.toggleMinimize(window.id);
                      });
                    } else {
                      // All windows are minimized - restore all
                      const minimizedWindows = windowManager.getMinimizedWindows();
                      minimizedWindows.forEach(window => {
                        windowManager.toggleMinimize(window.id);
                      });
                    }
                    
                    onClose();
                  }}
                  title="Minimizza/Ripristina"
                >
                  <Minimize className="h-4 w-4 mr-1" />
                  <span>Min/Max</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WindowManagerMenu;