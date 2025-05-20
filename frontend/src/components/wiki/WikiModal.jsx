import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Book, PlayCircle, ChevronRight, X, Info } from "lucide-react";
import { useWikiContext } from "./WikiContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Modale principale della Wiki
 * Mostra i contenuti wiki e permette di avviare i tour guidati
 */
const WikiModal = () => {
  const {
    isWikiOpen,
    closeWiki,
    currentWikiContent,
    startTour,
    openedFromNotificationSidebar,
  } = useWikiContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("guida");

  // Effetto per gestire il cambio di visualizzazione quando richiesto
  useEffect(() => {
    if (
      isWikiOpen &&
      currentWikiContent &&
      currentWikiContent._navigateCallback
    ) {
      currentWikiContent._navigateCallback();
    }
  }, [isWikiOpen, currentWikiContent]);

  // Gestione della ricerca
  const handleSearch = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  // Gestione della chiusura del modale
  const handleCloseWiki = () => {
    closeWiki();
  };

  // Gestione per prevenire la chiusura della sidebar delle notifiche quando si interagisce con il modale
  const handleModalInteraction = (e) => {
    if (openedFromNotificationSidebar) {
      // Se il modale è stato aperto dalla sidebar delle notifiche,
      // preveniamo la propagazione per evitare che la sidebar si chiuda
      e.stopPropagation();
    }
  };

  // Se non ci sono contenuti, return null dopo gli hooks
  if (!currentWikiContent) return null;

  // Filtra le sezioni in base alla ricerca
  const filteredSections = searchQuery
    ? currentWikiContent.sections.filter(
        (section) =>
          section.title.toLowerCase().includes(searchQuery) ||
          section.content.toLowerCase().includes(searchQuery),
      )
    : currentWikiContent.sections || [];

  // Determina se ci sono tour disponibili
  const hasTours =
    currentWikiContent.tours &&
    Object.keys(currentWikiContent.tours).length > 0;

  return (
    <Dialog
      open={isWikiOpen}
      onOpenChange={handleCloseWiki}
      id="wiki-modal"
      className="wiki-modal"
      overlayClassName="wiki-modal-overlay"
    >
      <DialogContent
        className="max-w-4xl max-h-[80vh] flex flex-col wiki-modal-content"
        onInteractOutside={(e) => {
          if (openedFromNotificationSidebar) {
            e.preventDefault();
          }
        }}
        onClick={handleModalInteraction}
        style={{ zIndex: 9999 }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">
            {currentWikiContent.title || "Guida Applicazione"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {currentWikiContent.description ||
              "Benvenuto nella documentazione interattiva della piattaforma."}
          </DialogDescription>
        </DialogHeader>
        {/* Tabs */}
        <Tabs
          defaultValue="guida"
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="guida" className="flex items-center gap-1">
              <Book className="h-4 w-4" />
              <span>Guida</span>
            </TabsTrigger>

            {hasTours && (
              <TabsTrigger value="tour" className="flex items-center gap-1">
                <PlayCircle className="h-4 w-4" />
                <span>Tour Guidati</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Contenuto della guida */}
          <TabsContent value="guida" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-15rem)]">
              {filteredSections.length > 0 ? (
                <div className="space-y-4 pr-4">
                  {filteredSections.map((section, index) => (
                    <div
                      key={index}
                      className="border rounded-md p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold mb-2">
                        {section.title}
                      </h3>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />

                      {/* Se la sezione ha un tour associato */}
                      {section.tourId &&
                        currentWikiContent.tours &&
                        currentWikiContent.tours[section.tourId] && (
                          <Button
                            variant="outline"
                            className="mt-4 text-sm"
                            onClick={() => startTour(section.tourId)}
                          >
                            Mostra guida interattiva
                            <PlayCircle className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>Nessun risultato trovato</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Lista dei tour disponibili */}
          <TabsContent value="tour" className="flex-1 overflow-hidden">
            {hasTours ? (
              <ScrollArea className="h-[calc(100vh-15rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                  {Object.entries(currentWikiContent.tours).map(
                    ([tourId, tourSteps], index) => (
                      <Card
                        key={index}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold mb-2">
                            {tourSteps[0]?.title || `Tour #${index + 1}`}
                          </h3>
                          <p className="text-gray-600 mb-3">
                            {tourSteps[0]?.description ||
                              `Un tour guidato con ${tourSteps.length} passaggi`}
                          </p>
                          <Button
                            onClick={() => startTour(tourId)}
                            className="w-full justify-between"
                          >
                            Inizia il tour
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ),
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>Nessun tour disponibile per questa pagina</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button variant="outline" onClick={handleCloseWiki}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WikiModal;
