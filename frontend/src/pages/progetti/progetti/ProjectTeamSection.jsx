import React, { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  hasAdminPermission,
  canEditMemberRole,
} from "@/lib/taskPermissionsUtils";
import { User, UserPlus, Shield, Users, AlertTriangle, CheckSquare } from "lucide-react";
import { config } from "../../../config";
import { swal } from "../../../lib/common";

// Componente per la gestione della selezione dei membri
const GroupMembersSelector = React.memo(({ 
  members, 
  selectedIds, 
  onSelectionChange, 
  onSelectAll 
}) => {
  // Handle checkbox change with proper event handling
  const handleCheckboxChange = useCallback((memberId) => {
    return (e) => {
      e.stopPropagation();
      onSelectionChange(memberId);
    };
  }, [onSelectionChange]);

  return (
    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-blue-700 font-medium">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          Utenti disponibili ({members.length}):
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={onSelectAll}
        >
          <CheckSquare className="h-3 w-3 mr-1" />
          {selectedIds.length === members.length ? "Deseleziona tutti" : "Seleziona tutti"}
        </Button>
      </div>
      <ScrollArea className="h-[150px] pr-2">
        <div className="space-y-1">
          {members.map((member) => {
            const isSelected = selectedIds.includes(member.userId);
            return (
              <div
                key={member.userId}
                className="flex items-center space-x-2 p-1 hover:bg-blue-100 rounded"
              >
                <input
                  type="checkbox"
                  id={`member-${member.userId}`}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isSelected}
                  onChange={handleCheckboxChange(member.userId)}
                />
                <label
                  htmlFor={`member-${member.userId}`}
                  className="text-xs text-blue-600 cursor-pointer flex-1"
                >
                  {member.firstName} {member.lastName}
                </label>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
});

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
  getFilteredUsers,
}) => {
  const canAddMembers = hasAdminPermission(project, currentUserId);

  // Stato per gestire i gruppi
  const [assignmentType, setAssignmentType] = useState("individual"); // 'individual' o 'group'
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // Reset selected members when group changes
  useEffect(() => {
    setSelectedMemberIds([]);
  }, [selectedGroupId]);

  // Funzione per gestire la selezione/deselezione di un membro
  const handleMemberSelection = useCallback((memberId) => {
    setSelectedMemberIds(prev => {
      // Ensure we're working with the current state
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  }, []);

  // Funzione per selezionare/deselezionare tutti i membri
  const handleSelectAllMembers = useCallback(() => {
    setSelectedMemberIds(prev => {
      // Toggle between all selected and none selected
      if (prev.length === groupMembers.length) {
        return [];
      } else {
        return groupMembers.map(member => member.userId);
      }
    });
  }, [groupMembers]);

  // Carica i gruppi quando si apre il dialog
  useEffect(() => {
    if (isAddMemberDialogOpen) {
      fetchGroups();
    }
  }, [isAddMemberDialogOpen]);

  // Funzione per caricare i gruppi
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error fetching groups");
      }

      const data = await response.json();
      setAvailableGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  // Funzione per gestire la selezione di un gruppo
  const handleGroupChange = async (groupId) => {
    try {
      if (groupId === "null") {
        setSelectedGroupId(null);
        setGroupMembers([]);
        return;
      }

      const numericGroupId = parseInt(groupId);
      setSelectedGroupId(numericGroupId);

      // Carica i membri del gruppo selezionato
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/groups/${numericGroupId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error fetching group members");
      }

      const members = await response.json();
      
      // Filtra i membri che non sono già nel progetto
      const availableMembers = members.filter(
        (member) => !project.members?.some((m) => m.UserID === member.userId)
      );
      
      setGroupMembers(availableMembers);
    } catch (error) {
      console.error("Error loading group members:", error);
      swal.fire(
        "Errore",
        "Errore nel caricamento utenti del gruppo",
        "error",
      );
    }
  };

  // Funzione per aggiungere i membri selezionati del gruppo
  const handleAddGroupMembers = async () => {
    try {
      if (selectedMemberIds.length === 0) {
        swal.fire("Attenzione", "Seleziona almeno un membro del gruppo", "warning");
        return;
      }

      // Filtra solo i membri selezionati
      const selectedMembers = groupMembers.filter(member => 
        selectedMemberIds.includes(member.userId)
      );

      // Aggiunge i membri selezionati con il ruolo selezionato
      const allMembers = [
        ...project.members.map((m) => ({
          userId: m.UserID.toString(),
          role: m.Role,
        })),
        ...selectedMembers.map((member) => ({
          userId: member.userId.toString(),
          role: newMember.role,
        })),
      ];

      // Usa la funzione esistente del parent per aggiornare i membri
      const updateProjectMembers = async (projectId, members) => {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${config.API_BASE_URL}/projects/${projectId}/members`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ members }),
          },
        );

        if (!response.ok) {
          throw new Error("Error updating project members");
        }

        return { success: true };
      };

      const result = await updateProjectMembers(project.ProjectID, allMembers);

      if (result.success) {
        setIsAddMemberDialogOpen(false);
        setAssignmentType("individual");
        setSelectedGroupId(null);
        setGroupMembers([]);
        setSelectedMemberIds([]);
        setNewMember({ userId: "", role: "USER" });
        
        if (handleAddMember.refresh) {
          await handleAddMember.refresh();
        }
        
        swal.fire("Successo", `${selectedMembers.length} utenti aggiunti al progetto`, "success");
      }
    } catch (error) {
      console.error("Error adding group members:", error);
      swal.fire("Errore", "Errore nell'aggiunta utenti del gruppo", "error");
    }
  };

  const getSelectedGroup = (groupId) => {
    return availableGroups.find((group) => group.groupId === groupId);
  };

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
                  Aggiungi utente al progetto
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 overflow-y-auto pr-2">
                {/* Tabs per la selezione del tipo di assegnazione */}
                <Tabs
                  value={assignmentType}
                  onValueChange={setAssignmentType}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="individual" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Utente</span>
                    </TabsTrigger>
                    <TabsTrigger value="group" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Gruppo</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="individual" className="mt-3">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Colonna sinistra - Lista utenti */}
                      <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                        <h3 className="text-xs font-medium text-gray-500">Seleziona utente</h3>
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
                              <SelectValue placeholder="Seleziona utente dal team" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
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

                      {/* Colonna destra - Ruolo */}
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
                    </div>
                  </TabsContent>

                  <TabsContent value="group" className="mt-3">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Colonna sinistra - Lista utenti del gruppo */}
                      <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                        <h3 className="text-xs font-medium text-gray-500">Seleziona gruppo</h3>
                        <div>
                          <Label htmlFor="groupId" className="flex items-center text-sm">
                            <Users className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                            Gruppo <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Select
                            value={selectedGroupId?.toString() || "null"}
                            onValueChange={handleGroupChange}
                            disabled={isLoadingGroups}
                          >
                            <SelectTrigger className="w-full mt-1" id="groupId">
                              <SelectValue
                                placeholder={
                                  isLoadingGroups
                                    ? "Caricamento gruppi..."
                                    : "Seleziona gruppo"
                                }
                              >
                                {selectedGroupId
                                  ? getSelectedGroup(selectedGroupId)?.groupName
                                  : "Seleziona gruppo"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Nessun gruppo</SelectItem>
                              {availableGroups.map((group) => (
                                <SelectItem
                                  key={group.groupId}
                                  value={group.groupId.toString()}
                                >
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-2 text-gray-500" />
                                    <span>
                                      {group.groupName} - {group.description}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedGroupId && groupMembers.length > 0 && (
                          <GroupMembersSelector
                            members={groupMembers}
                            selectedIds={selectedMemberIds}
                            onSelectionChange={handleMemberSelection}
                            onSelectAll={handleSelectAllMembers}
                          />
                        )}
                        
                        {selectedGroupId && groupMembers.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1 px-1 py-1 bg-yellow-50 rounded border border-yellow-100">
                            <AlertTriangle className="h-3 w-3 inline mr-1 text-yellow-500" />
                            Tutti gli utenti del gruppo sono già nel progetto
                          </p>
                        )}
                      </div>

                      {/* Colonna destra - Ruolo */}
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
                            Seleziona il livello di accesso degli utenti al progetto
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end border-t pt-3 mt-3">
                  {assignmentType === "individual" ? (
                    <Button
                      onClick={handleAddMember}
                      className="shadow-sm"
                      disabled={!newMember.userId || !project}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Aggiungi al Team
                    </Button>
                  ) : (
                    <Button
                      onClick={handleAddGroupMembers}
                      className="shadow-sm"
                      disabled={!selectedGroupId || selectedMemberIds.length === 0 || !project}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Aggiungi Utenti ({selectedMemberIds.length})
                    </Button>
                  )}
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
