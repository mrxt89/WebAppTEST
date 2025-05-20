import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Unlink,
  Eye,
  ListFilter,
} from "lucide-react";
import { swal } from "@/lib/common";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";

/**
 * ArticleActionsDropdown - Componente per le azioni sugli articoli
 * @param {Object} item - Articolo selezionato
 * @param {Object} project - Progetto corrente
 * @param {boolean} canEdit - Flag che indica se l'utente ha permessi di modifica
 * @param {Function} onViewDetails - Callback per visualizzare i dettagli dell'articolo
 * @param {Function} onViewBOM - Callback per visualizzare la distinta base
 * @param {Function} onEdit - Callback per modificare l'articolo
 * @param {Function} onRefresh - Callback per aggiornare la lista degli articoli
 */
const ArticleActionsDropdown = ({
  item,
  project,
  canEdit,
  onViewDetails,
  onViewBOM,
  onEdit,
  onRefresh,
}) => {
  // Stati per i dialoghi di conferma
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hook per le azioni API
  const { unlinkItemFromProject, disableTemporaryItem, canDisableItem } =
    useProjectArticlesActions();

  // Gestione rimozione articolo dal progetto
  const handleUnlinkItem = async () => {
    setShowUnlinkDialog(false);

    try {
      setLoading(true);

      const result = await unlinkItemFromProject(project.ProjectID, item.Id);

      if (result && result.success) {
        swal.fire({
          title: "Completato",
          text: "Articolo rimosso dal progetto con successo",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.msg || "Errore durante la rimozione");
      }
    } catch (error) {
      console.error("Error unlinking item:", error);
      swal.fire({
        title: "Errore",
        text:
          error.message ||
          "Si è verificato un errore durante la rimozione dell'articolo dal progetto",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Gestione disabilitazione articolo temporaneo
  const handleDisableItem = async () => {
    setShowDisableDialog(false);

    try {
      setLoading(true);

      // Prima verifichiamo se l'articolo può essere disabilitato
      const checkResult = await canDisableItem(item.Id);

      if (!checkResult.canDisable) {
        throw new Error(
          checkResult.reason || "Non è possibile disabilitare questo articolo",
        );
      }

      const result = await disableTemporaryItem(item.Id);

      if (result && result.success) {
        swal.fire({
          title: "Completato",
          text: "Articolo disabilitato con successo",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.msg || "Errore durante la disabilitazione");
      }
    } catch (error) {
      console.error("Error disabling item:", error);
      swal.fire({
        title: "Errore",
        text:
          error.message ||
          "Si è verificato un errore durante la disabilitazione dell'articolo",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if it's from ERP
  const isFromERP = item.stato_erp === 1;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={loading}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Azioni Articolo</DropdownMenuLabel>
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="h-4 w-4 mr-2" />
            Visualizza Dettagli
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onViewBOM}>
            <ListFilter className="h-4 w-4 mr-2" />
            Visualizza Distinta Base
          </DropdownMenuItem>

          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifica Articolo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowUnlinkDialog(true)}
                className="text-amber-600"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Rimuovi dal Progetto
              </DropdownMenuItem>

              {/* Disable article option - only for non-ERP articles */}
              {!isFromERP && (
                <DropdownMenuItem
                  onClick={() => setShowDisableDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disabilita Articolo
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog for unlinking from project */}
      <AlertDialog
        open={showUnlinkDialog}
        onOpenChange={setShowUnlinkDialog}
        className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md bg-white shadow-md"
      >
        <AlertDialogContent className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md bg-white shadow-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Rimuovere l'articolo dal progetto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per rimuovere l'articolo{" "}
              <span className="font-semibold">{item.Item}</span> dal progetto.
              <br />
              L'articolo continuerà ad esistere e potrà essere associato
              nuovamente in futuro.
              <br />
              <br />
              Questa azione rimuove solo l'associazione tra l'articolo e il
              progetto corrente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkItem}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for disabling temporary item */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disabilitare l'articolo?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per disabilitare l'articolo{" "}
              <span className="font-semibold">{item.Item}</span>.<br />
              L'articolo verrà contrassegnato come disabilitato e non sarà più
              visibile nelle liste.
              <br />
              <br />
              <span className="text-red-600 font-semibold">
                Questa azione non può essere annullata.
              </span>
              <br />
              Non è possibile disabilitare articoli provenienti dal gestionale o
              utilizzati in altre distinte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Disabilita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ArticleActionsDropdown;
