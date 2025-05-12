import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Calendar, Mail } from 'lucide-react';
import useCalendarActions from '../../hooks/useCalendarActions';
import { calendarConfig } from '../../config/calendar';  

const CalendarPreferences = () => {
  const { getCalendarPreferences, updateCalendarPreferences, loading } = useCalendarActions();
  const [preferences, setPreferences] = useState({
    defaultReminderMinutes: calendarConfig.defaultPreferences.defaultReminder,
    digestFrequency: calendarConfig.defaultPreferences.defaultDigestFrequency,
    digestTime: '08:00',
    timeZone: 'Europe/Rome'
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const userPrefs = await getCalendarPreferences();
        setPreferences(userPrefs);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  const handleSave = async () => {
    try {
      await updateCalendarPreferences(preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Preferenze Calendario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Promemoria predefinito */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Promemoria predefinito
          </Label>
          <Select
            value={preferences.defaultReminderMinutes}
            onValueChange={(value) => 
              setPreferences(prev => ({ ...prev, defaultReminderMinutes: value }))
            }
          >
            <SelectTrigger>
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

        {/* Frequenza digest */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Riepilogo attività
          </Label>
          <Select
            value={preferences.digestFrequency}
            onValueChange={(value) => 
              setPreferences(prev => ({ ...prev, digestFrequency: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona frequenza" />
            </SelectTrigger>
            <SelectContent>
              {calendarConfig.defaultPreferences.digestFrequencies.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orario digest */}
        {preferences.digestFrequency !== 'NONE' && (
          <div className="space-y-2">
            <Label>Orario riepilogo</Label>
            <input
              type="time"
              value={preferences.digestTime}
              onChange={(e) => 
                setPreferences(prev => ({ ...prev, digestTime: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Salvataggio...' : 'Salva preferenze'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CalendarPreferences;