import React, { useState } from "react";
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
import { swal } from "../../../lib/common";

const ProjectTeamSection = ({
  project,
  users = [],
  isAddMemberDialogOpen,
  setIsAddMemberDialogOpen,
  newMember,
  setNewMember,
  handleAddMember,
  handleRemoveMember,
  updateMemberRole,
  currentUserId,
}) => {
  const canAddMembers = hasAdminPermission(project, currentUserId);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Team di Progetto</h3>

        {canAddMembers && (
          <Dialog
            open={isAddMemberDialogOpen}
            onOpenChange={setIsAddMemberDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                Aggiungi Utente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi utente al Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="userId">Utente</Label>
                  <Select
                    value={newMember.userId}
                    onValueChange={(value) =>
                      setNewMember({ ...newMember, userId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona utente" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(
                          (user) =>
                            !project.members.some(
                              (m) => m.UserID === user.userId,
                            ),
                        )
                        .sort((a, b) => a.firstName.localeCompare(b.firstName))
                        .map((user) => (
                          <SelectItem
                            key={user.userId}
                            value={user.userId.toString()}
                          >
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Ruolo</Label>
                  <Select
                    value={newMember.role}
                    onValueChange={(value) =>
                      setNewMember({ ...newMember, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona ruolo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddMember}
                  className="w-full"
                  disabled={!newMember.userId}
                >
                  Aggiungi al Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {project.members?.length > 0 ? (
          project.members.map((member) => (
            <TeamMemberWithRole
              key={member.ProjectMemberID}
              member={member}
              onRemove={
                hasAdminPermission(project, currentUserId)
                  ? handleRemoveMember
                  : null
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
    </div>
  );
};

export default ProjectTeamSection;
