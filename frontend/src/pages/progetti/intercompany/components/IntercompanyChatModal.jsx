import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Users, MessageCircle, Building2, UserPlus } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { callOpenChatModal } from '@/redux/features/notifications/notificationsSlice';
import { useToast } from '@/components/ui/use-toast';
import { config } from '@/config';
import axios from 'axios';

const IntercompanyChatModal = ({ 
  isOpen, 
  onClose, 
  selectedRequest, 
  onChatCreated 
}) => {
  const { sendNotification, fetchUsers, fetchResponseOptions } = useNotifications();
  const { toast } = useToast();
  
  // Stati del form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [intercompanyCategoryId, setIntercompanyCategoryId] = useState(1);

  // Inizializza il titolo basato sulla richiesta
  useEffect(() => {
    if (selectedRequest && isOpen) {
      const chatTitle = `Chat Intercompany - ${selectedRequest.ComponentCode}`;
      setTitle(chatTitle);
      setMessage('');
      setSelectedUsers([]);
      setSelectedCompanies([]);
    }
  }, [selectedRequest, isOpen]);

  // Carica utenti e aziende disponibili
  useEffect(() => {
    if (isOpen) {
      loadUsersAndCompanies();
      loadIntercompanyCategory();
    }
  }, [isOpen]);

  const loadUsersAndCompanies = async () => {
    try {
      setLoading(true);
      
      // Carica utenti
      const usersData = await fetchUsers();
      if (usersData) {
        setAvailableUsers(usersData.filter(user => !user.userDisabled));
      }

      // Carica aziende
      const token = localStorage.getItem('token');
      const companiesResponse = await axios.get(
        `${config.API_BASE_URL}/companies`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (companiesResponse.data) {
        setAvailableCompanies(companiesResponse.data);
      }
    } catch (error) {
      console.error('Errore nel caricamento utenti e aziende:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare la lista utenti',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIntercompanyCategory = async () => {
    try {
      const responseOptions = await fetchResponseOptions();
      if (responseOptions) {
        // Cerca la categoria intercompany
        const intercompanyCategory = responseOptions.find(
          option => option.name === 'Chat Intercompany' || option.intercompany === 1
        );
        if (intercompanyCategory) {
          setIntercompanyCategoryId(intercompanyCategory.notificationCategoryId);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento categoria intercompany:', error);
    }
  };

  // Filtra utenti per ricerca
  const filteredUsers = availableUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = selectedCompanies.length === 0 || 
      selectedCompanies.includes(user.CompanyId);
    
    return matchesSearch && matchesCompany;
  });

  // Gestione selezione utenti
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Gestione selezione aziende
  const toggleCompanySelection = (companyId) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  // Invia chat
  const handleSendChat = async () => {
    if (!title.trim()) {
      swal.fire('Errore', 'Inserisci un titolo per la chat', 'error');
      return;
    }

    if (!message.trim()) {
      swal.fire('Errore', 'Inserisci un messaggio', 'error');
      return;
    }

    if (selectedUsers.length === 0) {
      swal.fire('Errore', 'Seleziona almeno un destinatario', 'error');
      return;
    }

    try {
      setLoading(true);

      // Crea la chat usando il sistema di notifiche esistente
      const notificationData = {
        notificationId: 0, // 0 = nuova chat
        title: title.trim(),
        message: message.trim(),
        receiversList: selectedUsers.join('-'),
        notificationCategoryId: intercompanyCategoryId, // Usa categoria intercompany se disponibile
        responseOptionId: 3, // Default response option
        // Metadata per collegare alla reference intercompany
        metadata: {
          autoLink: true,
          documentType: 'IntercompanyReference',
          referenceId: selectedRequest.ReferenceId,
          componentCode: selectedRequest.ComponentCode,
          sourceCompanyId: selectedRequest.SourceCompanyId,
          targetCompanyId: selectedRequest.TargetCompanyId
        }
      };

      const newNotification = await sendNotification(notificationData);
      
      if (newNotification) {
        // Collega la chat alla reference intercompany
        try {
          const token = localStorage.getItem('token');
          await axios.post(
            `${config.API_BASE_URL}/notifications/${newNotification.notificationId}/documents`,
            {
              documentType: 'IntercompanyReference',
              referenceId: selectedRequest.ReferenceId,
              componentCode: selectedRequest.ComponentCode,
              sourceCompanyId: selectedRequest.SourceCompanyId,
              targetCompanyId: selectedRequest.TargetCompanyId
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
        } catch (linkError) {
          console.error('Errore nel collegamento della chat:', linkError);
          // Non bloccare il flusso se il collegamento fallisce
        }

        toast({
          title: 'Chat creata',
          description: 'Chat intercompany creata con successo!',
          variant: 'default'
        });
        
        // Apri la chat nell'interfaccia (come fa NewMessageWindow)
        callOpenChatModal(newNotification.notificationId);
        
        onClose();
      }
    } catch (error) {
      console.error('Errore nella creazione della chat:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile creare la chat',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Raggruppa utenti per azienda
  const usersByCompany = filteredUsers.reduce((acc, user) => {
    const company = availableCompanies.find(c => c.CompanyId === user.CompanyId);
    const companyName = company ? company.Description : 'Azienda sconosciuta';
    
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(user);
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Nuova Chat Intercompany
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Informazioni richiesta */}
          {selectedRequest && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Richiesta Intercompany</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Componente:</span>
                    <span className="ml-2 font-medium">{selectedRequest.ComponentCode}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Descrizione:</span>
                    <span className="ml-2">{selectedRequest.ComponentDescription}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Da:</span>
                    <span className="ml-2">{selectedRequest.SourceCompanyName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">A:</span>
                    <span className="ml-2">{selectedRequest.TargetCompanyName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form chat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonna sinistra - Configurazione */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titolo Chat</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Inserisci il titolo della chat"
                />
              </div>

              <div>
                <Label htmlFor="message">Messaggio Iniziale</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Scrivi il primo messaggio della chat..."
                  rows={4}
                />
              </div>

              {/* Filtri */}
              <div className="space-y-3">
                <Label>Filtri</Label>
                
                <div>
                  <Label htmlFor="search">Cerca utenti</Label>
                  <Input
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nome, cognome o username..."
                  />
                </div>

                <div>
                  <Label>Aziende</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableCompanies.map(company => (
                      <Badge
                        key={company.CompanyId}
                        variant={selectedCompanies.includes(company.CompanyId) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCompanySelection(company.CompanyId)}
                      >
                        {company.Description}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Colonna destra - Selezione utenti */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Seleziona Destinatari</Label>
                <Badge variant="secondary">
                  {selectedUsers.length} selezionati
                </Badge>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {Object.entries(usersByCompany).map(([companyName, users]) => (
                  <div key={companyName} className="border-b last:border-b-0">
                    <div className="p-3 bg-gray-50 font-medium text-sm text-gray-700">
                      {companyName}
                    </div>
                    <div className="p-2 space-y-2">
                      {users.map(user => (
                        <div
                          key={user.userId}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => toggleUserSelection(user.userId)}
                        >
                          <Checkbox
                            checked={selectedUsers.includes(user.userId)}
                            onChange={() => toggleUserSelection(user.userId)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annulla
            </Button>
            <Button 
              onClick={handleSendChat} 
              disabled={loading || !title.trim() || !message.trim() || selectedUsers.length === 0}
            >
              {loading ? 'Creazione...' : 'Crea Chat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntercompanyChatModal;
