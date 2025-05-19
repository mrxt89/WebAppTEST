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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
}) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCompanies, setUserCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState([]);

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
    swal
      .fire({
        title: "Modifica Utente",
        html: `
          <div class="form-group row">
            <label for="firstName" class="col-sm-3 col-form-label">Nome</label>
            <div class="col-sm-8">
              <input type="text" id="firstName" class="form-control" placeholder="Nome" value="${user.firstName}">
            </div>
          </div>
          <div class="form-group row">
            <label for="lastName" class="col-sm-3 col-form-label">Cognome</label>
            <div class="col-sm-8">
              <input type="text" id="lastName" class="form-control" placeholder="Cognome" value="${user.lastName}">
            </div>
          </div>
          <div class="form-group row">
            <label for="email" class="col-sm-3 col-form-label">Email</label>
            <div class="col-sm-8">
              <input type="email" id="email" class="form-control" placeholder="Email" value="${user.email}">
            </div>
          </div>
          <div class="form-group row">
            <label for="phoneNumber" class="col-sm-3 col-form-label">Telefono</label>
            <div class="col-sm-8">
              <input type="text" id="phoneNumber" class="form-control" placeholder="Telefono" value="${user.phoneNumber || ""}">
            </div>
          </div>
          <div class="form-group row">
            <label for="role" class="col-sm-3 col-form-label">Ruolo</label>
            <div class="col-sm-8">
              <input type="text" id="role" class="form-control" placeholder="Ruolo" value="${user.role || ""}">
            </div>
          </div>
      `,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: "Annulla",
        preConfirm: () => {
          const firstName = swal.getPopup().querySelector("#firstName").value;
          const lastName = swal.getPopup().querySelector("#lastName").value;
          const email = swal.getPopup().querySelector("#email").value;
          const phoneNumber = swal
            .getPopup()
            .querySelector("#phoneNumber").value;
          const role = swal.getPopup().querySelector("#role").value;

          if (!firstName) {
            swal.showValidationMessage(`Please enter the first name`);
            return null;
          }
          return {
            userId: user.userId,
            firstName,
            lastName,
            email,
            phoneNumber,
            role,
          };
        },
      })
      .then((result) => {
        if (result.isConfirmed) {
          updateUser(result.value.userId, result.value)
            .then(() => {
              swal.fire(
                "Successo",
                "Utente aggiornato con successo.",
                "success",
              );
              refreshData("users");
              // Update the selected user in state to reflect changes
              setSelectedUser({
                ...selectedUser,
                ...result.value,
              });
            })
            .catch((error) => {
              console.error(
                "Errore durante l'aggiornamento dell'utente:",
                error,
              );
              swal.fire(
                "Errore",
                error.response?.data ||
                  "Errore durante l'aggiornamento dell'utente.",
                "error",
              );
            });
        }
      });
  };

  const handleResetPassword = (userId) => {
    swal
      .fire({
        title: "Reset Password",
        html: `
        <input type="password" id="newPassword" class="archa-input" placeholder="Nuova Password">
      `,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: "Annulla",
        didOpen: () => {
          document.getElementById("newPassword").value = "";
        },
        preConfirm: () => {
          const newPassword = swal
            .getPopup()
            .querySelector("#newPassword").value;
          if (!newPassword) {
            swal.showValidationMessage(`Inserisci la nuova password`);
            return null;
          }
          return { userId, newPassword };
        },
      })
      .then((result) => {
        if (result.isConfirmed) {
          resetPassword(result.value.userId, result.value.newPassword)
            .then(() => {
              swal.fire(
                "Successo",
                "Password resettata con successo.",
                "success",
              );
              refreshData("users");
            })
            .catch((error) => {
              console.error("Errore durante il reset della password:", error);
              swal.fire(
                "Errore",
                error.response?.data ||
                  "Errore durante il reset della password.",
                "error",
              );
            });
        }
      });
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
        <div className="flex items-center justify-between h-14">
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

        <Separator />

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
            onClick={() => handleResetPassword(selectedUser.userId)}
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

        <Separator />

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

        <Separator />

        {/* Gestione aziende */}
        <div>
          <div className="flex justify-between items-center mb-2 h-14">
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
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                    >
                      <div className="flex items-center space-x-2 w-full">
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
                          className="flex-1 cursor-pointer"
                        >
                          {company.Description}{" "}
                          {company.CompanyId === selectedUser.CompanyId && (
                            <Badge variant="outline" className="ml-2">
                              Principale
                            </Badge>
                          )}
                        </Label>
                        {company.CompanyId !== selectedUser.CompanyId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimaryCompany(company.CompanyId);
                            }}
                          >
                            <i className="fa-solid fa-star mr-2"></i>
                            Imposta principale
                          </Button>
                        )}
                      </div>
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
          <div className="flex justify-between items-center mb-2 h-14">
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left column - User list */}
      <Card>
        <CardHeader>
          <CardTitle>Utenti</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-230px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead className="hidden md:table-cell">Nome</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Cognome
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Azienda
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(users) &&
                  users.map((user) => {
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
                          {company?.Description || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </ScrollArea>
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
  );
};

export default UsersTab;
