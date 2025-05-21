- [] Problema sulla modifica di un messaggio, ripropone sulla NotificationSideBar la notifica più volte

- [] Problema sulla topbar di una chat, tasto "Info", scheda "Aggiungi" --> Non va il campo di ricerca testuale

- [] Quando tolgo un partecipante di una chat poi non posso più reinserirlo

- [x] Da verificare se template attività vengono caricati in base alla categoria inserita [si -> guarda ProjectEditModalWithTemplate riga 392 -> filteredTemplates(riga 203) ]

- re-render di TaskDetailsDialog

--- 
# Chat collegate al progetto e all'attività
- Nuova chat collegata al progetto e all'attività
- mysql -> aggiungere flag per dire se la chat è collegata al progetto (fk) o all'attività (fk)
- backend -> inviare al frontend nelle notifiche anche i campi per la chat collegata al progetto e all'attività
- backend -> durante la creazione / modifica / eliminazione di un progetto / attività, controllare se c'è una chat collegata e modificare il titolo o creare/eliminare la chat
- frontend -> aggiungere sezione filtri anche nella sidebar con le notifiche per visualizzare solo o non visualizzare nessuna chat con il flag progetto, quando seleziono la vista delle chat di progetto mi escono le chat collegate alle attività del progetto
---

- fare una cosa simile alle chat per progetti e attività per i ticket

---