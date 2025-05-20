// DocumentLinkedChats.jsx
import React, { useState, useEffect } from "react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import {
  Search,
  Filter,
  FileText,
  Package,
  Users,
  File,
  Link,
  MessageSquare,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

const DocumentLinkedChats = () => {
  const [searchType, setSearchType] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);

  const { searchChatsByDocument, openChatInReadOnlyMode } = useNotifications();

  // Opzioni di tipo documento
  const searchTypes = [
    { id: "all", label: "Tutti i documenti", icon: <Link /> },
    { id: "Customer", label: "Clienti", icon: <Users /> },
    { id: "Supplier", label: "Fornitori", icon: <Users /> },
    { id: "SaleOrd", label: "Ordini cliente", icon: <FileText /> },
    { id: "MO", label: "Ordini di produzione", icon: <Package /> },
    { id: "SaleDoc", label: "Documenti di vendita", icon: <File /> },
    { id: "Item", label: "Articoli", icon: <Package /> },
    { id: "BOM", label: "Distinte base", icon: <File /> },
  ];

  // Effettua la ricerca quando cambiano i criteri
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchValue.trim() || searchType !== "all") {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchType, searchValue]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const results = await searchChatsByDocument(searchType, searchValue);
      setSearchResults(results || []);
    } catch (error) {
      console.error("Errore ricerca chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = async (chatId, isUserMember) => {
    try {
      if (!isUserMember) {
        // Se l'utente non è membro, accedi in sola lettura
        await openChatInReadOnlyMode(chatId);
      }

      // In ogni caso, apri la chat
      // Qui useremo la funzione esistente per aprire la chat
      window.openChatModal(chatId);
    } catch (error) {
      console.error("Errore apertura chat:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-blue-50 flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center">
          <Link className="h-5 w-5 mr-2 text-blue-500" />
          Chat collegate a documenti
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-full hover:bg-blue-100"
        >
          {expanded ? "-" : "+"}
        </button>
      </div>

      {expanded && (
        <div className="p-4">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo di ricerca
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
              >
                {searchTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valore da cercare
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Codice, nome o riferimento..."
                  className="flex-1 border border-gray-300 rounded-l-md p-2 text-sm"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 border-b flex justify-between items-center">
              <span>Risultati</span>
              <span className="text-xs text-gray-500">
                {searchResults.length} chat trovate
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">
                    Ricerca in corso...
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchType !== "all" || searchValue
                    ? "Nessun risultato trovato"
                    : "Inserisci criteri di ricerca per trovare le chat"}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {searchResults.map((chat) => (
                    <div
                      key={chat.notificationId}
                      className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${chat.isUserMember ? "border-l-4 border-green-500" : ""}`}
                      onClick={() =>
                        handleChatClick(chat.notificationId, chat.isUserMember)
                      }
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div
                            className="p-2 rounded-full"
                            style={{
                              backgroundColor: chat.hexColor || "#e5e7eb",
                            }}
                          >
                            <MessageSquare className="h-5 w-5 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">
                              {chat.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(chat.tbCreated).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 truncate mt-1">
                            {chat.lastMessage}
                          </div>

                          <div className="mt-2 flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {chat.categoryName}
                            </span>

                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <Users className="h-3 w-3 mr-1" />
                              {chat.participantCount}
                            </span>

                            {chat.isClosed && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Chiusa
                              </span>
                            )}

                            {!chat.isUserMember && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Info className="h-3 w-3 mr-1" />
                                Sola lettura
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-gray-600">
                            <div className="flex flex-wrap gap-1">
                              {chat.DocumentType && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                  {chat.DocumentType}
                                </span>
                              )}

                              {chat.BOM && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                  DB: {chat.BOM}
                                </span>
                              )}

                              {chat.SaleOrdId > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">
                                  OC: {chat.SaleOrdId}
                                </span>
                              )}

                              {chat.MOId > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                                  ODP: {chat.MOId}
                                </span>
                              )}

                              {chat.ItemCode && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                  Art: {chat.ItemCode}
                                </span>
                              )}

                              {chat.CustSuppCode && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                                  {chat.CustSuppType === 3211265
                                    ? "Cliente"
                                    : "Fornitore"}
                                  : {chat.CustSuppCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentLinkedChats;
