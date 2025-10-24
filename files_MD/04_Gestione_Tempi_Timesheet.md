# Gestione Tempi e Timesheet

## Panoramica
La sezione **Gestione Tempi e Timesheet** ti permette di registrare, monitorare e gestire le ore lavorate sui progetti e attività. È essenziale per il controllo dei tempi, la fatturazione e l'analisi della produttività.

## Accesso alla Sezione
- Dal **menu principale**, clicca su **"Attività"**
- Vai al **tab "Settimana"** (Timesheet)
- Oppure dalla **Dashboard Progetti**, seleziona un progetto e vai alla **scheda "Tempi"**

## Interfaccia Principale

### Layout Timesheet
La schermata è organizzata in **due tab principali**:

**Tab "Quadratura" (Timesheet)**
- Vista settimanale delle ore registrate
- Registrazione ore per attività
- Monitoraggio produttività

**Tab "Report"**
- Reportistica dettagliata
- Analisi tempi per progetto/utente
- Esportazione dati

## Vista Settimanale (Quadratura)

### Struttura della Tabella
La **tabella settimanale** mostra:
- **Colonna sinistra**: Lista attività con dettagli
- **Colonne centrali**: Giorni della settimana (Lun-Dom)
- **Colonna destra**: Totale ore settimanali per attività
- **Riga inferiore**: Totali giornalieri

### Navigazione Settimanale
**Controlli di navigazione:**
- **Freccia sinistra**: Settimana precedente
- **Freccia destra**: Settimana successiva (solo fino a oggi)
- **Data visualizzata**: Range della settimana corrente

### Selezione Utente (Solo Admin)
Se sei **amministratore**, puoi:
- **Selezionare utente**: Dropdown con tutti gli utenti
- **Vista per gruppi**: Organizza utenti per gruppi di lavoro
- **Ricerca utenti**: Campo di ricerca per trovare rapidamente

## Registrazione Ore

### Aggiungere Nuove Ore
**Metodo 1: Clic su Cella Vuota**
1. **Clicca** su una cella vuota nella tabella
2. Si apre il **dialog di registrazione**
3. **Seleziona** l'attività dal dropdown
4. **Inserisci** le ore lavorate
5. **Aggiungi** note descrittive
6. **Salva** la registrazione

**Metodo 2: Tasto "+" su Attività Esistente**
1. **Clicca** il tasto **"+"** accanto a un'attività
2. **Seleziona** il giorno specifico
3. **Compila** i dati come sopra

**Metodo 3: Riga Totali Giornalieri**
1. **Clicca** "Aggiungi" nella riga totali
2. **Scegli** l'attività e le ore
3. **Registra** per il giorno selezionato

### Tipi di Lavoro
**Categorie disponibili:**
- **Sviluppo**: Lavoro di programmazione
- **Analisi**: Studio e progettazione
- **Test**: Verifica e collaudo
- **Documentazione**: Scrittura documenti
- **Riunioni**: Meeting e coordinamento
- **Formazione**: Apprendimento e aggiornamento
- **Supporto**: Assistenza e manutenzione

### Note e Descrizioni
- **Note obbligatorie**: Descrivi sempre cosa hai fatto
- **Dettagli specifici**: Includi informazioni utili per il cliente
- **Riferimenti**: Link a documenti o issue specifici

## Modifica e Gestione Registrazioni

### Modificare Ore Esistenti
1. **Clicca** l'**icona matita** accanto alle ore registrate
2. **Modifica** ore, note o tipo di lavoro
3. **Salva** le modifiche

### Eliminare Registrazioni
1. **Clicca** l'**icona cestino** accanto alle ore
2. **Conferma** l'eliminazione
3. Le ore vengono rimosse dalla tabella

### Visualizzazione Ore
**Indicatori visivi:**
- **Badge verde**: Ore registrate per il giorno
- **Numero ore**: Mostrato nel badge
- **Icone azioni**: Modifica ed elimina

## Gestione Stati Attività

### Cambio Stato Rapido
**Nella colonna attività:**
- **Dropdown stato**: Cambia lo stato dell'attività
- **Stati disponibili**: Da fare, In esecuzione, Bloccata, Sospesa, Completata
- **Icone colorate**: Indicatori visivi per ogni stato

### Filtro Attività Completate
- **Checkbox "Nascondi completate"**: Nasconde attività completate
- **Indicatore**: Mostra quante attività sono nascoste
- **Utile per**: Focus su attività attive

## Monitoraggio Produttività

### Indicatori Colore
**Per ogni giorno:**
- **Rosso**: 0 ore registrate
- **Giallo**: Meno di 8 ore
- **Verde**: Esattamente 8 ore
- **Blu**: Più di 8 ore

### Totali e Riepiloghi
**Riga totali giornalieri:**
- **Ore totali**: Somma di tutte le attività
- **Ore mancanti**: Calcolo automatico (8 - ore registrate)
- **Tasto "Aggiungi"**: Per completare le ore mancanti

**Colonna totali settimanali:**
- **Ore per attività**: Somma settimanale per ogni attività
- **Badge blu**: Indica attività con ore registrate

## Esempi Pratici

### Esempio 1: Registrare Giornata Completa
1. **Lunedì**: Clicca su cella vuota
2. **Attività**: "Sviluppo login utenti"
3. **Ore**: 6
4. **Tipo**: "Sviluppo"
5. **Note**: "Implementato form login con validazione"
6. **Salva**

7. **Stesso giorno**: Clicca "+" sulla stessa attività
8. **Ore**: 2
9. **Tipo**: "Test"
10. **Note**: "Test funzionalità login"
11. **Salva**

### Esempio 2: Gestire Attività Multipla
1. **Martedì**: Registra 4 ore su "Sviluppo API"
2. **Stesso giorno**: Aggiungi 2 ore su "Documentazione"
3. **Stesso giorno**: Aggiungi 2 ore su "Riunione cliente"
4. **Totale**: 8 ore complete per il giorno

### Esempio 3: Modificare Registrazione Errata
1. **Clicca** icona matita su ore registrate
2. **Cambia** da 6 a 4 ore
3. **Aggiorna** note: "Correzione: 4 ore effettive"
4. **Salva** - le ore si aggiornano automaticamente

### Esempio 4: Completare Attività
1. **Registra** le ultime ore sull'attività
2. **Cambia stato** da "In esecuzione" a "Completata"
3. **L'attività** si sposta in fondo alla lista (se nascoste le completate)

## Reportistica (Tab Report)

### Tipi di Report Disponibili
**Report per Utente:**
- Ore totali per periodo
- Distribuzione per progetto
- Attività più frequenti

**Report per Progetto:**
- Ore totali del team
- Contributo per utente
- Trend temporali

**Report per Attività:**
- Tempo medio di completamento
- Ore effettive vs stimate
- Analisi produttività

### Filtri Report
- **Periodo**: Seleziona range di date
- **Utente**: Filtra per utente specifico
- **Progetto**: Filtra per progetto
- **Tipo lavoro**: Filtra per categoria

### Esportazione
- **Excel**: Dati dettagliati per analisi
- **PDF**: Report formattati per presentazioni
- **CSV**: Dati per import in altri sistemi

## Regole e Limitazioni

### Permessi Utente
- **Utente Standard**: Può registrare solo le proprie ore
- **Responsabile Progetto**: Può vedere ore del team del progetto
- **Amministratore**: Accesso completo a tutti i dati

### Limitazioni Tecniche
- **Ore massime**: 24 ore per giorno
- **Ore decimali**: Supportate (es. 1.5 ore)
- **Date future**: Non puoi registrare ore per date future
- **Modifica passato**: Solo per le ultime 2 settimane

### Regole Business
- **Ore obbligatorie**: Minimo 1 ora per registrazione
- **Note obbligatorie**: Sempre descrivere il lavoro svolto
- **Attività valide**: Solo attività assegnate all'utente
- **Stati bloccati**: Non puoi modificare ore di attività completate

### Limitazioni Temporali
- **Registrazione ritardata**: Massimo 7 giorni di ritardo
- **Modifica ore**: Solo entro 48 ore dalla registrazione
- **Eliminazione**: Solo per registrazioni dello stesso giorno

## Risoluzione Problemi Comuni

### Problema: "Non vedo le mie attività"
**Soluzione**: Verifica di essere assegnato alle attività e che abbiano date valide.

### Problema: "Non posso registrare ore"
**Soluzione**: Controlla che la data non sia futura e che l'attività sia attiva.

### Problema: "Le ore non si salvano"
**Soluzione**: Verifica che le ore siano positive e che le note siano compilate.

### Problema: "Non vedo il dropdown utenti"
**Soluzione**: Solo gli amministratori possono vedere altri utenti. Verifica i tuoi permessi.

### Problema: "Non posso modificare ore vecchie"
**Soluzione**: Puoi modificare solo le registrazioni delle ultime 48 ore.

## Suggerimenti per l'Uso Efficace

1. **Registra le ore quotidianamente** per evitare dimenticanze
2. **Usa note dettagliate** per tracciare il lavoro svolto
3. **Scegli il tipo di lavoro corretto** per analisi accurate
4. **Monitora i totali giornalieri** per mantenere 8 ore
5. **Aggiorna lo stato delle attività** quando completi il lavoro
6. **Usa i filtri** per concentrarti su attività specifiche
7. **Esporta i report** per analisi e presentazioni
8. **Verifica i permessi** prima di registrare ore per altri
9. **Mantieni la coerenza** nei nomi e descrizioni
10. **Controlla regolarmente** i totali settimanali
