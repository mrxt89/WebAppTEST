// frontend/src/components/chat/DocumentLinker.jsx
import React, { useState, useEffect } from "react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import {
  X,
  Search,
  FileText,
  File,
  Package,
  Users,
  Clipboard,
  Link,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DocumentLinker = ({ notificationId, isOpen, onClose }) => {
  const [documentType, setDocumentType] = useState("MO");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const { searchDocuments, linkDocument } = useNotifications();

  // Opzioni di tipo documento
  const documentTypes = [
    { id: "MO", label: "Ordini di produzione", icon: <Package /> },
    { id: "SaleOrd", label: "Ordini cliente", icon: <FileText /> },
    { id: "PurchaseOrd", label: "Ordini fornitore", icon: <FileText /> },
    { id: "SaleDoc", label: "Documenti di vendita", icon: <File /> },
    { id: "PurchaseDoc", label: "Documenti di acquisto", icon: <File /> },
    { id: "Item", label: "Articoli", icon: <Package /> },
    { id: "CustSupp", label: "Clienti/Fornitori", icon: <Users /> },
    { id: "BillOfMaterials", label: "Distinte base", icon: <Clipboard /> },
  ];

  // Reset alla chiusura
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSearchResults([]);
    }
  }, [isOpen]);

  // Funzione di ricerca
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const response = await searchDocuments({ documentType, searchTerm });
      setSearchResults(response.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Collega un documento
  const handleLinkDocument = async (document) => {
    try {
      await linkDocument(
        notificationId,
        document.DocumentId,
        document.DocumentType,
      );
      onClose();
    } catch (error) {
      console.error("Error linking document:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-medium flex items-center">
                <Link className="h-5 w-5 mr-2 text-blue-500" />
                Collega documento
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo di documento
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cerca
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Inserisci numero, codice o descrizione..."
                    className="flex-1 border border-gray-300 rounded-l-md p-2 text-sm"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchTerm.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 border-b">
                  Risultati
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">
                        Ricerca in corso...
                      </p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm
                        ? "Nessun risultato trovato"
                        : "Inserisci un termine di ricerca"}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {searchResults.map((doc, index) => (
                        <div
                          key={`${doc.DocumentId || doc.MOId}-${index}`}
                          className="p-3 flex items-center hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleLinkDocument(doc)}
                        >
                          <div className="mr-3 p-2 bg-gray-100 rounded-full">
                            {documentTypes.find((t) => t.id === documentType)
                              ?.icon || <File className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {doc.DocumentNumber}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {doc.DocumentDescription || doc.DocumentReference}
                            </div>
                            {doc.DocumentDate && (
                              <div className="text-xs text-gray-400">
                                {new Date(
                                  doc.DocumentDate,
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="ml-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {doc.Status || doc.DocumentType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Chiudi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DocumentLinker;
