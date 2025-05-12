import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Clock, Loader2, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calendarConfig } from '../../config/calendar';

const CalendarIntegration = ({ 
  task, 
  assignedUsers = [], 
  onUpdateEvent, 
  canEdit,
  calendarState,
  setCalendarState
}) => {
  // Inizializza i partecipanti quando cambia il task
  useEffect(() => {
    if (task) {
      const participants = [];
      if (task.AssignedTo) {
        participants.push(task.AssignedTo.toString());
      }
      if (task.AdditionalAssignees) {
        try {
          const additionalUsers = JSON.parse(task.AdditionalAssignees);
          participants.push(...additionalUsers.map(id => id.toString()));
        } catch (e) {
          console.error('Error parsing additional assignees:', e);
        }
      }
      setCalendarState(prev => ({
        ...prev,
        selectedParticipants: [...new Set(participants)],
        eventSynced: task.CalendarEventsCount > 0
      }));
    }
  }, [task, setCalendarState]);

  const handleSendInvites = async () => {
    if (calendarState.selectedParticipants.length === 0) {
      setCalendarState(prev => ({
        ...prev,
        error: 'Seleziona almeno un partecipante'
      }));
      return;
    }

    try {
      setCalendarState(prev => ({ ...prev, loading: true, error: null }));
      
      const participants = calendarState.selectedParticipants.map(userId => ({
        userId: parseInt(userId),
        reminderMinutes: parseInt(calendarState.reminderTime)
      }));

      await onUpdateEvent(participants);
      setCalendarState(prev => ({ 
        ...prev, 
        eventSynced: true,
        loading: false,
        error: null
      }));
    } catch (err) {
      setCalendarState(prev => ({
        ...prev,
        error: err.message || 'Errore nell\'invio degli inviti',
        loading: false,
        eventSynced: false
      }));
    }
  };

  const handleRemoveFromCalendar = async () => {
    if (!window.confirm('Sei sicuro di voler rimuovere questo evento dal calendario?')) {
      return;
    }
    
    try {
      setCalendarState(prev => ({ ...prev, loading: true, error: null }));
      // In futuro qui andrà la chiamata all'API per rimuovere l'evento
      setCalendarState(prev => ({
        ...prev,
        eventSynced: false,
        selectedParticipants: [],
        error: null,
        loading: false
      }));
    } catch (error) {
      setCalendarState(prev => ({
        ...prev,
        error: 'Errore nella rimozione dell\'evento',
        loading: false
      }));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Gestione Calendario
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calendarState.error && (
            <Alert variant="destructive">
              <AlertDescription>{calendarState.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sincronizzazione Calendario</Label>
              <div className="text-sm text-gray-500">
                Invia inviti calendario ai partecipanti
              </div>
            </div>
            <Switch
              checked={calendarState.eventSynced}
              onChange={(checked) => {
                if (checked) {
                  setCalendarState(prev => ({ ...prev, eventSynced: true }));
                } else {
                  handleRemoveFromCalendar();
                }
              }}
              disabled={!canEdit || calendarState.loading}
              aria-label="Abilita sincronizzazione calendario"
            />
          </div>

          {calendarState.eventSynced && (
            <div className="space-y-4 pt-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="reminder-select">Promemoria</Label>
                <Select 
                  id="reminder-select"
                  value={calendarState.reminderTime}
                  onValueChange={(value) => 
                    setCalendarState(prev => ({ ...prev, reminderTime: value }))
                  }
                  disabled={calendarState.loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona quando" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendarConfig.defaultPreferences.reminderTimes.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Partecipanti</Label>
                <div className="space-y-2">
                  {assignedUsers
                    .filter(user => calendarState.selectedParticipants.includes(user.userId.toString()))
                    .map((user) => (
                      <div key={user.userId} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                          </div>
                          <span>{user.firstName} {user.lastName}</span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          {calendarConfig.defaultPreferences.reminderTimes
                            .find(t => t.value === calendarState.reminderTime)?.label}
                        </Badge>
                      </div>
                  ))}
                  {calendarState.selectedParticipants.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        Nessun partecipante selezionato
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={handleSendInvites}
                  disabled={calendarState.loading || !canEdit || calendarState.selectedParticipants.length === 0}
                >
                  {calendarState.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {calendarState.loading ? 'Invio in corso...' : 'Invia Inviti'}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  onClick={handleRemoveFromCalendar}
                  disabled={calendarState.loading || !canEdit}
                >
                  <X className="w-4 h-4" />
                  Rimuovi dal Calendario
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarIntegration;