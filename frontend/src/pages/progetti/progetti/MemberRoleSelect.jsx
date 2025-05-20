import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ChevronDown, Edit } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const MemberRoleSelect = ({ member, onRoleUpdate, disabled = false }) => {
  const [role, setRole] = useState(member.Role);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setRole(member.Role);
  }, [member.Role]);

  const handleRoleChange = async (newRole) => {
    if (newRole === role || disabled) return;

    try {
      setIsUpdating(true);

      // Prepara i dati per l'aggiornamento
      const updatedMember = {
        projectMemberId: member.ProjectMemberID,
        userId: member.UserID,
        role: newRole,
      };

      // Chiama la funzione di aggiornamento passata come prop
      const success = await onRoleUpdate(updatedMember);

      if (success) {
        setRole(newRole);
        toast({
          title: "Ruolo aggiornato",
          description: "Il ruolo dell'utente è stato aggiornato con successo",
          variant: "success",
          duration: 3000,
          style: { backgroundColor: "#2c7a7b", color: "#fff" },
        });
      } else {
        toast({
          title: "Errore",
          description: "Impossibile aggiornare il ruolo dell'utente",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error updating member role:", error);
      toast({
        title: "Errore",
        description:
          "Si è verificato un errore durante l'aggiornamento del ruolo",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800 border-red-200";
      case "MANAGER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "USER":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Se disabilitato, mostra solo un badge con il ruolo
  if (disabled) {
    return (
      <Badge variant="outline" className={getRoleBadgeColor()}>
        {role}
      </Badge>
    );
  }

  return (
    <Select
      value={role}
      onValueChange={handleRoleChange}
      disabled={isUpdating || disabled}
    >
      <SelectTrigger className={`w-32 ${getRoleBadgeColor()} relative group`}>
        {isUpdating ? (
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Aggiornando...</span>
          </div>
        ) : (
          <>
            <SelectValue placeholder="Seleziona ruolo" />
            <span className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit className="h-3 w-3 text-blue-500" />
            </span>
          </>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ADMIN" className="flex items-center">
          <div className="flex items-center">
            {role === "ADMIN" && (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            )}
            <span className={role === "ADMIN" ? "font-medium" : ""}>Admin</span>
          </div>
        </SelectItem>
        <SelectItem value="MANAGER" className="flex items-center">
          <div className="flex items-center">
            {role === "MANAGER" && (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            )}
            <span className={role === "MANAGER" ? "font-medium" : ""}>
              Manager
            </span>
          </div>
        </SelectItem>
        <SelectItem value="USER" className="flex items-center">
          <div className="flex items-center">
            {role === "USER" && (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            )}
            <span className={role === "USER" ? "font-medium" : ""}>User</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default MemberRoleSelect;
