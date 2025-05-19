import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">
            {title || "Sei sicuro?"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-gray-700">
          {message || "L'eliminazione non può essere annullata!"}
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Sì, elimina
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
