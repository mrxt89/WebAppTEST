# Sistema di Gestione Problemi IT tramite Ticket

## Indice
[Funzionalità](#funzionalità)
   - Apertura e visualizzazione ticket
   - Stati del ticket
   - Assegnazione e presa in carico
   - Storico risoluzione
   - Allegati e commenti
   - Categorie e priorità
   - Filtri e ricerca
   - Notifiche
   - Visibilità basata sui ruoli

[Struttura Database](#struttura-database)
   - AR_Ticket
   - AR_TicketPriority
   - AR_TicketStatus
   - AR_TicketCategory
   - AR_TicketResolution
   - AR_TicketAttachment
   - AR_TicketChat

[Workflow dei Ticket](#workflow-dei-ticket)
   - Creazione
   - Classificazione
   - Assegnazione
   - Presa in carico
   - Comunicazione continua
   - Risoluzione
   - Feedback e riapertura

[Integrazione Chatbot](#integrazione-chatbot)

---

## Funzionalità

* **Apertura e visualizzazione ticket:** gli utenti autenticati (operai, picker, magazzinieri, ecc...) possono creare un ticket compilando un form con titolo, descrizione del problema, categoria e priorità. Possono quindi visualizzare la lista dei propri ticket aperti e lo stato di avanzamento. Il frontend React/Vite mostrerà i ticket relativi all'utente filtrati per Workcenter.
* **Stati del ticket:** ogni ticket passa attraverso stati standard (ad es. *Aperto*, *In lavorazione*, *Risolto*, *Chiuso*). Lo stato viene tracciato nella tabella `AR_Ticket` (campo Status) e aggiornato ad ogni cambio di fase. Ad esempio, lo stato può essere "open", "in progress", "resolved" e così via, come tipico nei sistemi di supporto.
* **Assegnazione e presa in carico:** i ticket vengono assegnati al tecnico giusto tramite l'interfaccia per i tecnici IT. In base al flusso, quando un operatore prende in carico il ticket, lo stato passa a *In lavorazione* e viene registrato in `AR_Ticket` (campo AssignedTo). Il sistema può supportare l'assegnazione manuale (dal pannello per il reparto it) o automatica (per es. routing per categoria o priorità del problema). È prevista la possibilità di assegnare ticket a gruppi di tecnici e di definire un *Lead Technician* o sostituti in caso di ferie. L'assegnazione segue buone pratiche ITSM di routing intelligente.
* **Storico risoluzione:** ogni risoluzione viene registrata nel database di log `AR_TicketResolution`, con utente, timestamps (inizio e chiusura), tipo di azione e descrizione. La tabella include informazioni complete sulla risoluzione del ticket come stato di risoluzione (risolto/non risolto), tecnico risolutore, descrizione del problema, utente coinvolto, data creazione e risoluzione. Inoltre, vengono tracciati tag utili per la gestione futura di problemi simili, tempi di risoluzione, categoria, priorità del ticket e workcenter coinvolto. Questa tabella puo essere utilizzata per generare report e analisi statistiche ed aiutare le risoluzioni future generate dall'IA.
* **Allegati e commenti:** ad ogni richiesta di ticket si può associare la possibilità di aggiungere immagini (usando la fotocamera del dispositivo) e commenti sia dall'utente. La Foto verrà inviata al reparto it per il problema ma nel database verrà salvato come una frase riassuntiva dell'immagine, creata dall'IA o scritta da chi risolve il problema.
* **Categorie e priorità:** i ticket sono catalogati per categoria impostata dall'utente, gestite in tabella `AR_TicketCategory`. Ogni ticket ha anche un livello di priorità (ad es. bassa, media, alta), memorizzato in `AR_TicketPriority`, cosi da poter gestire richieste di aiuto urgenti con notifiche personalizzate. La gestione della categoria puo essere modificata dal reparto it per gestire meglio le richieste.
* **Filtri e ricerca:** gli amministratori potranno filtrare la lista dei ticket per Workcenter, data (range temporali), stato, priorità, categoria e assegnatario. Ad esempio, nella vista per il reparto it è possibile filtrare per categoria, stato, priorità o ricerca per nome workcenter o utente. 
Gli utenti invece vedranno solo i ticket del proprio workcenter o account.
* **Notifiche:** il sistema invierà notifiche nella webapp (badge, avvisi) per problemi urgenti. Per esempio, invierà una notifica all'utente quando il ticket riceve risposta, e allo staff quando viene assegnato un ticket. Questo assicura che tutti i soggetti interessati siano tempestivamente informati di aggiornamenti rilevanti.
* **Visibilità basata sui ruoli:** l'accesso e la visibilità dei ticket sono controllati dai ruoli utente esistenti (es. tecnico IT, utente, eventualmente altro). Un **tecnico IT** vede e gestisce tutti i ticket e può filtrare per quelli assegnati specificatamente a lui. Gli utenti finali vedono i propri ticket (o quelli del loro Workcenter se applicabile). In questo modo si applica un accesso basato su ruoli esistente.

---

## Struttura Database

* **AR_Ticket:** tabella principale dei ticket. Contiene campi come 
`TicketID` (PK), 
`AccountID` (FK verso utente richiedente), 
`Workcenter` (testo),
`Title` (titolo del ticket), 
`Description` (dettaglio del problema), 
`CategoryID` (FK a `AR_TicketCategory`), 
`PriorityID` (FK a `AR_TicketPriority`), [bassa(non necessaria al momento), media(default), alta(urgente)], si puo anche cambiare con un flag urgente
`StatusID` (FK a `AR_TicketStatus`), 
`AssignedToID` (FK a utente assegnato),
`ResolutionID` (FK a `AR_TicketResolution`),
`IsInternal` (bit per distinguere interno/esterno al workcenter), 
`CreatedAt`, `UpdatedAt`, `ClosedAt`.
* **AR_TicketPriority:** definisce livelli di priorità (`PriorityID`, `Name`, `Description`, `CreatedAt`, `UpdatedAt`, `UseCount`, `IsActive`), es. Bassa, Media, Alta. Ogni ticket ha un campo `PriorityID` per stabilirne l'urgenza. Si puo valutare di usare un solo flag per definire se è urgente o meno.
* **AR_TicketStatus:** definisce i possibili stati (`StatusID`, `Name`, `Description`, `UseCount`, `IsActive`). Esempi: Aperto, In attesa conferma IA, In lavorazione, Risolto, Chiuso. Questi valori sono usati in `AR_Ticket.StatusID`. Lo stato "In attesa conferma IA" viene utilizzato quando il sistema ha generato una risposta automatica tramite l'IA e attende la conferma del Reparto IT prima di procedere con la risoluzione.
* **AR_TicketCategory:** memorizza le categorie di ticket (`CategoryID`, `Name`, `Description`, `UseCount`, `IsActive`). Gli utenti selezionano una categoria all'apertura del ticket, questa puo essere modificata dal reparto it per gestire meglio le richieste.
* **AR_TicketResolution:** memorizza risposte standard o soluzioni (`ResolutionID`, `Name`, `Description`, `CategoryID`, `IsResolved`, `CreatedAt`, `UpdatedAt`, `ResolvedAt`, `UseCount`, `IsActive`). Utile per storicizzare motivazioni di chiusura o soluzioni adottate.
* **AR_TicketAttachment:** gestisce allegati legati a ticket (`AttachmentID`, `TicketID` (FK), `FileName`, `FileURL` o binario, `UploadedBy`, `UploadedAt`). Consente di salvare documenti e immagini relativi a ciascun ticket.
* **AR_TicketChat:** gestisce la conversazione completa del ticket, inclusi messaggi e allegati. Contiene:
`ConversationID` (PK, identifica univocamente la conversazione),
`MessageNumber` (PK, numero progressivo del messaggio nella conversazione, parte da 1),
`TicketID` (FK),
`SenderID` (chi invia il messaggio, può essere utente o tecnico IT),
`SenderType` (Enum: 'User', 'Technician', 'Bot'),
`Message` (testo del messaggio),
`AttachmentID` (FK opzionale a `AR_TicketAttachment`),
`IsResolution` (flag per indicare se il messaggio è una proposta di risoluzione),
`Timestamp`,
`IsActive` (per soft delete/archiviazione).

---

## Workflow dei Ticket

Un flusso operativo tipico dei ticket include i seguenti step:

1. **Creazione:** l'utente apre un ticket nella webapp, inserendo tutti i dettagli richiesti titolo, descrizione, priorità, ed eventuale foto allegata, vengono aggiornati automaticamente i campi workcenter ed utente. Il ticket viene salvato in `AR_Ticket` con stato iniziale "Aperto" e timestamp di creazione.
2. **Classificazione:** il ticket viene classificato in base ai dati inseriti. Questo può avvenire manualmente (l'utente seleziona categoria/priorità) o automaticamente tramite integrazione AI: un chatbot (OpenAI/Claude) analizza la descrizione e le categorie e la priorita inserite nel ticket e suggerisce una risposta automatica (fase intermedia da confermare prima di procedere con la conferma della risposta) o a chi assegnare il ticket nel reparto it, nel caso in cui non sia chiaro a chi assegnare il ticket, viene lasciato vuoto il campo `AssignedToID`.
3. **Assegnazione:** un tecnico IT o il sistema assegna il ticket al tecnico IT più adatto. Si verifica in `AR_Ticket.AssignedToID`. L'assegnazione automatica può seguire regole automatizzate (ad es. skill matching, priorità) o altri processi interni.
Quando un operatore prende in carico il ticket (viene aggiornato lo stato a *In lavorazione*, tramite un pulsante apposito di presa in carico, quindi non solo con la visualizzazione del ticket), si registra l'evento nello stato in `AR_Ticket.StatusID`.
4. **Risoluzione:** Questa fase avviene in più momenti e termina con la chiusura del ticket, la struttura circolare è la seguente:
1) Durante la lavorazione, sia l'utente che il tecnico IT possono scambiare messaggi e allegati attraverso `AR_TicketChat`. Ogni messaggio viene registrato con mittente, timestamp e eventuale allegato (gli utenti non possono vedere i messaggi generati dall'IA - che saranno visibili solo al tecnico IT, che poi procedrà ad accettarli, rifiutarli o modificarli). I messaggi del tecnico possono essere chiarimenti (`IsResolution=false`) o risoluzioni (`IsResolution=true`). Durante questa fase, il tecnico assegnato può cedere la risoluzione del ticket ad un altro tecnico IT in qualsiasi momento, aggiornando il campo `AssignedToID` nella tabella `AR_Ticket`. Questa operazione non modifica lo stato del ticket se è già in lavorazione.
2) Una volta che il tecnico risolve il problema e propone una soluzione inviando un messaggio in `AR_TicketChat` con flag `IsResolution=true`. Lo stato del ticket viene aggiornato a *Risolto*.
I dettagli della risoluzione vengono registrati anche in `AR_TicketResolution` come riferimento permanente. La generazione del messaggio di risoluzione viene fatta in questo modo: dopo aver inviato la risposta viene richiesto al tecnico di specificare la soluzione adottata, viene utilizzato come placeholder il messaggio di soluzione e l'eventuale immagine se presente (`IsResolution=true` e il `MessageNumber` piu alto), salvati nella chat, poi il tecnico può modificarlo a piacimento o generane uno nuovo riassumendo usando l'AI il contenuto dellintera conversazione, o generane uno completamente nuovo tramite un prompt specifico all'AI (ovviamente entrambe le soluzione generate dall'AI potranno essere modificate anche dopo la generazione).
3) Dopo un messaggio di risoluzione, l'utente può:
    a) Confermare la risoluzione: il ticket passa a stato *Chiuso*.
    b) Richiedere chiarimenti/contestare: invia un nuovo messaggio in `AR_TicketChat` e il ticket torna in stato *In lavorazione*.
    - Tutte le risoluzioni precedenti rimangono documentate sia in `AR_TicketChat` che in `AR_TicketResolution`.
6. **Chiusura:** il ticket viene chiuso ed eliminato, con tutte le immagini riferite al ticket, lasciando la documentazione della soluzione in `AR_TicketResolution`.

Questo workflow segue l'approccio standard dei ticket IT: *ricezione, classificazione, assegnazione, risoluzione e chiusura*. L'integrazione con AI può intervenire già nella fase di classificazione e suggerimento di soluzione, velocizzando il processo.
L'utente può chiudere il ticket in qualunque momento con un messaggio di conferma, anche senza una risoluzione (ad esempio se il problema si è risolto spontaneamente o se è stato creato per errore).

Per ottimizzare la gestione dello spazio di archiviazione:
- Quando un'immagine viene allegata a più messaggi, viene riutilizzato lo stesso record in `AR_TicketAttachment`.
- Durante la chiusura del ticket, il sistema valuta gli allegati in `AR_TicketChat` ed elimina quelli non più necessari.

---

## Integrazione Chatbot

Il sistema incorpora un chatbot basato su AI (es. OpenAI GPT o Anthropic Claude) per assistere nella classificazione, risoluzione preliminare e suggerimento di descrizione di soluzioni. Ad esempio, quando l'utente compila il form, il testo, la categoria e priorità vengono inviati all'API del modello NLP che restituisce il tecnico più adatto per il ticket. Inoltre, il chatbot può proporre risposte automatiche o soluzioni comuni: analizzando la descrizione del problema e conoscenza pregressa, il modello può fornire rapidamente una o più soluzione tra quelle proposte in `AR_TicketResolution`, migliorando i tempi di risposta. Tutte le interazioni bot-utente vengono registrate in `AR_TicketChat` e sono visibili solo al tecnico IT e non all'utente.











3. Knowledge Base & FAQ
Articoli self-help

Prima di aprire un ticket, proponi all’utente articoli o soluzioni comuni (collegati a AR_KnowledgeBase).

Collegamento KB ↔ Ticket

Al momento della risoluzione, offri di trasformare la soluzione in un articolo KB e aggiornare la knowledge base.