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
import { User, UserPlus, Shield, Users, AlertTriangle, CheckSquare, ChevronsUpDown, Check } from "lucide-react";
import { config } from "../../../config";
import { swal } from "../../../lib/common";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-blue-700 font-medium">
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
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

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

  // Carica la company dell'utente corrente come default
  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        if (userData.CompanyId) {
          setSelectedCompanyId(userData.CompanyId);
        }
      }
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
    }
    fetchCompanies();
  }, []);

  // Carica i gruppi quando si apre il dialog o cambia la company
  useEffect(() => {
    if (isAddMemberDialogOpen && selectedCompanyId) {
      fetchGroups(selectedCompanyId);
    }
  }, [isAddMemberDialogOpen, selectedCompanyId]);

  // Funzione per caricare le companies
  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoadingCompanies(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error fetching companies");
      }

      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  // Funzione per caricare i gruppi
  const fetchGroups = useCallback(async (companyId = null) => {
    try {
      setIsLoadingGroups(true);
      const token = localStorage.getItem("token");
      const url = companyId 
        ? `${config.API_BASE_URL}/groups?companyId=${companyId}`
        : `${config.API_BASE_URL}/groups`;
      const response = await fetch(url, {
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
      <div className="flex-none flex flex-row items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Team di Progetto</h3>
        </div>
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
            <DialogContent className="sm:max-w-[700px] h-[700px] overflow-hidden">
              <DialogHeader className="border-b pb-4 mb-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Aggiungi utente al progetto
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 overflow-y-auto pr-2 h-[580px]">
                {/* Tabs per la selezione del tipo di assegnazione */}
                <Tabs
                  value={assignmentType}
                  onValueChange={setAssignmentType}
                  className="w-full"
                >
                  {/* Selettore Company */}
                  <div className="mb-4">
                    <Label htmlFor="companySelect" className="flex items-center text-sm mb-2">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Azienda
                    </Label>
                    <Select
                      value={selectedCompanyId?.toString() || ""}
                      onValueChange={(value) => {
                        const companyId = value ? parseInt(value) : null;
                        setSelectedCompanyId(companyId);
                        // Reset selezioni quando cambia company
                        setSelectedGroupId(null);
                        setGroupMembers([]);
                        setSelectedMemberIds([]);
                        setNewMember({ ...newMember, userId: "" });
                      }}
                      disabled={isLoadingCompanies}
                    >
                      <SelectTrigger className="w-full" id="companySelect">
                        <SelectValue placeholder={isLoadingCompanies ? "Caricamento..." : "Seleziona azienda"} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.CompanyId} value={company.CompanyId.toString()}>
                            {company.Description || company.CompanyCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedCompanyId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Seleziona un'azienda per vedere i suoi utenti e gruppi
                      </p>
                    )}
                  </div>
                  
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

                  <TabsContent value="individual" className="mt-4">
                    {!selectedCompanyId ? (
                      <div className="p-4 text-center text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-md">
                        Seleziona un'azienda per aggiungere un utente al progetto
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Colonna sinistra - Lista utenti */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <h3 className="text-sm font-medium text-gray-700">
                            Seleziona utente
                          </h3>
                        <div>
                          <Label htmlFor="userId" className="flex items-center text-sm">
                            <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                            Utente <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openUserSelect}
                                className="w-full justify-between mt-1"
                              >
                                {newMember.userId
                                  ? getFilteredUsers().find(
                                      (user) => user.userId.toString() === newMember.userId
                                    )?.firstName +
                                    " " +
                                    getFilteredUsers().find(
                                      (user) => user.userId.toString() === newMember.userId
                                    )?.lastName
                                  : "Seleziona utente"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Cerca utente..." />
                                <CommandList>
                                  <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                                  <CommandGroup>
                                    {getFilteredUsers().map((user) => (
                                      <CommandItem
                                        key={user.userId}
                                        value={`${user.firstName} ${user.lastName}`}
                                        onSelect={() => {
                                          setNewMember({ ...newMember, userId: user.userId.toString() });
                                          setOpenUserSelect(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            newMember.userId === user.userId.toString()
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        <div className="flex items-center">
                                          <User className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                          {user.firstName} {user.lastName}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Colonna destra - Ruolo */}
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <h3 className="text-sm font-medium text-gray-700">
                          Assegnazione ruolo
                        </h3>
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
                    )}
                  </TabsContent>

                  <TabsContent value="group" className="mt-4">
                    {!selectedCompanyId ? (
                      <div className="p-4 text-center text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-md">
                        Seleziona un'azienda per aggiungere un gruppo al progetto
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Colonna sinistra - Lista utenti del gruppo */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <h3 className="text-sm font-medium text-gray-700">
                            Seleziona gruppo
                          </h3>
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
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <h3 className="text-sm font-medium text-gray-700">
                          Assegnazione ruolo
                        </h3>
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
                    )}
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end border-t pt-3 mt-3">
                  {assignmentType === "individual" ? (
                    <Button
                      onClick={handleAddMember}
                      disabled={!newMember.userId || !project}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Aggiungi al Team
                    </Button>
                  ) : (
                    <Button
                      onClick={handleAddGroupMembers}
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
      <div className="flex-1 overflow-y-auto min-h-0 mt-2">
        {project.members?.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {project.members.map((member) => (
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
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/60 shadow-lg text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg">
              <Users className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Nessun utente nel team</p>
            <p className="text-gray-400 text-xs">Aggiungi il primo membro per iniziare</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectTeamSection;
