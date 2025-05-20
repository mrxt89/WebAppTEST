import { Button } from "@/components/ui/button";
import { TeamMemberWithRole } from "./TeamMemberWithRole";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  hasAdminPermission,
  canEditMemberRole,
} from "@/lib/taskPermissionsUtils";
import { User, UserPlus, Search, Shield } from "lucide-react";

const ProjectTeamSection = ({
  project,
  isAddMemberDialogOpen,
  setIsAddMemberDialogOpen,
  newMember,
  setNewMember,
  handleAddMember,
  handleRemoveMember,
  updateMemberRole,
  currentUserId,
  userSearchQuery,
  setUserSearchQuery,
  getFilteredUsers,
}) => {
  const canAddMembers = hasAdminPermission(project, currentUserId);

  return (
    <>
      <div className="flex-none flex flex-row items-center justify-between">
        <h3 className="text-xl font-semibold">Team di Progetto</h3>
        {canAddMembers && (
          <Dialog
            open={isAddMemberDialogOpen}
            onOpenChange={setIsAddMemberDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Aggiungi Utente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
              <DialogHeader className="border-b pb-2 mb-3">
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                  Aggiungi utente al Team
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 overflow-y-auto pr-2">
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                  <h3 className="text-xs font-medium text-gray-500">Seleziona utente</h3>
                  
                  <div>
                    <Label htmlFor="userSearch" className="flex items-center text-sm">
                      <Search className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Cerca utente
                    </Label>
                    <Input
                      id="userSearch"
                      placeholder="Cerca per nome o cognome..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="userId" className="flex items-center text-sm">
                      <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Utente <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={newMember.userId}
                      onValueChange={(value) =>
                        setNewMember({ ...newMember, userId: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleziona utente" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredUsers().map((user) => (
                          <SelectItem
                            key={user.userId}
                            value={user.userId.toString()}
                          >
                            <div className="flex items-center">
                              <User className="h-3.5 w-3.5 mr-2 text-gray-500" />
                              {user.firstName} {user.lastName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                  <h3 className="text-xs font-medium text-gray-500">Assegnazione ruolo</h3>
                  
                  <div>
                    <Label htmlFor="role" className="flex items-center text-sm">
                      <Shield className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Ruolo <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value) =>
                        setNewMember({ ...newMember, role: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleziona ruolo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          <div className="flex items-center">
                            <Shield className="h-3.5 w-3.5 mr-2 text-red-500" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="MANAGER">
                          <div className="flex items-center">
                            <Shield className="h-3.5 w-3.5 mr-2 text-blue-500" />
                            Manager
                          </div>
                        </SelectItem>
                        <SelectItem value="USER">
                          <div className="flex items-center">
                            <Shield className="h-3.5 w-3.5 mr-2 text-green-500" />
                            User
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Seleziona il livello di accesso dell'utente al progetto
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end border-t pt-3 mt-3">
                  <Button
                    onClick={handleAddMember}
                    className="shadow-sm"
                    disabled={!newMember.userId || !project}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Aggiungi al Team
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 mt-2">
        {project.members?.length > 0 ? (
          project.members.map((member) => (
            <TeamMemberWithRole
              key={member.ProjectMemberID}
              member={member}
              onRemove={
                canAddMembers ? handleRemoveMember : null
              }
              onRoleUpdate={updateMemberRole}
              canEditRole={canEditMemberRole(
                project,
                currentUserId,
                member.UserID,
              )}
              currentUserId={currentUserId}
            />
          ))
        ) : (
          <Alert>
            <AlertDescription>Nessun utente nel team.</AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
};

export default ProjectTeamSection;
