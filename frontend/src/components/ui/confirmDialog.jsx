// src/components/ConfirmDialog.jsx
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

const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title, description }) => (
  <AlertDialog open={isOpen} onOpenChange={onCancel}>
    <AlertDialogContent className="z-[100] bg-white rounded-lg shadow-lg max-w-md">
      <AlertDialogHeader className="space-y-2">
        <AlertDialogTitle className="text-xl font-semibold text-gray-900 text-center">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-gray-600 text-center">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="grid grid-cols-2 gap-3 w-full mt-6">
        <AlertDialogCancel
          className="w-full px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
          onClick={onCancel}
        >
          Annulla
        </AlertDialogCancel>
        <AlertDialogAction
          className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors mt-2"
          onClick={onConfirm}
        >
          Conferma
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmDialog;
