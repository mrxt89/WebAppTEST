// services/calendarService.js
const ical = require('ical-generator');
const nodemailer = require('nodemailer');
const sql = require('mssql');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class CalendarService {
    constructor() {
        // Verifica che le variabili d'ambiente necessarie esistano
        this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.password
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
        // Verifica la configurazione al startup
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP Verification Error:', error);
            } else {
                console.log('SMTP Server is ready to take messages');
            }
        });

        this.maxRetries = 3;
        this.retryDelay = 1000;
    }


    /**
     * Invia una email con retry logic
     * @param {Object} emailData - Dati email da inviare
     */
    async sendWithRetry(emailData) {
        emailData.from = config.smtp.from;

        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await this.transporter.sendMail(emailData);
                console.log(`Email sent successfully to ${emailData.to}`);
                return;
            } catch (error) {
                lastError = error;
                console.error(`Email send attempt ${attempt} failed:`, error);
                if (attempt < this.maxRetries) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1))
                    );
                }
            }
        }
        throw lastError;
    }


    /**
     * Valida i dati dell'evento
     * @param {Object} taskData - Dati del task
     * @param {Array} participants - Lista partecipanti
     */
    validateEventData(taskData, participants) {
        if (!taskData.TaskID) throw new Error('TaskID is required');
        if (!taskData.StartDate || !taskData.DueDate) {
            throw new Error('Start and due dates are required');
        }
        if (new Date(taskData.StartDate) > new Date(taskData.DueDate)) {
            throw new Error('Start date must be before due date');
        }
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            throw new Error('At least one participant is required');
        }
    }

    /**
     * Crea un nuovo evento calendario per un'attività
     * @param {Object} taskData - Dati dell'attività
     * @param {Array} participants - Lista dei partecipanti
     */
    async createTaskEvent(taskData, participants) {
        // Valida input
        this.validateEventData(taskData, participants);
    
        const pool = await sql.connect(config.database);
        const transaction = new sql.Transaction(pool);
    
        try {
            await transaction.begin();
    
            // Genera UID evento
            const eventUID = uuidv4();
    
            // Inserisci evento
            const eventResult = await new sql.Request(transaction)
                .input('TaskID', sql.Int, taskData.TaskID)
                .input('EventType', sql.VarChar(50), 'TASK_CREATED')
                .input('EventUID', sql.VarChar(255), eventUID)
                .input('Subject', sql.NVarChar(255), taskData.Title)
                .input('Description', sql.NVarChar(sql.Max), taskData.Description)
                .input('StartDate', sql.DateTime, new Date(taskData.StartDate))
                .input('EndDate', sql.DateTime, new Date(taskData.DueDate))
                .input('CreatedBy', sql.Int, taskData.createdBy)
                .query(`
                    INSERT INTO MA_CalendarEvents (
                        TaskID, EventType, EventUID, Subject, Description, 
                        StartDate, EndDate, CreatedBy
                    )
                    OUTPUT INSERTED.EventID
                    VALUES (
                        @TaskID, @EventType, @EventUID, @Subject, @Description,
                        @StartDate, @EndDate, @CreatedBy
                    )
                `);
    
            const eventId = eventResult.recordset[0].EventID;
    
            // Inserisci partecipanti
            for (const participant of participants) {
                await new sql.Request(transaction)
                    .input('EventID', sql.Int, eventId)
                    .input('UserID', sql.Int, participant.userId)
                    .input('ReminderMinutes', sql.Int, participant.reminderMinutes)
                    .query(`
                        INSERT INTO MA_CalendarEventParticipants (
                            EventID, UserID, ReminderMinutes
                        )
                        VALUES (
                            @EventID, @UserID, @ReminderMinutes
                        )
                    `);
            }
    
            // Crea e invia inviti calendario
            await this.sendCalendarInvites(eventId, transaction);
    
            await transaction.commit();
            return { success: true, eventId };
        } catch (error) {
            await transaction.rollback();
            console.error('Error creating calendar event:', error);
            throw error;
        }
    }

    /**
     * Invia gli inviti calendario ai partecipanti
     * @param {number} eventId - ID dell'evento
     * @param {sql.Transaction} transaction - Transazione SQL attiva
     */
    async sendCalendarInvites(eventId, transaction) {
        // Recupera dettagli evento e partecipanti
        const eventData = await new sql.Request(transaction)
            .input('EventID', sql.Int, eventId)
            .query(`
                SELECT 
                    e.*,
                    t.TaskID,
                    t.Title as TaskTitle,
                    t.Description as TaskDescription,
                    p.ProjectID,
                    p.Name as ProjectName
                FROM MA_CalendarEvents e
                JOIN MA_ProjectTasks t ON e.TaskID = t.TaskID
                JOIN MA_Projects p ON t.ProjectID = p.ProjectID
                WHERE e.EventID = @EventID
            `);

        const event = eventData.recordset[0];

        const participantsData = await new sql.Request(transaction)
        .input('EventID', sql.Int, eventId)
        .query(`
            SELECT 
                ep.EventID,
                ep.UserID,
                ep.ParticipantStatus,
                ep.NotificationSent,
                ep.LastNotificationDate,
                ep.ReminderMinutes,
                u.email,      -- Aggiunto campo email
                u.firstName,
                u.lastName
            FROM MA_CalendarEventParticipants ep
            INNER JOIN AR_Users u ON ep.UserID = u.userId
            WHERE ep.EventID = @EventID
            AND u.email IS NOT NULL   -- Filtriamo solo utenti con email
            AND u.email != ''     -- Filtriamo solo utenti con email
            AND u.userDisabled = 0    -- Solo utenti attivi
        `);

        // Crea calendario iCal
        const calendar = ical({
            domain: config.domain || 'yourdomain.com',
            name: 'Project Management Calendar'
        });

        // Crea evento nel calendario
        const calEvent = calendar.createEvent({
            uid: event.EventUID,
            start: event.StartDate,
            end: event.EndDate,
            summary: event.Subject,
            description: this.formatEventDescription(event),
            sequence: event.Sequence || 0,
            method: 'REQUEST'
        });

        // Aggiungi partecipanti
        participantsData.recordset.forEach(participant => {
            if (!participant.email) {
                console.warn(`Skipping participant ${participant.UserID} (${participant.firstName} ${participant.lastName}): no email address`);
                return;
            }
            
            calEvent.createAttendee({
                email: participant.email,
                name: `${participant.firstName} ${participant.lastName}`,
                rsvp: true
            });
        });

        // Se non ci sono partecipanti con email valide
        if (!participantsData.recordset.some(p => p.email)) {
            throw new Error('No valid participants with email addresses found');
        }

        // Invia inviti
        for (const participant of participantsData.recordset) {
            try {
                await this.sendCalendarEmail(
                    participant.email,
                    event.Subject,
                    calendar.toString(),
                    event
                );

                // Aggiorna stato invio
                await new sql.Request(transaction)
                    .input('EventID', sql.Int, eventId)
                    .input('UserID', sql.Int, participant.UserID)
                    .input('NotificationDate', sql.DateTime, new Date())
                    .query(`
                        UPDATE MA_CalendarEventParticipants
                        SET NotificationSent = 1,
                            LastNotificationDate = @NotificationDate
                        WHERE EventID = @EventID AND UserID = @UserID
                    `);
            } catch (error) {
                console.error(`Failed to send invitation to ${participant.email}:`, error);
                // Continua con gli altri partecipanti anche se uno fallisce
            }
        }

        // Aggiorna timestamp ultimo invio
        await new sql.Request(transaction)
            .input('EventID', sql.Int, eventId)
            .input('LastSent', sql.DateTime, new Date())
            .query(`
                UPDATE MA_CalendarEvents
                SET LastSent = @LastSent
                WHERE EventID = @EventID
            `);
    }

    /**
     * Formatta la descrizione dell'evento per l'invito
     * @param {Object} event - Dati evento
     * @returns {string} Descrizione formattata
     */
    formatEventDescription(event) {
        return `
Progetto: ${event.ProjectName}
Attività: ${event.TaskTitle}

${event.TaskDescription || ''}

Questo è un invito automatico generato dal sistema di gestione progetti.
        `.trim();
    }

    /**
     * Invia email con invito calendario
     * @param {string} to - Email destinatario
     * @param {string} subject - Oggetto email
     * @param {string} icsContent - Contenuto file ICS
     * @param {Object} event - Dati evento
     */
    async sendCalendarEmail(to, subject, icsContent, event) {
        const emailSubject = `Invito: ${subject}`;
        const emailBody = `
Sei stato invitato a partecipare all'attività "${event.TaskTitle}" del progetto "${event.ProjectName}".

Data inizio: ${event.StartDate.toLocaleString()}
Data fine: ${event.EndDate.toLocaleString()}

Per visualizzare i dettagli dell'attività, accedi alla WebApp. 

L'invito è stato generato automaticamente, per favore non rispondere a questa email.
        `.trim();

        const emailData = {
            from: process.env.SMTP_FROM,
            to: to,
            subject: emailSubject,
            text: emailBody,
            icalEvent: {
                filename: 'invitation.ics',
                method: 'REQUEST',
                content: icsContent
            }
        };

        await this.sendWithRetry(emailData);
    }

    /**
     * Aggiorna un evento esistente
     * @param {number} eventId - ID evento
     * @param {Object} updateData - Dati da aggiornare
     */
    async updateEvent(eventId, updateData) {
        const pool = await sql.connect(config.database);
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // Aggiorna evento
            const result = await new sql.Request(transaction)
                .input('EventID', sql.Int, eventId)
                .input('Subject', sql.NVarChar(255), updateData.Subject)
                .input('Description', sql.NVarChar(sql.Max), updateData.Description)
                .input('StartDate', sql.DateTime, new Date(updateData.StartDate))
                .input('EndDate', sql.DateTime, new Date(updateData.EndDate))
                .input('ModifiedBy', sql.Int, updateData.ModifiedBy)
                .input('ModifiedDate', sql.DateTime, new Date())
                .query(`
                    UPDATE MA_CalendarEvents
                    SET Subject = @Subject,
                        Description = @Description,
                        StartDate = @StartDate,
                        EndDate = @EndDate,
                        ModifiedBy = @ModifiedBy,
                        ModifiedDate = @ModifiedDate,
                        Sequence = Sequence + 1
                    WHERE EventID = @EventID
                `);

            // Se ci sono nuovi partecipanti, aggiornali
            if (updateData.participants && updateData.participants.length > 0) {
                // Rimuovi vecchi partecipanti
                await new sql.Request(transaction)
                    .input('EventID', sql.Int, eventId)
                    .query('DELETE FROM MA_CalendarEventParticipants WHERE EventID = @EventID');

                // Inserisci nuovi partecipanti
                for (const participant of updateData.participants) {
                    await new sql.Request(transaction)
                        .input('EventID', sql.Int, eventId)
                        .input('UserID', sql.Int, participant.userId)
                        .input('ReminderMinutes', sql.Int, participant.reminderMinutes)
                        .query(`
                            INSERT INTO MA_CalendarEventParticipants (
                                EventID, UserID, ReminderMinutes
                            )
                            VALUES (
                                @EventID, @UserID, @ReminderMinutes
                            )
                        `);
                }

                // Rinvia gli inviti
                await this.sendCalendarInvites(eventId, transaction);
            }

            await transaction.commit();
            return { success: true };
        } catch (error) {
            await transaction.rollback();
            console.error('Error updating calendar event:', error);
            throw error;
        }
    }

    /**
     * Elimina un evento
     * @param {number} eventId - ID evento
     */
    async deleteEvent(eventId) {
        const pool = await sql.connect(config.database);
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // Elimina partecipanti
            await new sql.Request(transaction)
                .input('EventID', sql.Int, eventId)
                .query('DELETE FROM MA_CalendarEventParticipants WHERE EventID = @EventID');

            // Elimina evento
            await new sql.Request(transaction)
                .input('EventID', sql.Int, eventId)
                .query('DELETE FROM MA_CalendarEvents WHERE EventID = @EventID');

            await transaction.commit();
            return { success: true };
        } catch (error) {
            await transaction.rollback();
            console.error('Error deleting calendar event:', error);
            throw error;
        }
    }
}

module.exports = new CalendarService();