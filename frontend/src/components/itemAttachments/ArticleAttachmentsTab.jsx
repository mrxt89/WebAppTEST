// Frontend/src/components/itemAttachments/ArticleAttachmentsTab.js
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ItemAttachmentsPanel from './ItemAttachmentsPanel';

/**
 * ArticleAttachmentsTab - Componente per visualizzare gli allegati di un articolo
 * come tab all'interno della pagina di dettaglio dell'articolo
 * 
 * @param {Object} article - L'articolo di cui visualizzare gli allegati
 * @param {boolean} canEdit - Flag che indica se l'utente ha i permessi di modifica
 */
function ArticleAttachmentsTab({ article, canEdit = false }) {
  if (!article) {
    return (
      <Card className="border h-full flex flex-col">
        <CardContent className="p-4 flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Seleziona un articolo per visualizzarne gli allegati</p>
        </CardContent>
      </Card>
    );
  }

  // Determinare quale parametro passare in base al tipo di articolo
  const isErpItem = article.stato_erp === 1;
  
  return (
    <Card className="border h-full flex flex-col overflow-hidden">
      <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
        {isErpItem ? (
          // Per articoli da ERP, usa il codice articolo
          <ItemAttachmentsPanel
            itemCode={article.Item}
            readOnly={!canEdit}
            showHeader={false}
            maxHeight={600}
          />
        ) : (
          // Per articoli temporanei, usa l'ID dell'articolo progetto
          <ItemAttachmentsPanel
            projectItemId={article.Id}
            readOnly={!canEdit}
            showHeader={false}
            maxHeight={600}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default ArticleAttachmentsTab;