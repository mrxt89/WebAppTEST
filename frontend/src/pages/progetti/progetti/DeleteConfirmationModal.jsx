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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[400px]"
        onOpenAutoFocus={(e) => {
          // Previene il focus automatico sui pulsanti
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Chiude il dialogo quando si clicca fuori
          e.preventDefault();
          onClose();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-red-600">
            {title || "Sei sicuro?"}
          </DialogTitle>
          <DialogDescription>
            {message || "L'eliminazione non può essere annullata!"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            type="button"
          >
            Annulla
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            type="button"
          >
            Sì, elimina
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
