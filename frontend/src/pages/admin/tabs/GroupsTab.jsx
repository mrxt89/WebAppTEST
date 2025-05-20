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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
    swal
      .fire({
        title: "Modifica Gruppo",
        html: `
        <label for="groupName" class="">Nome Gruppo</label>
        <input type="text" id="groupName" class="archa-input" placeholder="Nome Gruppo" value="${group.groupName}">
        <label for="description" class="">Descrizione</label>
        <input type="text" id="description" class="archa-input" placeholder="Descrizione" value="${group.description}">
      `,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: "Annulla",
        preConfirm: () => {
          const groupName = swal.getPopup().querySelector("#groupName").value;
          const description = swal
            .getPopup()
            .querySelector("#description").value;

          if (!groupName) {
            swal.showValidationMessage(`Please enter the group name`);
            return null;
          }
          return { groupId: group.groupId, groupName, description };
        },
      })
      .then((result) => {
        if (result.isConfirmed) {
          updateGroup(result.value.groupId, result.value)
            .then(() => {
              swal.fire(
                "Successo",
                "Gruppo aggiornato con successo.",
                "success",
              );
              refreshData("groups");
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
            });
        }
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
    const availableUsers = users.filter(
      (user) =>
        !groupUsers.some((groupUser) => groupUser.userId === user.userId),
    );

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

        <Separator />

        <div>
          <div className="flex justify-between items-center mb-2 h-14">
            <h4 className="text-md font-medium">Membri del gruppo</h4>
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

        <Separator />

        <div>
          <div className="flex justify-between items-center mb-2 h-14">
            <h4 className="text-md font-medium">Utenti disponibili</h4>
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
          <CardTitle>Gruppi</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-230px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Descrizione
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(groups) &&
                  groups.map((group) => (
                    <TableRow
                      key={group.groupId}
                      className={`${selectedGroup && selectedGroup.groupId === group.groupId ? "bg-blue-100" : ""} cursor-pointer`}
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
    </div>
  );
};

export default GroupsTab;
