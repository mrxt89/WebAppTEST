// frontend/src/config/calendar.js

export const calendarConfig = {
    // Opzioni di visualizzazione
    ui: {
        defaultView: 'week',
        startOfWeek: 1,  // 0 = domenica, 1 = lunedì
        workingHours: {
            start: 9,
            end: 18
        },
        timeSlotDuration: 30,  // minuti
        showWeekends: true
    },

    // Preferenze utente di default
    defaultPreferences: {
        reminderTimes: [
            { value: '15', label: '15 minuti prima' },
            { value: '30', label: '30 minuti prima' },
            { value: '60', label: '1 ora prima' },
            { value: '1440', label: '1 giorno prima' }
        ],
        digestFrequencies: [
            { value: 'NONE', label: 'Nessun riepilogo' },
            { value: 'DAILY', label: 'Giornaliero' },
            { value: 'WEEKLY', label: 'Settimanale' }
        ],
        defaultReminder: '30',
        defaultDigestFrequency: 'DAILY'
    },

    // Stati possibili per gli eventi
    eventStates: {
        PENDING: 'PENDING',
        CONFIRMED: 'CONFIRMED',
        CANCELLED: 'CANCELLED'
    },

    // Configurazione colori per tipo di evento
    colors: {
        task: {
            background: '#E3F2FD',
            border: '#2196F3',
            text: '#1565C0'
        },
        reminder: {
            background: '#FFF3E0',
            border: '#FF9800',
            text: '#E65100'
        },
        deadline: {
            background: '#FFEBEE',
            border: '#F44336',
            text: '#C62828'
        }
    },

    // Testi e messaggi
    labels: {
        createEvent: 'Crea evento calendario',
        updateEvent: 'Aggiorna evento',
        deleteEvent: 'Elimina evento',
        reminderLabel: 'Promemoria',
        participantsLabel: 'Partecipanti',
        confirmDelete: 'Sei sicuro di voler eliminare questo evento?',
        eventCreated: 'Evento creato con successo',
        eventUpdated: 'Evento aggiornato con successo',
        eventDeleted: 'Evento eliminato con successo',
        error: {
            create: 'Errore nella creazione dell\'evento',
            update: 'Errore nell\'aggiornamento dell\'evento',
            delete: 'Errore nell\'eliminazione dell\'evento'
        }
    },

    // Formati date e orari
    dateTimeFormats: {
        full: 'DD/MM/YYYY HH:mm',
        date: 'DD/MM/YYYY',
        time: 'HH:mm',
        dayNames: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
        monthNames: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    }
};

export default calendarConfig;