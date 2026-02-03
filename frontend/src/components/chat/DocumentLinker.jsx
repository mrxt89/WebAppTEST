// frontend/src/components/chat/DocumentLinker.jsx
import React, { useState, useEffect } from "react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";
import {
  X,
  Search,
  FileText,
  File,
  Package,
  Users,
  Clipboard,
  Link,
  Ticket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { swal } from "@/lib/common";

const DocumentLinker = ({ notificationId, isOpen, onClose }) => {
  const [documentType, setDocumentType] = useState("MO");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [projectId, setProjectId] = useState(null);

  const { searchDocuments, linkDocument, getLinkedDocuments } = useNotifications();
  const { linkItemToProject } = useProjectArticlesActions();

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
    { id: "Task", label: "Attività", icon: <Clipboard /> },
    { id: "Project", label: "Progetto", icon: <Clipboard /> },
    { id: "Ticket", label: "Ticket", icon: <Ticket /> },
  ];

  // Recupera il ProjectID dai documenti collegati alla chat
  useEffect(() => {
    const fetchProjectId = async () => {
      if (!notificationId || !isOpen) {
        setProjectId(null);
        return;
      }

      try {
        const linkedDocs = await getLinkedDocuments(notificationId);
        if (linkedDocs && linkedDocs.documents) {
          // Cerca un documento di tipo Project
          const projectDoc = linkedDocs.documents.find(
            (doc) => doc.DocumentType === "Project" && doc.ProjectID > 0
          );
          if (projectDoc) {
            setProjectId(projectDoc.ProjectID);
          } else {
            // Se non c'è un documento Project, cerca un Task che ha un ProjectID
            const taskDoc = linkedDocs.documents.find(
              (doc) => doc.DocumentType === "Task" && doc.ProjectID > 0
            );
            if (taskDoc) {
              setProjectId(taskDoc.ProjectID);
            } else {
              setProjectId(null);
            }
          }
        } else {
          setProjectId(null);
        }
      } catch (error) {
        console.error("Errore nel recupero del ProjectID:", error);
        setProjectId(null);
      }
    };

    fetchProjectId();
  }, [notificationId, isOpen, getLinkedDocuments]);

  // Reset alla chiusura
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSearchResults([]);
      setProjectId(null);
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
      console.log("Collegamento documento:", document);
      
      // Collega il documento alla chat
      await linkDocument(
        notificationId,
        document.DocumentId,
        document.DocumentType,
      );

      // Se è un articolo (Item) e la chat è collegata a un progetto, collega anche l'articolo al progetto
      if (document.DocumentType === "Item" && projectId) {
        try {
          // Per gli articoli:
          // - Dal gestionale: DocumentId è ItemCode (stringa), ItemId è NULL
          // - Dai progetti: DocumentId è ItemId (numero), ItemId è presente
          let itemId = null;
          
          // Se DocumentId è un numero, è un ItemId (articolo progetto)
          if (typeof document.DocumentId === "number") {
            itemId = document.DocumentId;
          } 
          // Se c'è un campo ItemId esplicito, usalo
          else if (document.ItemId && typeof document.ItemId === "number") {
            itemId = document.ItemId;
          }
          // Se DocumentId è una stringa (ItemCode), è un articolo dal gestionale
          // In questo caso non possiamo collegarlo direttamente al progetto
          // perché non ha ancora un ItemId nel database progetti
          else {
            console.log("Articolo dal gestionale (ItemCode):", document.DocumentId);
            console.log("Per collegarlo al progetto, deve essere prima importato nel progetto");
            // Non bloccare il flusso, l'articolo è comunque collegato alla chat
          }

          // Collega l'articolo al progetto solo se abbiamo un ItemId valido
          if (itemId && typeof itemId === "number") {
            console.log("Collegamento articolo al progetto:", { projectId, itemId });
            const linkResult = await linkItemToProject(projectId, itemId);
            
            if (linkResult && linkResult.success) {
              console.log("Articolo collegato al progetto con successo");
            } else {
              // Non mostrare errore se l'articolo è già associato
              if (linkResult && linkResult.msg && !linkResult.msg.includes("già associato")) {
                console.warn("Errore nel collegamento articolo al progetto:", linkResult.msg);
              }
            }
          }
        } catch (linkError) {
          console.error("Errore nel collegamento articolo al progetto:", linkError);
          // Non bloccare il flusso se il collegamento al progetto fallisce
          // L'articolo è comunque collegato alla chat
        }
      }

      await swal.fire({
        title: "Successo",
        text: "Documento collegato con successo",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      onClose();
    } catch (error) {
      console.error("Error linking document:", error);
      await swal.fire({
        title: "Errore",
        text: error.message || "Impossibile collegare il documento",
        icon: "error",
      });
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
