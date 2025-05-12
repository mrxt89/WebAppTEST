import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { swal } from '../../../lib/common';
import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWikiContext } from '../../../components/wiki/WikiContext';

const NotificationsTab = ({ 
  notificationsChannels, 
  users, 
  groups, // Aggiungiamo i gruppi come prop
  updateNotificationChannel, 
  addUserToChannel, 
  removeUserFromChannel, 
  refreshData, // Uso della nuova funzione refreshData
  handleOpenChat
}) => {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Hook per il contesto Wiki
  const { openWiki } = useWikiContext();
  
  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setSelectedUsers([]);
  };

  // Handler per il pulsante Wiki
  const handleOpenWiki = (e) => {
    e.stopPropagation();
    openWiki('notificationChannels', true); // Specifico che vogliamo aprire la wiki dei canali di notifica
  };

  const handleUserCheckbox = (userId) => {
    console.log("Checkbox clicked for userId:", userId);
    console.log("Current selectedUsers:", selectedUsers);
    
    // Toggle selection: if included, remove it; if not included, add it
    setSelectedUsers(prevSelected => {
      const isAlreadySelected = prevSelected.includes(userId);
      console.log("Is already selected:", isAlreadySelected);
      
      if (isAlreadySelected) {
        return prevSelected.filter(id => id !== userId);
      } else {
        return [...prevSelected, userId];
      }
    });
  };

  const handleEditNotificationChannel = (channel) => {
    swal.fire({
      title: 'Modifica Canale di Notifica',
      html: `
        <input type="text" id="channelName" class="archa-input" placeholder="Nome Canale" value="${channel.name}">
        <input type="text" id="description" class="archa-input" placeholder="Descrizione" value="${channel.description}">
        <input type="color" id="color" class="archa-input" placeholder="Colore" value="${channel.hexColor}">
        <select id="responseType" class="archa-input">
          <option value="1" ${channel.defaultResponseOptionId === 1 ? 'selected' : ''}>Nessuna Risposta</option>
          <option value="2" ${channel.defaultResponseOptionId === 2 ? 'selected' : ''}>Risposta SI/NO</option>
          <option value="3" ${channel.defaultResponseOptionId === 3 ? 'selected' : ''}>Testo libero</option>
        </select>
        <input type="text" id="defaultTitle" class="archa-input" placeholder="Titolo di Default" value="${channel.defaultTitle}">
        <div class="mt-3">
          <label for="intercompany">Canale Intercompany</label>
          <input type="checkbox" id="intercompany" class="archa-input" ${channel.intercompany ? 'checked' : ''}>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      cancelButtonText: 'Annulla',
      preConfirm: () => {
        const channelName = swal.getPopup().querySelector('#channelName').value;
        const description = swal.getPopup().querySelector('#description').value;
        const hexColor = swal.getPopup().querySelector('#color').value;
        const defaultResponseOptionId = swal.getPopup().querySelector('#responseType').value;
        const defaultTitle = swal.getPopup().querySelector('#defaultTitle').value;
        const intercompany = swal.getPopup().querySelector('#intercompany').checked;

        if (!channelName || !description || !hexColor || !defaultResponseOptionId) {
          swal.showValidationMessage(`Campi obbligatori: nome canale, descrizione, colore, risposta di default`);
          return null;
        }
        return { 
          notificationCategoryId: channel.notificationCategoryId, 
          name: channelName, 
          description, 
          hexColor, 
          defaultResponseOptionId, 
          defaultTitle,
          intercompany
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        updateNotificationChannel(result.value)
          .then(() => {
            swal.fire('Successo', 'Canale di notifica aggiornato con successo.', 'success');
            refreshData(); // Aggiorna i dati mantenendo i filtri
          })
          .catch((error) => {
            console.error('Errore durante l\'aggiornamento del canale di notifica:', error);
            swal.fire('Errore', error.response?.data || 'Errore durante l\'aggiornamento del canale di notifica.', 'error');
          });
      }
    });
  };

  const handleAssignUsersToChannel = () => {
    if (selectedChannel && selectedUsers.length > 0) {
      Promise.all(selectedUsers.map(userId => addUserToChannel(userId, selectedChannel.notificationCategoryId)))
        .then(() => {
          swal.fire('Successo', 'Destinatari aggiunti al canale con successo.', 'success');
          refreshData(); // Aggiorna i dati mantenendo i filtri
          setSelectedUsers([]); // Reset selezione
        })
        .catch((error) => {
          console.error('Errore durante l\'aggiunta destinatari al canale:', error);
          swal.fire('Errore', 'Errore durante l\'aggiunta destinatari al canale.', 'error');
        });
    }
  };

  const handleRemoveUsersFromChannel = () => {
    if (selectedChannel && selectedUsers.length > 0) {
      Promise.all(selectedUsers.map(userId => removeUserFromChannel(userId, selectedChannel.notificationCategoryId)))
        .then(() => {
          swal.fire('Successo', 'Destinatari rimossi dal canale con successo.', 'success');
          refreshData(); // Aggiorna i dati mantenendo i filtri
          setSelectedUsers([]); // Reset selezione
        })
        .catch((error) => {
          console.error('Errore durante la rimozione destinatari dal canale:', error);
          swal.fire('Errore', 'Errore durante la rimozione destinatari dal canale.', 'error');
        });
    }
  };

  // Nuova funzione per l'aggiunta di un gruppo intero al canale
  const handleAddGroupToChannel = () => {
    if (!selectedChannel) {
      swal.fire('Attenzione', 'Seleziona prima un canale di notifica', 'warning');
      return;
    }
    
    // Lista dei gruppi disponibili da visualizzare nella modal
    const groupOptions = groups.map(group => {
      return `<option value="${group.groupId}">${group.groupName}</option>`;
    }).join('');
    
    swal.fire({
      title: 'Aggiungi Gruppo al Canale',
      html: `
        <select id="groupSelect" class="archa-input">
          <option value="">Seleziona un gruppo</option>
          ${groupOptions}
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      cancelButtonText: 'Annulla',
      preConfirm: () => {
        const groupId = swal.getPopup().querySelector('#groupSelect').value;
        if (!groupId) {
          swal.showValidationMessage('Seleziona un gruppo');
          return null;
        }
        return { groupId: parseInt(groupId) };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value.groupId) {
        // Ottieni gli utenti che appartengono a questo gruppo
        const selectedGroup = groups.find(g => g.groupId === result.value.groupId);
        
        if (selectedGroup && selectedGroup.users && selectedGroup.users.length > 0) {
          // Creiamo un array di ID utenti che appartengono al gruppo
          const groupUserIds = selectedGroup.users.map(user => user.userId);
          
          // Filtriamo per escludere gli utenti già nel canale
          const channelMembers = selectedChannel.members || [];
          const channelMemberIds = channelMembers.map(member => 
            member.TB ? member.TB[0].userId : member.userId
          );
          
          const usersToAdd = groupUserIds.filter(userId => 
            !channelMemberIds.includes(userId)
          );
          
          if (usersToAdd.length === 0) {
            swal.fire('Informazione', 'Tutti gli utenti di questo gruppo sono già presenti nel canale.', 'info');
            return;
          }
          
          swal.fire({
            title: 'Conferma',
            text: `Verranno aggiunti ${usersToAdd.length} utenti del gruppo "${selectedGroup.groupName}" al canale. Continuare?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sì, aggiungi',
            cancelButtonText: 'Annulla'
          }).then((confirmResult) => {
            if (confirmResult.isConfirmed) {
              Promise.all(usersToAdd.map(userId => 
                addUserToChannel(userId, selectedChannel.notificationCategoryId)
              ))
              .then(() => {
                swal.fire('Successo', `${usersToAdd.length} utenti del gruppo aggiunti al canale.`, 'success');
                refreshData(); // Aggiorna i dati mantenendo i filtri
              })
              .catch((error) => {
                console.error('Errore durante l\'aggiunta degli utenti del gruppo al canale:', error);
                swal.fire('Errore', 'Si è verificato un errore durante l\'aggiunta degli utenti.', 'error');
              });
            }
          });
        } else {
          swal.fire('Attenzione', 'Il gruppo selezionato non contiene utenti.', 'warning');
        }
      }
    });
  };

  const renderChannelDetails = () => {
    if (!selectedChannel) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Seleziona un canale per visualizzare i dettagli</p>
        </div>
      );
    }

    // Prepare lists of channel users and available users
    const channelMembers = selectedChannel.members || [];
    
    const availableUsers = users.filter(user => !channelMembers.some(member => {
      // Handle both TB arrays and direct objects
      const memberId = member.userId;
      return memberId === user.userId;
    }));

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: selectedChannel.hexColor }}
            id="notification-category-color"
          />
          <h3 className="text-lg font-medium" id="notification-category-title">{selectedChannel.name}</h3>
        </div>
        <p className="text-muted-foreground" id="notification-category-description">{selectedChannel.description}</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Tipo di risposta</Label>
            <p id="notification-response-type">{
              selectedChannel.defaultResponseOptionId === 1 ? "Nessuna risposta" :
              selectedChannel.defaultResponseOptionId === 2 ? "SI/NO" :
              "Testo libero"
            }</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Titolo di default</Label>
            <p id="notification-default-title">{selectedChannel.defaultTitle || "—"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Intercompany</Label>
            <p id="notification-intercompany">{selectedChannel.intercompany ? 'Sì' : 'No'}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleEditNotificationChannel(selectedChannel)} id="notification-edit-button">
            <i className="fa-solid fa-pen-to-square mr-2"></i>
            Modifica
          </Button>
          <Button variant="outline" onClick={() => handleOpenChat(selectedChannel.notificationCategoryId)} id="notification-test-button">
            <i className="fa-solid fa-comment mr-2"></i>
            Test notifica
          </Button>
        </div>
        
        <Separator />
        
        <div>
          <div className="flex justify-between items-center mb-2 h-14">
            <h4 className="text-md font-medium" id="notification-members-title">Destinatari</h4>
            {selectedUsers.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleRemoveUsersFromChannel} id="notification-remove-users-button">
                <i className="fa-solid fa-user-minus mr-2"></i>
                Rimuovi selezionati
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-40 border rounded-md p-2" id="notification-members-list">
            {channelMembers.length > 0 ? (
              <div className="space-y-2">
                {channelMembers.map((member, index) => {
                  // Handle both TB arrays and direct objects
                  const user = member.TB ? member.TB[0] : member;
                  const userId = user.userId;
             
                  return (
                    <div key={userId} className="flex items-center space-x-2 p-2 hover:bg-accent rounded" id={`notification-member-${userId}`}>
                      <div className="flex items-center space-x-2 w-full">
                        <Checkbox 
                          id={`channel-user-${userId}`} 
                          checked={selectedUsers.includes(userId)}
                          className={`${selectedUsers.includes(userId) ? 'bg-primary' : ''}`}
                          onCheckedChange={() => {
                            console.log("Checkbox clicked for channel user:", userId);
                            handleUserCheckbox(userId);
                          }}
                        />
                        <Label htmlFor={`channel-user-${userId}`} className="flex-1 cursor-pointer">
                          {user.firstName} {user.lastName} - {user.role} ({user.companyName})
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">Nessun destinatario per questo canale</p>
            )}
          </ScrollArea>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2 h-14">
            <h4 className="text-md font-medium" id="notification-available-users-title">Utenti disponibili</h4>
            <div className="flex space-x-2">
              {selectedUsers.length > 0 && (
                <Button variant="default" size="sm" onClick={handleAssignUsersToChannel} id="notification-add-users-button">
                  <i className="fa-solid fa-user-plus mr-2"></i>
                  Aggiungi selezionati
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleAddGroupToChannel} id="notification-add-group-button">
                <i className="fa-solid fa-users mr-2"></i>
                Aggiungi Gruppo
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-40 border rounded-md p-2" id="notification-available-users-list">
            {availableUsers.length > 0 ? (
              <div className="space-y-2">
                {availableUsers.map(user => (
                  <div key={user.userId} className="flex items-center space-x-2 p-2 hover:bg-accent rounded" id={`notification-available-user-${user.userId}`}>
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox 
                        id={`available-channel-user-${user.userId}`} 
                        checked={selectedUsers.includes(user.userId)}
                        className={`${selectedUsers.includes(user.userId) ? 'bg-primary' : ''}`}
                        onCheckedChange={() => {
                          console.log("Checkbox clicked for available channel user:", user.userId);
                          handleUserCheckbox(user.userId);
                        }}
                      />
                      <Label htmlFor={`available-channel-user-${user.userId}`} className="flex-1 cursor-pointer">
                        
                        {user.firstName} {user.lastName} - {user.role} ({user.companyName})
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">Nessun utente disponibile</p>
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
          <CardTitle id="notification-channels-title">Canali Notifiche</CardTitle>
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
          <ScrollArea className="h-[calc(100vh-230px)]" id="notification-channels-list">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Descrizione</TableHead>
                  <TableHead className="hidden md:table-cell">Colore</TableHead>
                  <TableHead className="hidden md:table-cell">Intercompany</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(notificationsChannels) && notificationsChannels.map(channel => (
                  <TableRow 
                    key={channel.notificationCategoryId} 
                    className={`${selectedChannel && selectedChannel.notificationCategoryId === channel.notificationCategoryId ? 'bg-blue-100' : ''} cursor-pointer`}
                    onClick={() => handleSelectChannel(channel)}
                    id={`notification-channel-${channel.notificationCategoryId}`}
                  >
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{channel.description}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div style={{ backgroundColor: channel.hexColor, width: '40px', height: '20px', borderRadius: '4px' }} id={`notification-color-${channel.notificationCategoryId}`} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {channel.intercompany ? 'Sì' : 'No'}
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
          <ScrollArea className="h-[calc(100vh-230px)]" id="notification-channel-details">
            {renderChannelDetails()}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsTab;