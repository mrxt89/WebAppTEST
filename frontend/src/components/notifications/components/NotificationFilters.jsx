import { useRef, useEffect } from "react";
import {
  Plus,
  Filter,
  Star,
  AtSign,
  Send,
  X,
  Search,
  LogOut,
  Archive,
  BellOff,
  Link,
} from "lucide-react";
import DoNotDisturbToggle from "@/components/chat/DoNotDisturbToggle";

const NotificationFilters = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectBackgroundColor,
  setSelectBackgroundColor,
  uniqueCategories,
  isFilterExpanded,
  setIsFilterExpanded,
  isDocumentSearchVisible,
  setIsDocumentSearchVisible,
  filterMentioned,
  setFilterMentioned,
  filterMessagesSent,
  setFilterMessagesSent,
  showUnreadOnly,
  setShowUnreadOnly,
  filterFavorites,
  setFilterFavorites,
  completedFilter,
  setCompletedFilter,
  filterLeftChats,
  setFilterLeftChats,
  filterArchivedChats,
  setFilterArchivedChats,
  filterMutedChats,
  setFilterMutedChats,
  archivedUnreadCount,
  handleOpenNewMessageModal,
  handleToggleArchivedFilter,
}) => {
  const filterExpandedRef = useRef(null);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleCategoryChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedCategory(selectedValue);

    if (selectedValue === "all") {
      setSelectBackgroundColor("#ffffff");
    } else {
      const selectedCategory = uniqueCategories.find(
        (category) => category.id.toString() === selectedValue,
      );
      if (selectedCategory) {
        setSelectBackgroundColor(selectedCategory.color);
      }
    }
  };

  const handleCompletedFilterChange = (value) => {
    setCompletedFilter(value);
  };

  const toggleFilterExpansion = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  const toggleDocumentSearch = () => {
    setIsDocumentSearchVisible(!isDocumentSearchVisible);
  };

  const resetAllFilters = () => {
    setShowUnreadOnly(false);
    setFilterFavorites(false);
    setFilterMentioned(false);
    setFilterMessagesSent(false);
    setSelectedCategory("all");
    setSearchTerm("");
    setCompletedFilter("all");
    setFilterLeftChats(false);
    setFilterArchivedChats(false);
    setFilterMutedChats(false);
  };

  // Effetto per gestire il click fuori dai filtri espansi
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isFilterExpanded &&
        filterExpandedRef.current &&
        !filterExpandedRef.current.contains(event.target)
      ) {
        const filterToggleButton = document.getElementById(
          "notification-filter-toggle",
        );
        if (!filterToggleButton?.contains(event.target)) {
          setIsFilterExpanded(false);
        }
      }
    };

    if (isFilterExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterExpanded, setIsFilterExpanded]);

  return (
    <div className="filterControls" id="notification-sidebar-filterControls">
      {/* Search bar */}
      <div className="px-2 mb-2 w-100">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Cerca notifiche..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full p-2 pl-9 pr-9 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            id="notification-search-input"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none w-100 justify-content-end px-2.5">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              id="notification-search-clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visible filters */}
      <div className="flex items-center justify-center w-100 z-50 px-2 mb-1">
        <div className="flex w-100 z-50 items-center space-x-2">
          <button
            className={`p-2 flex items-center justify-center ${isFilterExpanded ? "bg-blue-50 text-blue-600" : "bg-white text-gray-700"} border border-gray-200 rounded-lg hover:bg-gray-50`}
            style={{ zIndex: 100 }}
            onClick={toggleFilterExpansion}
            title="Filtri"
            id="notification-filter-toggle"
          >
            <Filter className="w-5 h-5" />
          </button>

          <button
            className={`archa-button z-50 flex items-center justify-center w-10 h-10 p-2 ${isDocumentSearchVisible ? "text-blue-600 bg-blue-50" : "text-gray-700 bg-white"} border border-gray-200 rounded-lg hover:bg-gray-50`}
            onClick={toggleDocumentSearch}
            title="Cerca chat per documento"
            id="notification-document-search-button"
          >
            <Link className="w-5 h-5" />
          </button>

          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            id="notification-category-filter"
            className="h-10 w-100 p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ backgroundColor: selectBackgroundColor, zIndex: 100 }}
          >
            <option value="all">Tutte le categorie</option>
            {uniqueCategories.map((category) => (
              <option
                key={`category-${category.id}`}
                value={category.id}
                style={{ backgroundColor: category.color }}
                title={category.name}
              >
                {category.name}
              </option>
            ))}
          </select>

          <button
            className="archa-button z-50 flex items-center justify-center w-10 h-10 p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            onClick={handleOpenNewMessageModal}
            title="Nuovo messaggio"
            id="notification-new-message-button"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded filter options */}
      {isFilterExpanded && (
        <div
          className="px-3 py-2 mb-2 bg-white rounded-lg mx-2 border border-gray-200 shadow-md"
          id="notification-expanded-filters"
          ref={filterExpandedRef}
          style={{
            zIndex: 100,
            width: window.innerWidth < 768 ? "95vw" : "calc(100% - 0.5rem)",
            position: "absolute",
            top: "95px",
            right: window.innerWidth < 768 ? "0px" : "340px",
            backgroundColor: "#ffffff",
            borderRadius: "0.5rem",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          {/* Header con titolo e pulsante di chiusura */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <h3 className="text-sm font-semibold">Filtri notifiche</h3>
            <button
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              onClick={toggleFilterExpansion}
              id="notification-filter-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Non disturbare */}
          <div className="mb-4">
            <DoNotDisturbToggle />
          </div>

          {/* Filtri di base - layout a griglia */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">
              Filtri principali
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {/* Filtro notifiche non lette */}
              <div
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                  showUnreadOnly
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <input
                  type="checkbox"
                  id="notification-unread-switch"
                  checked={showUnreadOnly}
                  onChange={(e) => {
                    e.stopPropagation();
                    setShowUnreadOnly(e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="notification-unread-switch"
                  className="text-sm cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Solo non lette
                </label>
              </div>

              {/* Filtro preferiti */}
              <div
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                  filterFavorites
                    ? "bg-yellow-50 border border-yellow-200 text-yellow-700"
                    : "hover:bg-gray-50 border border-transparent text-gray-700"
                }`}
                onClick={() => setFilterFavorites(!filterFavorites)}
                id="notification-favorites-filter"
              >
                <Star
                  className={`w-4 h-4 ${filterFavorites ? "fill-yellow-500 text-yellow-500" : ""}`}
                />
                <span className="text-sm">Preferiti</span>
              </div>
            </div>
          </div>

          {/* Filtri per tipo - layout a griglia */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">
              Tipo di notifiche
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {/* Filtro menzioni */}
              <div
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                  filterMentioned
                    ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                    : "hover:bg-gray-50 border border-transparent text-gray-700"
                }`}
                onClick={() => setFilterMentioned(!filterMentioned)}
                id="notification-mentioned-filter"
              >
                <AtSign className="w-4 h-4" />
                <span className="text-sm">Menzioni</span>
              </div>

              {/* Filtro messaggi inviati */}
              <div
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                  filterMessagesSent
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "hover:bg-gray-50 border border-transparent text-gray-700"
                }`}
                onClick={() => setFilterMessagesSent(!filterMessagesSent)}
                id="notification-sent-filter"
              >
                <Send className="w-4 h-4" />
                <span className="text-sm">Miei messaggi</span>
              </div>
            </div>
          </div>

          {/* Filtri per stato - layout a griglia */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Stato</h4>
            <div className="grid grid-cols-2 gap-2">
              {/* Filtro chat abbandonate */}
              <div
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                  filterLeftChats
                    ? "bg-amber-50 border border-amber-200 text-amber-700"
                    : "hover:bg-gray-50 border border-transparent text-gray-700"
                }`}
                onClick={() => setFilterLeftChats(!filterLeftChats)}
                id="notification-left-chats-filter"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Abbandonate</span>
              </div>

              {/* Filtro chat archiviate */}
              <div
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                  filterArchivedChats
                    ? "bg-purple-50 border border-purple-200 text-purple-700"
                    : "hover:bg-gray-50 border border-transparent text-gray-700"
                }`}
                onClick={handleToggleArchivedFilter}
                id="notification-archived-chats-filter"
              >
                <Archive className="w-4 h-4" />
                <span className="text-sm">Archiviate</span>
                {archivedUnreadCount > 0 && !filterArchivedChats && (
                  <span className="flex items-center justify-center ml-1 bg-red-500 text-white text-xs font-semibold h-5 w-5 rounded-full">
                    {archivedUnreadCount}
                  </span>
                )}
              </div>

              {/* Filtro chat silenziate */}
              <div
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                  filterMutedChats
                    ? "bg-rose-50 border border-rose-200 text-rose-700"
                    : "hover:bg-gray-50 border border-transparent text-gray-700"
                }`}
                onClick={() => setFilterMutedChats(!filterMutedChats)}
                id="notification-muted-filter"
              >
                <BellOff className="w-4 h-4" />
                <span className="text-sm">Silenziate</span>
              </div>
            </div>
          </div>

          {/* Filtro stato completamento */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              Stato completamento
            </label>
            <div
              className="flex justify-between bg-white border border-gray-200 rounded-lg p-0.5"
              id="notification-completion-filter"
            >
              <button
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  completedFilter === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => handleCompletedFilterChange("all")}
                id="notification-filter-all"
              >
                Tutte
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  completedFilter === "active"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => handleCompletedFilterChange("active")}
                id="notification-filter-active"
              >
                Attive
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  completedFilter === "completed"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => handleCompletedFilterChange("completed")}
                id="notification-filter-completed"
              >
                Completate
              </button>
            </div>
          </div>

          {/* Pulsante per reimpostare tutti i filtri */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <button
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
              onClick={resetAllFilters}
            >
              Reimposta tutti i filtri
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationFilters; 