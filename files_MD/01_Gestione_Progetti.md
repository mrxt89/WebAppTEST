# Gestione Progetti

## Panoramica
La sezione **Gestione Progetti** è il cuore della webapp per la gestione di progetti aziendali. Ti permette di creare, modificare, visualizzare e organizzare tutti i tuoi progetti in modo efficiente.

## Accesso alla Sezione
- Dal **menu principale**, clicca su **"Progetti"**
- Verrai portato alla **Dashboard Progetti** con vista a due pannelli

## Interfaccia Principale

### Layout a Due Pannelli
La schermata è divisa in due aree:

**Pannello Sinistro (Lista Progetti)**
- Mostra tutti i progetti in una **tabella/griglia**
- Puoi **ridimensionare** il pannello trascinando il bordo
- **Collassa/espandi** con l'icona freccia in alto
- **Filtri** nella parte superiore per trovare progetti specifici

**Pannello Destro (Dettagli Progetto)**
- Mostra i dettagli del progetto selezionato
- Se nessun progetto è selezionato, vedi un messaggio di avviso

## Creazione di un Nuovo Progetto

### Passo 1: Aprire il Form
- Nel **pannello sinistro**, clicca sul tasto **"Nuovo Progetto"** (icona +)
- Si apre una **finestra modale** con il form di creazione

### Passo 2: Compilare i Dati
**Campi Obbligatori:**
- **Nome Progetto**: Titolo descrittivo del progetto
- **Cliente**: Seleziona dalla lista clienti esistenti
- **Categoria**: Scegli la categoria appropriata

**Campi Opzionali:**
- **Descrizione**: Dettagli aggiuntivi sul progetto
- **Data Inizio**: Quando inizia il progetto
- **Data Fine**: Scadenza prevista
- **Responsabile**: Assegna un responsabile del progetto
- **Priorità**: Bassa, Media, Alta, Critica
- **Budget**: Importo previsto

### Passo 3: Salvare
- Clicca **"Salva"** per creare il progetto
- Il progetto appare immediatamente nella lista

## Visualizzazione e Navigazione

### Vista Lista (Tabella)
La **griglia** mostra le seguenti colonne:
- **Nome Progetto**
- **Cliente**
- **Categoria**
- **Stato** (con colori: Verde=Attivo, Rosso=In Ritardo, Grigio=Completato)
- **Progresso** (barra di avanzamento)
- **Responsabile**
- **Data Scadenza**

### Azioni Rapide
Per ogni progetto nella lista:
- **Icona occhio**: Visualizza dettagli
- **Icona matita**: Modifica progetto
- **Icona spilla**: Fissa/rimuovi dai preferiti
- **Icona cestino**: Elimina (solo se hai i permessi)

## Filtri e Ricerca

### Filtri Disponibili
Nel **pannello superiore** della lista progetti:

**Filtro per Stato:**
- Tutti
- Attivi
- In Ritardo
- Completati
- Sospesi

**Filtro per Categoria:**
- Dropdown con tutte le categorie disponibili

**Filtro per Cliente:**
- Dropdown con tutti i clienti

**Filtro per Responsabile:**
- Dropdown con tutti gli utenti

**Ricerca Testuale:**
- Campo di ricerca per nome progetto o descrizione

### Combinazione Filtri
- Puoi **combinare più filtri** contemporaneamente
- I filtri si applicano in tempo reale
- **Pulisci filtri** con il tasto "Reset"

## Gestione Progetti Preferiti

### Fissare Progetti
- Clicca l'**icona spilla** accanto al progetto
- I progetti fissati appaiono **in cima alla lista**
- Utile per progetti che segui frequentemente

### Rimuovere dai Preferiti
- Clicca nuovamente l'icona spilla per rimuovere

## Modifica di un Progetto Esistente

### Apertura Modifica
1. **Doppio clic** sul progetto nella lista, oppure
2. Clicca l'**icona matita** nelle azioni

### Modifica Dati
- Si apre la stessa **finestra modale** della creazione
- Modifica i campi necessari
- Clicca **"Salva"** per confermare

### Limitazioni Modifica
- **Non puoi modificare** progetti completati
- **Solo il responsabile** può modificare alcuni campi critici
- **L'amministratore** può modificare tutto

## Visualizzazione Dettagli Progetto

### Selezione Progetto
- **Clicca una volta** su un progetto nella lista
- I dettagli appaiono nel **pannello destro**

### Informazioni Mostrate
- **Scheda Informazioni**: Dati generali del progetto
- **Scheda Attività**: Lista delle task del progetto
- **Scheda Team**: Membri del team assegnati
- **Scheda Allegati**: Documenti e file collegati
- **Scheda Tempi**: Ore registrate sul progetto
- **Scheda Articoli**: Articoli e distinte base

## Esempi Pratici

### Esempio 1: Creare un Progetto Sviluppo Software
1. **Nuovo Progetto** → Nome: "Sistema CRM"
2. **Cliente**: "Azienda ABC S.r.l."
3. **Categoria**: "Sviluppo Software"
4. **Data Inizio**: Oggi
5. **Data Fine**: Tra 3 mesi
6. **Responsabile**: Seleziona te stesso
7. **Priorità**: Alta
8. **Budget**: 50000€
9. **Salva**

### Esempio 2: Filtrare Progetti in Ritardo
1. Nel **filtro Stato**, seleziona "In Ritardo"
2. La lista mostra solo progetti con scadenza superata
3. Puoi aggiungere **filtro Cliente** per vedere ritardi di un cliente specifico

### Esempio 3: Organizzare Progetti Frequenti
1. **Fissa** i 3-4 progetti più importanti (icona spilla)
2. Appariranno **sempre in cima** alla lista
3. Accesso rapido senza dover cercare

## Regole e Limitazioni

### Permessi Utente
- **Utente Standard**: Può creare/modificare solo i propri progetti
- **Responsabile**: Può modificare progetti assegnati
- **Amministratore**: Accesso completo a tutti i progetti

### Limitazioni Tecniche
- **Massimo 100 progetti** visualizzati per pagina
- **Nomi progetto**: Minimo 3 caratteri, massimo 100
- **Date**: La data fine deve essere successiva alla data inizio
- **Budget**: Solo numeri positivi

### Regole Business
- **Non puoi eliminare** progetti con attività in corso
- **Progetti completati** non possono essere modificati
- **Cambio responsabile** richiede conferma del nuovo responsabile

## Risoluzione Problemi Comuni

### Problema: "Non vedo il tasto Nuovo Progetto"
**Soluzione**: Verifica i tuoi permessi utente. Solo utenti autorizzati possono creare progetti.

### Problema: "Il progetto non si salva"
**Soluzione**: Controlla che tutti i campi obbligatori siano compilati (Nome, Cliente, Categoria).

### Problema: "Non riesco a modificare un progetto"
**Soluzione**: Verifica di essere il responsabile del progetto o di avere permessi amministratore.

### Problema: "I filtri non funzionano"
**Soluzione**: Prova a pulire i filtri con "Reset" e riapplicarli uno alla volta.

## Suggerimenti per l'Uso Efficace

1. **Usa nomi descrittivi** per i progetti
2. **Assegna sempre un responsabile** chiaro
3. **Imposta date realistiche** per scadenze
4. **Fissa i progetti attivi** per accesso rapido
5. **Usa le categorie** per organizzare meglio
6. **Compila sempre la descrizione** per contesto futuro
