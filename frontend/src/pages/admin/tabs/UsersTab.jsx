import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

const UsersTab = ({
  users,
  companies,
  updateUser,
  resetPassword,
  toggleUserStatus,
  refreshData,
  getUserCompanies,
  assignUserToCompany,
  removeUserFromCompany,
  setPrimaryCompany,
  updateUserERPUserId,
}) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCompanies, setUserCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showDisabled, setShowDisabled] = useState(false);
  const [editingERPUserId, setEditingERPUserId] = useState({ companyId: null, value: '' });

  // Stati per i dialoghi
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Funzione di ordinamento
  const sortUsers = (users) => {
    if (!sortConfig.key) return users;

    return [...users].sort((a, b) => {
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

  // Filtra e ordina gli utenti
  const filteredAndSortedUsers = sortUsers(
    users.filter(user => showDisabled || !user.userDisabled)
  );

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSelectedCompanies([]);

    // Carica le aziende dell'utente
    setLoadingCompanies(true);
    try {
      const userCompaniesData = await getUserCompanies(user.userId);
      setUserCompanies(userCompaniesData);
    } catch (error) {
      console.error("Errore nel caricamento delle aziende dell'utente:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleCompanyCheckbox = (companyId) => {
    setSelectedCompanies((prevSelected) => {
      if (prevSelected.includes(companyId)) {
        return prevSelected.filter((id) => id !== companyId);
      } else {
        return [...prevSelected, companyId];
      }
    });
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      role: user.role || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.firstName.trim()) {
      swal.fire("Errore", "Il nome è obbligatorio", "error");
      return;
    }

    setLoading(true);
    try {
      await updateUser(editingUser.userId, {
        userId: editingUser.userId,
        ...editFormData,
      });
      
      swal.fire("Successo", "Utente aggiornato con successo.", "success");
      refreshData("users");
      
      // Aggiorna l'utente selezionato nello stato
      if (selectedUser && selectedUser.userId === editingUser.userId) {
        setSelectedUser({
          ...selectedUser,
          ...editFormData,
        });
      }
      
      setEditDialogOpen(false);
      setEditingUser(null);
      setEditFormData({});
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'utente:", error);
      swal.fire(
        "Errore",
        error.response?.data || "Errore durante l'aggiornamento dell'utente.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (user) => {
    setEditingUser(user);
    setNewPassword("");
    setResetPasswordDialogOpen(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim()) {
      swal.fire("Errore", "Inserisci la nuova password", "error");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(editingUser.userId, newPassword);
      swal.fire("Successo", "Password resettata con successo.", "success");
      refreshData("users");
      setResetPasswordDialogOpen(false);
      setEditingUser(null);
      setNewPassword("");
    } catch (error) {
      console.error("Errore durante il reset della password:", error);
      swal.fire(
        "Errore",
        error.response?.data || "Errore durante il reset della password.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = (userId, currentStatus) => {
    const newStatus = currentStatus ? 0 : 1;
    toggleUserStatus(userId, newStatus)
      .then(() => {
        swal.fire(
          "Successo",
          `Utente ${currentStatus ? "riattivato" : "disabilitato"} con successo.`,
          "success",
        );
        refreshData("users");
        // Update the selected user in state to reflect the status change
        if (selectedUser && selectedUser.userId === userId) {
          setSelectedUser({
            ...selectedUser,
            userDisabled: newStatus,
          });
        }
      })
      .catch((error) => {
        console.error(
          `Errore durante ${currentStatus ? "la riattivazione" : "la disabilitazione"} dell'utente:`,
          error,
        );
        swal.fire(
          "Errore",
          error.response?.data ||
            `Errore durante ${currentStatus ? "la riattivazione" : "la disabilitazione"} dell'utente.`,
          "error",
        );
      });
  };

  // Gestione delle aziende
  const handleAssignCompaniesToUser = () => {
    if (selectedUser && selectedCompanies.length > 0) {
      Promise.all(
        selectedCompanies.map((companyId) =>
          assignUserToCompany(selectedUser.userId, companyId),
        ),
      )
        .then(() => {
          swal.fire(
            "Successo",
            "Aziende assegnate all'utente con successo.",
            "success",
          );
          handleSelectUser(selectedUser); // Ricarica i dati dell'utente
          setSelectedCompanies([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante l'assegnazione delle aziende all'utente:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante l'assegnazione delle aziende all'utente.",
            "error",
          );
        });
    }
  };

  const handleRemoveCompaniesFromUser = () => {
    if (selectedUser && selectedCompanies.length > 0) {
      Promise.all(
        selectedCompanies.map((companyId) =>
          removeUserFromCompany(selectedUser.userId, companyId),
        ),
      )
        .then((results) => {
          // Controlla se ci sono errori nei risultati
          const errors = results
            .filter((result) => !result?.success)
            .map((result) => result?.message);

          if (errors.length > 0) {
            swal.fire("Attenzione", errors.join("\n"), "warning");
          } else {
            swal.fire(
              "Successo",
              "Aziende rimosse dall'utente con successo.",
              "success",
            );
          }

          handleSelectUser(selectedUser); // Ricarica i dati dell'utente
          setSelectedCompanies([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante la rimozione delle aziende dall'utente:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante la rimozione delle aziende dall'utente.",
            "error",
          );
        });
    }
  };

  const handleSetPrimaryCompany = (companyId) => {
    if (selectedUser) {
      setPrimaryCompany(selectedUser.userId, companyId)
        .then(() => {
          swal.fire(
            "Successo",
            "Azienda principale impostata con successo.",
            "success",
          );
          handleSelectUser({
            ...selectedUser,
            CompanyId: companyId,
          }); // Ricarica i dati dell'utente con il nuovo CompanyId
        })
        .catch((error) => {
          console.error(
            "Errore durante l'impostazione dell'azienda principale:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante l'impostazione dell'azienda principale.",
            "error",
          );
        });
    }
  };

  const handleSaveERPUserId = async (companyId) => {
    if (!selectedUser) return;
    
    const erpUserId = editingERPUserId.value === '' ? 0 : parseInt(editingERPUserId.value);
    
    if (isNaN(erpUserId)) {
      swal.fire("Errore", "Inserisci un numero valido per ERP User ID", "error");
      return;
    }

    setLoading(true);
    try {
      await updateUserERPUserId(selectedUser.userId, companyId, erpUserId);
      swal.fire("Successo", "ERP User ID aggiornato con successo.", "success");
      handleSelectUser(selectedUser); // Ricarica i dati dell'utente
      setEditingERPUserId({ companyId: null, value: '' });
    } catch (error) {
      console.error("Errore durante l'aggiornamento di ERP User ID:", error);
      swal.fire(
        "Errore",
        error.response?.data?.message || "Errore durante l'aggiornamento di ERP User ID.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderUserDetails = () => {
    if (!selectedUser) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Seleziona un utente per visualizzare i dettagli
          </p>
        </div>
      );
    }

    // Trova l'azienda principale dell'utente
    const primaryCompany = companies.find(
      (company) => company.CompanyId === selectedUser.CompanyId,
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-content-around h-11">
          <h3 className="text-lg font-medium">
            {selectedUser.firstName} {selectedUser.lastName}
          </h3>
          <Badge
            variant={selectedUser.userDisabled ? "destructive" : "success"}
          >
            {selectedUser.userDisabled ? "Disabilitato" : "Attivo"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Username</Label>
            <p>{selectedUser.username}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <p>{selectedUser.email || "—"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Telefono</Label>
            <p>{selectedUser.phoneNumber || "—"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Ruolo</Label>
            <p>{selectedUser.role || "—"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Azienda principale</Label>
            <p>{primaryCompany ? primaryCompany.Description : "—"}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleEditUser(selectedUser)}
          >
            <i className="fa-solid fa-pen-to-square mr-2"></i>
            Modifica
          </Button>
          <Button
            variant="outline"
            onClick={() => handleResetPassword(selectedUser)}
          >
            <i className="fa-solid fa-key mr-2"></i>
            Reset password
          </Button>
          <Button
            variant={selectedUser.userDisabled ? "default" : "destructive"}
            onClick={() =>
              handleToggleUserStatus(
                selectedUser.userId,
                selectedUser.userDisabled,
              )
            }
          >
            {selectedUser.userDisabled ? "Riattiva" : "Disabilita"}
          </Button>
        </div>

        <div>
          <h4 className="text-md font-medium mb-2">Gruppi assegnati</h4>
          {selectedUser.groups && selectedUser.groups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedUser.groups.map((group, index) => (
                <Badge
                  key={group.groupId || index}
                  variant=""
                  className="bg-blue-100 text-blue-600 w-100 justify-center h-8"
                >
                  {group.groupName}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nessun gruppo assegnato</p>
          )}
        </div>

        {/* Gestione aziende */}
        <div>
          <div className="flex justify-content-around items-center mb-2 h-11">
            <h4 className="text-md font-medium">Aziende associate</h4>
            {selectedCompanies.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveCompaniesFromUser}
              >
                <i className="fa-solid fa-building-circle-xmark mr-2"></i>
                Rimuovi selezionate
              </Button>
            )}
          </div>

          {loadingCompanies ? (
            <div className="flex justify-center items-center h-40">
              <p>Caricamento aziende...</p>
            </div>
          ) : (
            <ScrollArea className="h-40 border rounded-md p-2">
              {userCompanies.length > 0 ? (
                <div className="space-y-2">
                  {userCompanies.map((company) => (
                    <div
                      key={company.CompanyId}
                      className="flex items-center space-x-3 p-2 hover:bg-accent rounded border"
                    >
                      <Checkbox
                        id={`company-${company.CompanyId}`}
                        checked={selectedCompanies.includes(
                          company.CompanyId,
                        )}
                        className={`${selectedCompanies.includes(company.CompanyId) ? "bg-primary" : ""}`}
                        onCheckedChange={() =>
                          handleCompanyCheckbox(company.CompanyId)
                        }
                      />
                      <Label
                        htmlFor={`company-${company.CompanyId}`}
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {company.Description}
                        {company.CompanyId === selectedUser.CompanyId && (
                          <Badge variant="outline" className="ml-2">
                            Principale
                          </Badge>
                        )}
                      </Label>
                      
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`erp-user-id-${company.CompanyId}`} className="text-sm whitespace-nowrap">
                          ERP User ID:
                        </Label>
                        {editingERPUserId.companyId === company.CompanyId ? (
                          <>
                            <Input
                              id={`erp-user-id-${company.CompanyId}`}
                              type="number"
                              value={editingERPUserId.value}
                              onChange={(e) => setEditingERPUserId({ ...editingERPUserId, value: e.target.value })}
                              className="w-20 h-8"
                              placeholder="0"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveERPUserId(company.CompanyId);
                                } else if (e.key === 'Escape') {
                                  setEditingERPUserId({ companyId: null, value: '' });
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveERPUserId(company.CompanyId)}
                              className="h-8 w-8 p-0"
                            >
                              <i className="fa-solid fa-check"></i>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingERPUserId({ companyId: null, value: '' })}
                              className="h-8 w-8 p-0"
                            >
                              <i className="fa-solid fa-times"></i>
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium w-12 text-center">
                              {company.ERPUserId || 0}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingERPUserId({ companyId: company.CompanyId, value: company.ERPUserId || '' })}
                              className="h-8 w-8 p-0"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {company.CompanyId !== selectedUser.CompanyId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimaryCompany(company.CompanyId);
                          }}
                          className="whitespace-nowrap"
                        >
                          <i className="fa-solid fa-star mr-2"></i>
                          Imposta principale
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground p-2">
                  Nessuna azienda associata
                </p>
              )}
            </ScrollArea>
          )}
        </div>

        <div>
          <div className="flex justify-content-around items-center mb-2 h-11">
            <h4 className="text-md font-medium">Aziende disponibili</h4>
            {selectedCompanies.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleAssignCompaniesToUser}
              >
                <i className="fa-solid fa-building-circle-check mr-2"></i>
                Aggiungi selezionate
              </Button>
            )}
          </div>

          <ScrollArea className="h-40 border rounded-md p-2">
            {companies.length > 0 ? (
              <div className="space-y-2">
                {companies
                  .filter(
                    (company) =>
                      !userCompanies.some(
                        (uc) => uc.CompanyId === company.CompanyId,
                      ),
                  )
                  .map((company) => (
                    <div
                      key={company.CompanyId}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <Checkbox
                          id={`available-company-${company.CompanyId}`}
                          checked={selectedCompanies.includes(
                            company.CompanyId,
                          )}
                          className={`${selectedCompanies.includes(company.CompanyId) ? "bg-primary" : ""}`}
                          onCheckedChange={() =>
                            handleCompanyCheckbox(company.CompanyId)
                          }
                        />
                        <Label
                          htmlFor={`available-company-${company.CompanyId}`}
                          className="flex-1 cursor-pointer"
                        >
                          {company.Description}
                        </Label>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">
                Nessuna azienda disponibile
              </p>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column - User list */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Utenti</CardTitle>
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
            <div className="h-[calc(100vh-230px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('username')}
                    >
                      Username {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="hidden md:table-cell cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('firstName')}
                    >
                      Nome {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="hidden md:table-cell cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastName')}
                    >
                      Cognome {sortConfig.key === 'lastName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="hidden md:table-cell cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}
                    >
                      Ruolo {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Azienda
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(filteredAndSortedUsers) &&
                    filteredAndSortedUsers.map((user) => {
                      const company = companies.find(
                        (c) => c.CompanyId === user.CompanyId,
                      );
                      return (
                        <TableRow
                          key={user.userId}
                          className={`${user.userDisabled ? "bg-red-100" : ""} ${selectedUser && selectedUser.userId === user.userId ? "bg-blue-100" : ""} cursor-pointer`}
                          onClick={() => handleSelectUser(user)}
                        >
                          <TableCell className="font-medium">
                            {user.username}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.firstName}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.lastName}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.role || "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {company?.Description || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right column - User details */}
        <Card>
          <CardHeader>
            <CardTitle>Dettagli utente</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-230px)]">
              {renderUserDetails()}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialog per modifica utente */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogDescription>
              Modifica i dati dell'utente selezionato. Clicca su Salva quando hai finito.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                Nome
              </Label>
              <Input
                id="firstName"
                value={editFormData.firstName || ""}
                onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                className="col-span-3"
                placeholder="Nome"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Cognome
              </Label>
              <Input
                id="lastName"
                value={editFormData.lastName || ""}
                onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                className="col-span-3"
                placeholder="Cognome"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email || ""}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                className="col-span-3"
                placeholder="Email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                Telefono
              </Label>
              <Input
                id="phoneNumber"
                value={editFormData.phoneNumber || ""}
                onChange={(e) => setEditFormData({...editFormData, phoneNumber: e.target.value})}
                className="col-span-3"
                placeholder="Telefono"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Ruolo
              </Label>
              <Input
                id="role"
                value={editFormData.role || ""}
                onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                className="col-span-3"
                placeholder="Ruolo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? "Salvando..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per reset password */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Inserisci la nuova password per l'utente {editingUser?.username}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">
                Nuova Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
                placeholder="Nuova password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSavePassword} disabled={loading}>
              {loading ? "Salvando..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersTab;
