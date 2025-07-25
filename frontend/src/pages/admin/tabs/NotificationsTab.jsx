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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { swal } from "../../../lib/common";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWikiContext } from "../../../components/wiki/WikiContext";

const NotificationsTab = ({
  notificationsChannels,
  users,
  groups, // Aggiungiamo i gruppi come prop
  updateNotificationChannel,
  addUserToChannel,
  removeUserFromChannel,
  refreshData, // Uso della nuova funzione refreshData
  handleOpenChat,
}) => {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Stati per i dialoghi
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Hook per il contesto Wiki
  const { openWiki } = useWikiContext();

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setSelectedUsers([]);
  };

  // Handler per il pulsante Wiki
  const handleOpenWiki = (e) => {
    e.stopPropagation();
    openWiki("notificationChannels", true); // Specifico che vogliamo aprire la wiki dei canali di notifica
  };

  const handleUserCheckbox = (userId) => {
    // Toggle selection: if included, remove it; if not included, add it
    setSelectedUsers((prevSelected) => {
      const isAlreadySelected = prevSelected.includes(userId);

      if (isAlreadySelected) {
        return prevSelected.filter((id) => id !== userId);
      } else {
        return [...prevSelected, userId];
      }
    });
  };

  const handleEditNotificationChannel = (channel) => {
    setEditingChannel(channel);
    setEditFormData({
      name: channel.name,
      description: channel.description,
      hexColor: channel.hexColor,
      defaultResponseOptionId: channel.defaultResponseOptionId,
      defaultTitle: channel.defaultTitle,
      intercompany: channel.intercompany,
    });
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingChannel(null);
    setEditFormData({});
  };

  const handleEditFormSubmit = () => {
    if (!editFormData.name || !editFormData.description || !editFormData.hexColor || !editFormData.defaultResponseOptionId) {
      swal.fire("Errore", "Campi obbligatori: nome canale, descrizione, colore, risposta di default", "error");
      return;
    }

    setLoading(true);
    const formDataWithId = {
      ...editFormData,
      notificationCategoryId: editingChannel.notificationCategoryId,
    };
    
    updateNotificationChannel(formDataWithId)
      .then(() => {
        swal.fire(
          "Successo",
          "Canale di notifica aggiornato con successo.",
          "success",
        );
        refreshData(); // Aggiorna i dati mantenendo i filtri
        handleEditDialogClose();
      })
      .catch((error) => {
        console.error(
          "Errore durante l'aggiornamento del canale di notifica:",
          error,
        );
        swal.fire(
          "Errore",
          error.response?.data ||
            "Errore durante l'aggiornamento del canale di notifica.",
          "error",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleAssignUsersToChannel = () => {
    if (selectedChannel && selectedUsers.length > 0) {
      Promise.all(
        selectedUsers.map((userId) =>
          addUserToChannel(userId, selectedChannel.notificationCategoryId),
        ),
      )
        .then(() => {
          swal.fire(
            "Successo",
            "Destinatari aggiunti al canale con successo.",
            "success",
          );
          refreshData(); // Aggiorna i dati mantenendo i filtri
          setSelectedUsers([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante l'aggiunta destinatari al canale:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante l'aggiunta destinatari al canale.",
            "error",
          );
        });
    }
  };

  const handleRemoveUsersFromChannel = () => {
    if (selectedChannel && selectedUsers.length > 0) {
      Promise.all(
        selectedUsers.map((userId) =>
          removeUserFromChannel(userId, selectedChannel.notificationCategoryId),
        ),
      )
        .then(() => {
          swal.fire(
            "Successo",
            "Destinatari rimossi dal canale con successo.",
            "success",
          );
          refreshData(); // Aggiorna i dati mantenendo i filtri
          setSelectedUsers([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante la rimozione destinatari dal canale:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante la rimozione destinatari dal canale.",
            "error",
          );
        });
    }
  };

  // Nuova funzione per l'aggiunta di un gruppo intero al canale
  const handleAddGroupToChannel = () => {
    if (!selectedChannel) {
      swal.fire(
        "Attenzione",
        "Seleziona prima un canale di notifica",
        "warning",
      );
      return;
    }

    // Lista dei gruppi disponibili da visualizzare nella modal
    const groupOptions = groups
      .map((group) => {
        return `<option value="${group.groupId}">${group.groupName}</option>`;
      })
      .join("");

    swal
      .fire({
        title: "Aggiungi Gruppo al Canale",
        html: `
        <select id="groupSelect" class="archa-input">
          <option value="">Seleziona un gruppo</option>
          ${groupOptions}
        </select>
      `,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: "Annulla",
        preConfirm: () => {
          const groupId = swal.getPopup().querySelector("#groupSelect").value;
          if (!groupId) {
            swal.showValidationMessage("Seleziona un gruppo");
            return null;
          }
          return { groupId: parseInt(groupId) };
        },
      })
      .then((result) => {
        if (result.isConfirmed && result.value.groupId) {
          // Ottieni gli utenti che appartengono a questo gruppo
          const selectedGroup = groups.find(
            (g) => g.groupId === result.value.groupId,
          );

          if (
            selectedGroup &&
            selectedGroup.users &&
            selectedGroup.users.length > 0
          ) {
            // Creiamo un array di ID utenti che appartengono al gruppo
            const groupUserIds = selectedGroup.users.map((user) => user.userId);

            // Filtriamo per escludere gli utenti già nel canale
            const channelMembers = selectedChannel.members || [];
            const channelMemberIds = channelMembers.map((member) =>
              member.TB ? member.TB[0].userId : member.userId,
            );

            const usersToAdd = groupUserIds.filter(
              (userId) => !channelMemberIds.includes(userId),
            );

            if (usersToAdd.length === 0) {
              swal.fire(
                "Informazione",
                "Tutti gli utenti di questo gruppo sono già presenti nel canale.",
                "info",
              );
              return;
            }

            swal
              .fire({
                title: "Conferma",
                text: `Verranno aggiunti ${usersToAdd.length} utenti del gruppo "${selectedGroup.groupName}" al canale. Continuare?`,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Sì, aggiungi",
                cancelButtonText: "Annulla",
              })
              .then((confirmResult) => {
                if (confirmResult.isConfirmed) {
                  Promise.all(
                    usersToAdd.map((userId) =>
                      addUserToChannel(
                        userId,
                        selectedChannel.notificationCategoryId,
                      ),
                    ),
                  )
                    .then(() => {
                      swal.fire(
                        "Successo",
                        `${usersToAdd.length} utenti del gruppo aggiunti al canale.`,
                        "success",
                      );
                      refreshData(); // Aggiorna i dati mantenendo i filtri
                    })
                    .catch((error) => {
                      console.error(
                        "Errore durante l'aggiunta degli utenti del gruppo al canale:",
                        error,
                      );
                      swal.fire(
                        "Errore",
                        "Si è verificato un errore durante l'aggiunta degli utenti.",
                        "error",
                      );
                    });
                }
              });
          } else {
            swal.fire(
              "Attenzione",
              "Il gruppo selezionato non contiene utenti.",
              "warning",
            );
          }
        }
      });
  };

  const renderChannelDetails = () => {
    if (!selectedChannel) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Seleziona un canale per visualizzare i dettagli
          </p>
        </div>
      );
    }

    // Prepare lists of channel users and available users
    const channelMembers = selectedChannel.members || [];

    const availableUsers = users.filter(
      (user) =>
        !channelMembers.some((member) => {
          // Handle both TB arrays and direct objects
          const memberId = member.userId;
          return memberId === user.userId;
        }),
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: selectedChannel.hexColor }}
            id="notification-category-color"
          />
          <h3 className="text-lg font-medium" id="notification-category-title">
            {selectedChannel.name}
          </h3>
        </div>
        <p
          className="text-muted-foreground"
          id="notification-category-description"
        >
          {selectedChannel.description}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Tipo di risposta</Label>
            <p id="notification-response-type">
              {selectedChannel.defaultResponseOptionId === 1
                ? "Nessuna risposta"
                : selectedChannel.defaultResponseOptionId === 2
                  ? "SI/NO"
                  : "Testo libero"}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Titolo di default</Label>
            <p id="notification-default-title">
              {selectedChannel.defaultTitle || "—"}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Intercompany</Label>
            <p id="notification-intercompany">
              {selectedChannel.intercompany ? "Sì" : "No"}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleEditNotificationChannel(selectedChannel)}
            id="notification-edit-button"
          >
            <i className="fa-solid fa-pen-to-square mr-2"></i>
            Modifica
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              handleOpenChat(selectedChannel.notificationCategoryId)
            }
            id="notification-test-button"
          >
            <i className="fa-solid fa-comment mr-2"></i>
            Test notifica
          </Button>
        </div>
            
        <div>
          <div className="flex justify-content-around items-center mb-2 h-11">
            <h4 className="text-md font-medium" id="notification-members-title">
              Destinatari
            </h4>
            {selectedUsers.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveUsersFromChannel}
                id="notification-remove-users-button"
              >
                <i className="fa-solid fa-user-minus mr-2"></i>
                Rimuovi selezionati
              </Button>
            )}
          </div>

          <ScrollArea
            className="h-40 border rounded-md p-2"
            id="notification-members-list"
          >
            {channelMembers.length > 0 ? (
              <div className="space-y-2">
                {channelMembers.map((member, index) => {
                  // Handle both TB arrays and direct objects
                  const user = member.TB ? member.TB[0] : member;
                  const userId = user.userId;

                  return (
                    <div
                      key={userId}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                      id={`notification-member-${userId}`}
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <Checkbox
                          id={`channel-user-${userId}`}
                          checked={selectedUsers.includes(userId)}
                          className={`${selectedUsers.includes(userId) ? "bg-primary" : ""}`}
                          onCheckedChange={() => {
                            handleUserCheckbox(userId);
                          }}
                        />
                        <Label
                          htmlFor={`channel-user-${userId}`}
                          className="flex-1 cursor-pointer"
                        >
                          {user.firstName} {user.lastName} - {user.role} (
                          {user.companyName})
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">
                Nessun destinatario per questo canale
              </p>
            )}
          </ScrollArea>
        </div>

        <div>
          <div className="flex justify-content-around items-center mb-2 h-11">
            <h4
              className="text-md font-medium"
              id="notification-available-users-title"
            >
              Utenti disponibili
            </h4>
            <div className="flex space-x-2">
              {selectedUsers.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAssignUsersToChannel}
                  id="notification-add-users-button"
                >
                  <i className="fa-solid fa-user-plus mr-2"></i>
                  Aggiungi selezionati
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddGroupToChannel}
                id="notification-add-group-button"
              >
                <i className="fa-solid fa-users mr-2"></i>
                Aggiungi Gruppo
              </Button>
            </div>
          </div>

          <ScrollArea
            className="h-40 border rounded-md p-2"
            id="notification-available-users-list"
          >
            {availableUsers.length > 0 ? (
              <div className="space-y-2">
                {availableUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                    id={`notification-available-user-${user.userId}`}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox
                        id={`available-channel-user-${user.userId}`}
                        checked={selectedUsers.includes(user.userId)}
                        className={`${selectedUsers.includes(user.userId) ? "bg-primary" : ""}`}
                        onCheckedChange={() => {
                          handleUserCheckbox(user.userId);
                        }}
                      />
                      <Label
                        htmlFor={`available-channel-user-${user.userId}`}
                        className="flex-1 cursor-pointer"
                      >
                        {user.firstName} {user.lastName} - {user.role} (
                        {user.companyName})
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
      {/* Left column - Notification channels list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="notification-channels-title">
            Canali Notifiche
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenWiki}
                  className="relative text-black hover:bg-gray-100 rounded-full transition-colors flex items-center"
                  aria-label="Aiuto e Wiki"
                  id="notification-sidebar-wiki-button"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Guida canali di notifica</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          <ScrollArea
            className="h-[calc(100vh-230px)] overflow-auto"
            id="notification-channels-list"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Descrizione
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Colore</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Intercompany
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(notificationsChannels) &&
                  notificationsChannels.map((channel) => (
                    <TableRow
                      key={channel.notificationCategoryId}
                      className={`${selectedChannel && selectedChannel.notificationCategoryId === channel.notificationCategoryId ? "bg-blue-100" : ""} cursor-pointer`}
                      onClick={() => handleSelectChannel(channel)}
                      id={`notification-channel-${channel.notificationCategoryId}`}
                    >
                      <TableCell className="font-medium">
                        {channel.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {channel.description}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div
                          style={{
                            backgroundColor: channel.hexColor,
                            width: "40px",
                            height: "20px",
                            borderRadius: "4px",
                          }}
                          id={`notification-color-${channel.notificationCategoryId}`}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {channel.intercompany ? "Sì" : "No"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right column - Channel details */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli canale</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea
            className="h-[calc(100vh-230px)]"
            id="notification-channel-details"
          >
            {renderChannelDetails()}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog per la modifica del canale */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Canale di Notifica</DialogTitle>
            <DialogDescription>
              Modifica le proprietà del canale di notifica.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome Canale
              </Label>
              <Input
                id="name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
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
                onChange={(e) =>
                  setEditFormData({ ...editFormData, description: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Colore
              </Label>
              <Input
                type="color"
                id="color"
                value={editFormData.hexColor}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, hexColor: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="responseType" className="text-right">
                Tipo di Risposta
              </Label>
              <Select
                value={editFormData.defaultResponseOptionId}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, defaultResponseOptionId: parseInt(value) })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleziona un tipo di risposta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Nessuna Risposta</SelectItem>
                  <SelectItem value="2">Risposta SI/NO</SelectItem>
                  <SelectItem value="3">Testo libero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="defaultTitle" className="text-right">
                Titolo di Default
              </Label>
              <Input
                id="defaultTitle"
                value={editFormData.defaultTitle}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, defaultTitle: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="intercompany" className="text-right">
                Canale Intercompany
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="intercompany"
                  checked={editFormData.intercompany}
                  onCheckedChange={(checked) =>
                    setEditFormData({ ...editFormData, intercompany: checked })
                  }
                />
                <Label htmlFor="intercompany" className="text-sm">
                  Abilita canale intercompany
                </Label>
              </div>
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

export default NotificationsTab;
