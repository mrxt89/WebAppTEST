import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { swal } from "../../../lib/common";

const GroupsTab = ({
  groups,
  users,
  updateGroup,
  assignUserToGroup,
  removeUserFromGroup,
  refreshData,
}) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showDisabled, setShowDisabled] = useState(true);

  // Stati per i dialoghi
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Funzione di ordinamento
  const sortGroups = (groups) => {
    if (!sortConfig.key) return groups;

    return [...groups].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Gestione click sull'header della colonna
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtra e ordina i gruppi
  const filteredAndSortedGroups = sortGroups(
    groups.filter(group => showDisabled || !group.disabled)
  );

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUsers([]);
  };

  const handleUserCheckbox = (userId) => {
    // Toggle selection with setState callback to ensure we're working with the latest state
    setSelectedUsers((prevSelected) => {
      const isAlreadySelected = prevSelected.includes(userId);

      if (isAlreadySelected) {
        return prevSelected.filter((id) => id !== userId);
      } else {
        return [...prevSelected, userId];
      }
    });
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setEditFormData({
      groupName: group.groupName,
      description: group.description,
    });
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingGroup(null);
    setEditFormData({});
  };

  const handleEditFormSubmit = () => {
    setLoading(true);
    updateGroup(editingGroup.groupId, editFormData)
      .then(() => {
        swal.fire(
          "Successo",
          "Gruppo aggiornato con successo.",
          "success",
        );
        refreshData("groups");
        handleEditDialogClose();
      })
      .catch((error) => {
        console.error(
          "Errore durante l'aggiornamento del gruppo:",
          error,
        );
        swal.fire(
          "Errore",
          error.response.data ||
            "Errore durante l'aggiornamento del gruppo.",
          "error",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleAssignUsersToGroup = () => {
    if (selectedGroup && selectedUsers.length > 0) {
      Promise.all(
        selectedUsers.map((userId) =>
          assignUserToGroup(userId, selectedGroup.groupId),
        ),
      )
        .then(() => {
          swal.fire(
            "Successo",
            "Utenti aggiunti al gruppo con successo.",
            "success",
          );
          refreshData("groups"); // Aggiorna i gruppi
          setSelectedUsers([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante l'aggiunta degli utenti al gruppo:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante l'aggiunta degli utenti al gruppo.",
            "error",
          );
        });
    }
  };

  const handleRemoveUsersFromGroup = () => {
    if (selectedGroup && selectedUsers.length > 0) {
      Promise.all(
        selectedUsers.map((userId) =>
          removeUserFromGroup(userId, selectedGroup.groupId),
        ),
      )
        .then(() => {
          swal.fire(
            "Successo",
            "Utenti rimossi dal gruppo con successo.",
            "success",
          );
          refreshData("groups"); // Aggiorna i gruppi
          setSelectedUsers([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante la rimozione degli utenti dal gruppo:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante la rimozione degli utenti dal gruppo.",
            "error",
          );
        });
    }
  };

  // Funzioni per selezionare/deselezionare tutti gli utenti
  const handleSelectAllGroupUsers = () => {
    const groupUsers = selectedGroup?.users || [];
    const groupUserIds = groupUsers.map(user => user.userId);
    setSelectedUsers(prev => {
      const newSelection = [...prev];
      groupUserIds.forEach(userId => {
        if (!newSelection.includes(userId)) {
          newSelection.push(userId);
        }
      });
      return newSelection;
    });
  };

  const handleDeselectAllGroupUsers = () => {
    const groupUsers = selectedGroup?.users || [];
    const groupUserIds = groupUsers.map(user => user.userId);
    setSelectedUsers(prev => prev.filter(userId => !groupUserIds.includes(userId)));
  };

  const handleSelectAllAvailableUsers = () => {
    const groupUsers = selectedGroup?.users || [];
    // Filtra gli utenti disponibili considerando anche il filtro disabilitati
    const availableUsers = users.filter((user) => {
      const isInGroup = groupUsers.some((groupUser) => groupUser.userId === user.userId);
      if (isInGroup) return false;
      // Se showDisabled è false, nascondi gli utenti disabilitati
      if (!showDisabled && user.disabled) return false;
      return true;
    });
    const availableUserIds = availableUsers.map(user => user.userId);
    setSelectedUsers(prev => {
      const newSelection = [...prev];
      availableUserIds.forEach(userId => {
        if (!newSelection.includes(userId)) {
          newSelection.push(userId);
        }
      });
      return newSelection;
    });
  };

  const handleDeselectAllAvailableUsers = () => {
    const groupUsers = selectedGroup?.users || [];
    // Filtra gli utenti disponibili considerando anche il filtro disabilitati
    const availableUsers = users.filter((user) => {
      const isInGroup = groupUsers.some((groupUser) => groupUser.userId === user.userId);
      if (isInGroup) return false;
      // Se showDisabled è false, nascondi gli utenti disabilitati
      if (!showDisabled && user.disabled) return false;
      return true;
    });
    const availableUserIds = availableUsers.map(user => user.userId);
    setSelectedUsers(prev => prev.filter(userId => !availableUserIds.includes(userId)));
  };

  const renderGroupDetails = () => {
    if (!selectedGroup) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Seleziona un gruppo per visualizzare i dettagli
          </p>
        </div>
      );
    }

    // Filter for users already in the group and available users
    const groupUsers = selectedGroup.users || [];
    
    // Filtra gli utenti disponibili, escludendo quelli già nel gruppo e quelli disabilitati se necessario
    const availableUsers = users.filter((user) => {
      // Esclude utenti già nel gruppo
      const isInGroup = groupUsers.some((groupUser) => groupUser.userId === user.userId);
      if (isInGroup) return false;
      
      // Se showDisabled è false, nascondi gli utenti disabilitati
      if (!showDisabled && user.disabled) return false;
      
      return true;
    });

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{selectedGroup.groupName}</h3>
          <p className="text-muted-foreground">{selectedGroup.description}</p>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleEditGroup(selectedGroup)}
          >
            <i className="fa-solid fa-pen-to-square mr-2"></i>
            Modifica
          </Button>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2 h-11">
            <h4 className="text-md font-medium">Membri del gruppo</h4>
            <div className="flex gap-2">
              {groupUsers.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllGroupUsers}
                  >
                    Seleziona tutti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllGroupUsers}
                  >
                    Deseleziona tutti
                  </Button>
                </>
              )}
              {selectedUsers.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveUsersFromGroup}
                >
                  <i className="fa-solid fa-user-minus mr-2"></i>
                  Rimuovi selezionati
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-60 border rounded-md p-2">
            {groupUsers.length > 0 ? (
              <div className="space-y-2">
                {groupUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox
                        id={`group-user-${user.userId}`}
                        checked={selectedUsers.includes(user.userId)}
                        className={`${selectedUsers.includes(user.userId) ? "bg-primary" : ""}`}
                        onCheckedChange={() => handleUserCheckbox(user.userId)}
                      />
                      <Label
                        htmlFor={`group-user-${user.userId}`}
                        className="flex-1 cursor-pointer"
                      >
                        {user.firstName} {user.lastName} ({user.username})
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">
                Nessun utente nel gruppo
              </p>
            )}
          </ScrollArea>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2 h-11">
            <h4 className="text-md font-medium">Utenti disponibili</h4>
            <div className="flex gap-2">
              {availableUsers.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllAvailableUsers}
                  >
                    Seleziona tutti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllAvailableUsers}
                  >
                    Deseleziona tutti
                  </Button>
                </>
              )}
              {selectedUsers.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAssignUsersToGroup}
                >
                  <i className="fa-solid fa-user-plus mr-2"></i>
                  Aggiungi selezionati
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-60 border rounded-md p-2">
            {availableUsers.length > 0 ? (
              <div className="space-y-2">
                {availableUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox
                        id={`available-user-${user.userId}`}
                        checked={selectedUsers.includes(user.userId)}
                        className={`${selectedUsers.includes(user.userId) ? "bg-primary" : ""}`}
                        onCheckedChange={() => handleUserCheckbox(user.userId)}
                      />
                      <Label
                        htmlFor={`available-user-${user.userId}`}
                        className="flex-1 cursor-pointer"
                      >
                        {user.firstName} {user.lastName} ({user.username})
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">
                Nessun utente disponibile
              </p>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left column - Group list */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gruppi</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showDisabled"
                checked={!showDisabled}
                onCheckedChange={(checked) => setShowDisabled(!checked)}
                variant="transparent"
                className="h-4 w-4"
              />
              <Label htmlFor="showDisabled" className="text-sm">
                Nascondi disabilitati
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-230px)] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('groupName')}
                  >
                    Nome {sortConfig.key === 'groupName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="hidden md:table-cell cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('description')}
                  >
                    Descrizione {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(filteredAndSortedGroups) &&
                  filteredAndSortedGroups.map((group) => (
                    <TableRow
                      key={group.groupId}
                      className={`${group.disabled ? "bg-red-100" : ""} ${selectedGroup && selectedGroup.groupId === group.groupId ? "bg-blue-100" : ""} cursor-pointer`}
                      onClick={() => handleSelectGroup(group)}
                    >
                      <TableCell className="font-medium">
                        {group.groupName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {group.description}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right column - Group details */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli gruppo</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-230px)]">
            {renderGroupDetails()}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog per la modifica del gruppo */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Gruppo</DialogTitle>
            <DialogDescription>
              Modifica le informazioni del gruppo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupName" className="text-right">
                Nome Gruppo
              </Label>
              <Input
                id="groupName"
                value={editFormData.groupName}
                onChange={(e) => setEditFormData({ ...editFormData, groupName: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descrizione
              </Label>
              <Input
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditDialogClose} disabled={loading}>
              Annulla
            </Button>
            <Button onClick={handleEditFormSubmit} disabled={loading}>
              {loading ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsTab;
