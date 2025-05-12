// backend/config/calendar.js

const calendarConfig = {
    email: {
        host: process.env.SMTP_HOST || 'smtp.office365.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com'
    },
    
    // Configurazioni di default per gli eventi
    defaults: {
        reminderMinutes: 30,
        digestFrequency: 'DAILY',
        digestTime: '08:00',
        timezone: 'Europe/Rome'
    },
    
    // Template per le email
    templates: {
        invitation: {
            subject: 'Invito: {taskTitle}',
            body: `
Sei stato invitato a partecipare all'attività "{taskTitle}" del progetto "{projectName}".

Data inizio: {startDate}
Data fine: {endDate}

{taskDescription}

Puoi visualizzare i dettagli dell'attività al seguente link:
{taskUrl}

Questo invito è stato aggiunto automaticamente al tuo calendario.
            `.trim()
        },
        update: {
            subject: 'Aggiornamento: {taskTitle}',
            body: `
L'attività "{taskTitle}" del progetto "{projectName}" è stata aggiornata.

Modifiche:
{changes}

Data inizio: {startDate}
Data fine: {endDate}

Puoi visualizzare i dettagli dell'attività al seguente link:
{taskUrl}

Il tuo calendario è stato aggiornato automaticamente.
            `.trim()
        },
        reminder: {
            subject: 'Promemoria: {taskTitle}',
            body: `
Promemoria per l'attività "{taskTitle}" del progetto "{projectName}".

Scadenza: {dueDate}

Puoi visualizzare i dettagli dell'attività al seguente link:
{taskUrl}

Si prega di verificare lo stato dell'attività e aggiornarlo se necessario.
            `.trim()
        },
        digest: {
            subject: 'Riepilogo Attività Giornaliere',
            body: `
Ecco il riepilogo delle tue attività:

Attività in scadenza oggi:
{dueTodayTasks}

Attività in scadenza questa settimana:
{dueThisWeekTasks}

Attività in ritardo:
{overdueTasks}

Puoi visualizzare tutte le tue attività al seguente link:
{dashboardUrl}
            `.trim()
        }
    },

    // Configurazioni per la gestione degli eventi
    events: {
        maxParticipants: 50,
        updateThrottleMs: 5000,  // Minimo tempo tra aggiornamenti consecutivi
        maxRetries: 3,           // Numero massimo di tentativi di invio
        retryDelayMs: 1000       // Tempo di attesa tra i tentativi
    },

    // Configurazioni per i reminder
    reminders: {
        enabled: true,
        defaultTimes: [30, 60, 1440],  // minuti prima dell'evento (30m, 1h, 24h)
        maxRemindersPerEvent: 3
    }
};

module.exports = calendarConfig;