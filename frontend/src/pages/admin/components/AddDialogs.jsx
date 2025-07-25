import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { swal } from "../../../lib/common";

// Dialog per aggiungere nuovo utente
export const AddUserDialog = ({ open, onOpenChange, onConfirm, companies = [] }) => {
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    email: "",
    userBadge: "",
    role: "",
    phoneNumber: "",
    companies: [],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!formData.username || !formData.firstName || !formData.password) {
      swal.fire("Errore", "Username, nome e password sono obbligatori", "error");
      return;
    }

    if (formData.companies.length === 0) {
      swal.fire("Errore", "Seleziona almeno un'azienda", "error");
      return;
    }

    setLoading(true);
    onConfirm(formData)
      .then(() => {
        swal.fire("Successo", "Utente aggiunto con successo.", "success");
        onOpenChange(false);
        setFormData({
          username: "",
          firstName: "",
          lastName: "",
          password: "",
          email: "",
          userBadge: "",
          role: "",
          phoneNumber: "",
          companies: [],
        });
      })
      .catch((error) => {
        console.error("Errore durante l'aggiunta dell'utente:", error);
        swal.fire(
          "Errore",
          error.response?.data || "Errore durante l'aggiunta dell'utente.",
          "error",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCompanyChange = (companyId, checked) => {
    setFormData(prev => ({
      ...prev,
      companies: checked 
        ? [...prev.companies, parseInt(companyId)]
        : prev.companies.filter(id => id !== parseInt(companyId))
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
          <DialogDescription>
            Inserisci i dati del nuovo utente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="col-span-3"
              placeholder="Username"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">Nome</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="col-span-3"
              placeholder="Nome"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">Cognome</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="col-span-3"
              placeholder="Cognome"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="col-span-3"
              placeholder="Password"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="col-span-3"
              placeholder="Email"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="userBadge" className="text-right">Badge</Label>
            <Input
              id="userBadge"
              value={formData.userBadge}
              onChange={(e) => setFormData({ ...formData, userBadge: e.target.value })}
              className="col-span-3"
              placeholder="Badge"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Ruolo</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="col-span-3"
              placeholder="Ruolo"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phoneNumber" className="text-right">Telefono</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="col-span-3"
              placeholder="Telefono"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Aziende</Label>
            <div className="col-span-3 space-y-2 max-h-32 overflow-y-auto">
              {companies.map((company) => (
                <div key={company.CompanyId} className="flex items-center space-x-2">
                  <Checkbox
                    id={`company-${company.CompanyId}`}
                    checked={formData.companies.includes(company.CompanyId)}
                    onCheckedChange={(checked) => handleCompanyChange(company.CompanyId, checked)}
                  />
                  <Label htmlFor={`company-${company.CompanyId}`} className="text-sm">
                    {company.Description}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Aggiunta..." : "Aggiungi Utente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Dialog per aggiungere nuovo gruppo
export const AddGroupDialog = ({ open, onOpenChange, onConfirm }) => {
  const [formData, setFormData] = useState({
    groupName: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!formData.groupName) {
      swal.fire("Errore", "Il nome del gruppo è obbligatorio", "error");
      return;
    }

    setLoading(true);
    onConfirm(formData)
      .then(() => {
        swal.fire("Successo", "Gruppo aggiunto con successo.", "success");
        onOpenChange(false);
        setFormData({ groupName: "", description: "" });
      })
      .catch((error) => {
        console.error("Errore durante l'aggiunta del gruppo:", error);
        swal.fire(
          "Errore",
          error.response?.data || "Errore durante l'aggiunta del gruppo.",
          "error",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Nuovo Gruppo</DialogTitle>
          <DialogDescription>
            Inserisci i dati del nuovo gruppo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="groupName" className="text-right">Nome Gruppo</Label>
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              className="col-span-3"
              placeholder="Nome Gruppo"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Descrizione</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="col-span-3"
              placeholder="Descrizione"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Aggiunta..." : "Aggiungi Gruppo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Dialog per aggiungere nuovo canale di notifica
export const AddNotificationChannelDialog = ({ open, onOpenChange, onConfirm }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hexColor: "#000000",
    defaultResponseOptionId: "1",
    defaultTitle: "",
    intercompany: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!formData.name || !formData.description || !formData.hexColor || !formData.defaultResponseOptionId) {
      swal.fire("Errore", "Campi obbligatori: nome canale, descrizione, colore, risposta di default", "error");
      return;
    }

    setLoading(true);
    onConfirm(formData)
      .then(() => {
        swal.fire("Successo", "Canale di notifica aggiunto con successo.", "success");
        onOpenChange(false);
        setFormData({
          name: "",
          description: "",
          hexColor: "#000000",
          defaultResponseOptionId: "1",
          defaultTitle: "",
          intercompany: false,
        });
      })
      .catch((error) => {
        console.error("Errore durante l'aggiunta del canale di notifica:", error);
        swal.fire(
          "Errore",
          error.response?.data || "Errore durante l'aggiunta del canale di notifica.",
          "error",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Nuovo Canale di Notifica</DialogTitle>
          <DialogDescription>
            Inserisci i dati del nuovo canale di notifica.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="channelName" className="text-right">Nome Canale</Label>
            <Input
              id="channelName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-3"
              placeholder="Nome Canale"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Descrizione</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="col-span-3"
              placeholder="Descrizione"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">Colore</Label>
            <Input
              type="color"
              id="color"
              value={formData.hexColor}
              onChange={(e) => setFormData({ ...formData, hexColor: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="responseType" className="text-right">Tipo di Risposta</Label>
            <Select
              value={formData.defaultResponseOptionId}
              onValueChange={(value) => setFormData({ ...formData, defaultResponseOptionId: value })}
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
            <Label htmlFor="defaultTitle" className="text-right">Titolo di Default</Label>
            <Input
              id="defaultTitle"
              value={formData.defaultTitle}
              onChange={(e) => setFormData({ ...formData, defaultTitle: e.target.value })}
              className="col-span-3"
              placeholder="Titolo di Default"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="intercompany" className="text-right">Intercompany</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                id="intercompany"
                checked={formData.intercompany}
                onCheckedChange={(checked) => setFormData({ ...formData, intercompany: checked })}
              />
              <Label htmlFor="intercompany" className="text-sm">
                Canale Intercompany
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Aggiunta..." : "Aggiungi Canale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 