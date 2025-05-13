- [x] Problema zindex sul menu layout chat quando ho almeno una modale della chat aperta
![alt text](image.png)

- [x] Se apro una chat e scrollo in alto (messaggi più vecchi), l'icona per tornare all'ultima notifica si colora di rosso, come se avessi ricevuto altre notifiche nel frattempo
![alt text](image-1.png)

- [x] Sistemare scroll quando arriva un messaggio

OLD BUT NEW

- Notifica push

- Errore get

- Problema zindex sul menu layout chat quando ho almeno una modale della chat aperta

- Conteggio notifiche

- 




- All'apertura di una chat non viene passata la lista degli utenti disponibili alla topbar (per aggiungere destinatari) e alla bottombar (per menzionare persone con la @). Sulla creazione di un nuovo messaggio (NewMessageModal.jsx) invece funziona.

- Sondaggi: Se clicco il "Mostra sondaggi" quando non ce ne sono: chunk-WRD5HZVH.js?v=eb3a2bdf:19413 Uncaught TypeError: polls.filter is not a function at PollsList (PollsList.jsx:41:31)

- Quando modifico il titolo di una chat dovrebbe aggiornarsi in tempo reale sia la modale che la notificationsidebar

- Quando si aggiorna la notificationsidebar, per una frazione di secondo mostra tutte le notifiche, anche quelle archiviate.

- Quando apro una chat e poi apro il WindowManagerMenu e clicco su "min/max" mi aspetto che la chat ( o le chat) si riducano a icona, invece scompaiono.

- (Da vedere assieme) Non va la gestione allegati