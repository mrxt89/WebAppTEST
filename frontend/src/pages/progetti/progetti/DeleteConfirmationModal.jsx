import React, { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  const confirmButtonRef = useRef(null);
  
  // Assicuriamoci che il pulsante non riceva il focus automaticamente
  // quando il dialogo è appena aperto, per evitare conflitti con aria-hidden
  useEffect(() => {
    if (isOpen) {
      // Breve timeout per assicurarsi che il DOM sia completamente renderizzato
      const timer = setTimeout(() => {
        // Facciamo focus sul dialog stesso invece che sul bottone
        const dialogElement = document.querySelector('[role="dialog"]');
        if (dialogElement) {
          dialogElement.focus();
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">
            {title || "Sei sicuro?"}
          </DialogTitle>
          <DialogDescription>
            {message || "L'eliminazione non può essere annullata!"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} type="button">
            Annulla
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            ref={confirmButtonRef}
            type="button"
            autoFocus={false}
          >
            Sì, elimina
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
