# Gestione Clienti e Categorie

## Panoramica
La sezione **Gestione Clienti e Categorie** ti permette di gestire l'anagrafica clienti per i progetti e organizzare i progetti in categorie e sottocategorie. È essenziale per mantenere un database clienti aggiornato e classificare i progetti per tipo e settore.

## Accesso alle Sezioni

### Gestione Clienti
- Dal **menu principale**, clicca su **"Progetti"**
- Vai alla **scheda "Clienti"** nel pannello dettagli progetto
- Oppure direttamente da **"Clienti"** nel menu per accesso globale

### Gestione Categorie
- Dal **menu principale**, clicca su **"Progetti"**
- Vai alla **scheda "Categorie"** nel pannello dettagli progetto
- Oppure direttamente da **"Categorie"** nel menu per accesso globale

## Gestione Clienti

### Interfaccia Principale
La schermata clienti è organizzata in:

**Barra Superiore**
- **Tasto "Importa da Gestionale"**: Importa clienti dal sistema ERP
- **Tasto "Nuovo Cliente"**: Aggiunge un nuovo cliente prospect
- **Tasto "Esporta Excel"**: Esporta la lista clienti
- **Tasto "Importa CSV"**: Importa clienti da file CSV

**Tabella Clienti**
- **Lista completa** di tutti i clienti
- **Filtri** per ricerca rapida
- **Azioni** per ogni cliente

### Creazione Nuovo Cliente Prospect

#### Passo 1: Aprire il Form
- Clicca il tasto **"Nuovo Cliente"** nella barra superiore
- Si apre una **finestra modale** con il form di creazione

#### Passo 2: Compilare i Dati
**Campi Obbligatori:**
- **Nome Azienda**: Nome completo dell'azienda cliente

**Campi Opzionali:**
- **Codice Cliente**: Identificativo interno
- **Codice FS**: Codice del sistema esterno
- **Partita IVA**: Codice fiscale dell'azienda
- **Indirizzo**: Indirizzo completo
- **CAP**: Codice postale
- **Città**: Città di residenza
- **Nazione**: Dropdown con tutte le nazioni
- **Regione**: Dropdown popolato in base alla nazione
- **Provincia**: Dropdown popolato in base alla regione

#### Passo 3: Salvare
- Clicca **"Conferma"** per creare il cliente
- Il cliente appare immediatamente nella tabella

### Importazione da Sistema ERP

#### Metodo 1: Ricerca e Importazione Singola
1. **Clicca** "Importa da Gestionale"
2. **Inserisci** nome o codice cliente da cercare
3. **Seleziona** il cliente dalla lista risultati
4. **Conferma** l'importazione

#### Metodo 2: Collegamento a Cliente Esistente
1. **Seleziona** un cliente prospect nella tabella
2. **Clicca** "Collega a ERP" nelle azioni
3. **Cerca** il cliente nel sistema ERP
4. **Seleziona** e conferma il collegamento

### Importazione da File CSV

#### Preparazione File CSV
Il file deve contenere le seguenti colonne:
- **Id**: ID cliente (opzionale)
- **CustomerCode**: Codice cliente
- **CompanyName**: Nome azienda (obbligatorio)
- **TaxIdNumber**: Partita IVA
- **Address**: Indirizzo
- **City**: Città
- **County**: Provincia
- **Country**: Nazione
- **ZIPCode**: CAP
- **ERPCustSupp**: Codice cliente ERP
- **ERPCustSuppType**: Tipo cliente
- **Disabled**: Disabilitato (0/1)
- **fscodice**: Codice FS

#### Processo Importazione
1. **Clicca** "Importa CSV"
2. **Seleziona** il file CSV
3. **Verifica** i dati mostrati
4. **Conferma** l'importazione
5. **Ricevi** conferma del numero di record importati

### Esportazione Excel
- **Clicca** "Esporta Excel"
- **File** viene scaricato automaticamente
- **Contiene** tutti i dati della tabella clienti
- **Formattato** con larghezze colonne ottimizzate

## Gestione Categorie

### Interfaccia Principale
La schermata categorie è organizzata in:

**Barra Superiore**
- **Tasto "Nuova Categoria"**: Crea una nuova categoria
- **Tabella categorie** con dettagli e azioni

**Struttura Categorie**
- **Categoria principale**: Nome e colore identificativo
- **Sottocategorie**: Elementi specifici della categoria
- **Stato**: Attiva o disabilitata

### Creazione Nuova Categoria

#### Passo 1: Aprire il Form
- Clicca il tasto **"Nuova Categoria"** nella barra superiore
- Si apre una **finestra modale** con il form

#### Passo 2: Compilare i Dati
**Campi Obbligatori:**
- **Nome Categoria**: Nome descrittivo della categoria

**Campi Opzionali:**
- **Colore**: Selettore colore per identificazione visiva

#### Passo 3: Salvare
- Clicca **"Salva"** per creare la categoria
- La categoria appare nella tabella

### Gestione Sottocategorie

#### Aggiungere Sottocategoria
1. **Clicca** il tasto **"+"** nella colonna sottocategorie
2. **Inserisci** il nome della sottocategoria
3. **Salva** per aggiungere

#### Modificare Sottocategoria
1. **Clicca** l'**icona matita** sulla sottocategoria
2. **Modifica** il nome
3. **Salva** le modifiche

#### Disabilitare/Abilitare Sottocategoria
- **Clicca** l'**icona occhio** sulla sottocategoria
- **Toggle** tra attiva e disabilitata
- **Badge colorato** indica lo stato

### Gestione Stato Categorie

#### Disabilitare Categoria
- **Clicca** l'**icona occhio** nella colonna azioni
- **Categoria** diventa disabilitata
- **Badge** cambia colore (rosso = disabilitata)

#### Riabilitare Categoria
- **Clicca** nuovamente l'**icona occhio**
- **Categoria** torna attiva
- **Badge** diventa verde

## Visualizzazione e Navigazione

### Tabella Clienti
**Colonne visualizzate:**
- **ID**: Identificativo univoco
- **Codice Cliente**: Codice interno
- **Nome Azienda**: Nome completo
- **Partita IVA**: Codice fiscale
- **Indirizzo**: Indirizzo completo
- **Città**: Città di residenza
- **Provincia**: Provincia
- **Nazione**: Paese
- **CAP**: Codice postale
- **Cliente ERP**: Codice nel sistema ERP
- **Tipo**: Tipo cliente
- **Stato**: Attivo/Disabilitato
- **Codice FS**: Codice sistema esterno

### Tabella Categorie
**Colonne visualizzate:**
- **Categoria**: Nome della categoria
- **Colore**: Indicatore visivo colorato
- **Sottocategorie**: Lista delle sottocategorie con badge
- **Stato**: Badge attiva/disabilitata
- **Azioni**: Modifica e toggle stato

## Filtri e Ricerca

### Filtri Clienti
- **Ricerca testuale**: Per nome azienda o codice
- **Filtro per nazione**: Dropdown con tutte le nazioni
- **Filtro per stato**: Attivi/Disabilitati
- **Filtro per tipo**: Cliente/Prospect

### Filtri Categorie
- **Ricerca testuale**: Per nome categoria
- **Filtro per stato**: Attive/Disabilitate
- **Filtro per sottocategorie**: Con/senza sottocategorie

## Esempi Pratici

### Esempio 1: Creare Cliente Prospect
1. **"Nuovo Cliente"**
2. **Nome Azienda**: "ABC S.r.l."
3. **Codice Cliente**: "CLI-001"
4. **Partita IVA**: "12345678901"
5. **Indirizzo**: "Via Roma 123"
6. **Città**: "Milano"
7. **Nazione**: "Italia"
8. **Regione**: "Lombardia"
9. **Provincia**: "Milano"
10. **CAP**: "20100"
11. **Conferma**

### Esempio 2: Importare da ERP
1. **"Importa da Gestionale"**
2. **Ricerca**: "ABC"
3. **Seleziona**: "ABC001 - ABC S.r.l."
4. **Importa**
5. **Cliente** aggiunto alla tabella

### Esempio 3: Creare Categoria Progetti
1. **"Nuova Categoria"**
2. **Nome**: "Sviluppo Software"
3. **Colore**: Blu (#0066CC)
4. **Salva**
5. **Aggiungi sottocategorie**:
   - "Web Application"
   - "Mobile App"
   - "Desktop Software"

### Esempio 4: Organizzare Categorie
1. **Crea categorie principali**:
   - "Sviluppo Software" (Blu)
   - "Consulenza" (Verde)
   - "Formazione" (Arancione)
2. **Aggiungi sottocategorie** per ogni categoria
3. **Usa colori** per identificazione rapida

## Regole e Limitazioni

### Permessi Utente
- **Utente Standard**: Può visualizzare clienti e categorie
- **Responsabile Progetto**: Può gestire clienti e categorie
- **Amministratore**: Accesso completo a tutte le funzioni

### Limitazioni Tecniche
- **Codice cliente**: Massimo 50 caratteri
- **Nome azienda**: Massimo 128 caratteri
- **Partita IVA**: Massimo 20 caratteri
- **Indirizzo**: Massimo 128 caratteri

### Regole Business
- **Nome azienda**: Obbligatorio per nuovi clienti
- **Codici univoci**: Non possono essere duplicati
- **Collegamento ERP**: Un cliente può essere collegato a un solo ERP
- **Categorie**: Non possono essere eliminate se utilizzate

### Limitazioni Importazione
- **File CSV**: Massimo 1000 record per importazione
- **Formato date**: DD/MM/YYYY
- **Encoding**: UTF-8
- **Separatore**: Virgola

## Risoluzione Problemi Comuni

### Problema: "Nome azienda obbligatorio"
**Soluzione**: Inserisci sempre il nome dell'azienda nel campo obbligatorio.

### Problema: "Cliente già esistente"
**Soluzione**: Verifica che il codice cliente non sia già presente nel sistema.

### Problema: "Importazione CSV fallisce"
**Soluzione**: Controlla il formato del file e che le colonne siano corrette.

### Problema: "Non posso disabilitare categoria"
**Soluzione**: Verifica che la categoria non sia utilizzata in progetti attivi.

### Problema: "Collegamento ERP non funziona"
**Soluzione**: Verifica che il cliente esista nel sistema ERP e che sia accessibile.

## Suggerimenti per l'Uso Efficace

1. **Mantieni aggiornata** l'anagrafica clienti
2. **Usa codici consistenti** per i clienti
3. **Organizza le categorie** per tipo di progetto
4. **Usa colori distintivi** per le categorie
5. **Importa regolarmente** da ERP per sincronizzazione
6. **Esporta backup** della lista clienti
7. **Documenta** le sottocategorie specifiche
8. **Mantieni pulita** la struttura categorie
9. **Verifica** i dati prima dell'importazione
10. **Usa i filtri** per trovare rapidamente i clienti
