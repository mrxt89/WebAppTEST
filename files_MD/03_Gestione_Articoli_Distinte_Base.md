# Gestione Articoli e Distinte Base (BOM)

## Panoramica
La sezione **Gestione Articoli e Distinte Base** ti permette di creare, modificare e gestire gli articoli di progetto e le loro distinte base (BOM - Bill of Materials). È essenziale per progetti di produzione, sviluppo prodotto o qualsiasi lavoro che richieda componenti strutturati.

## Accesso alla Sezione
- Dal **menu principale**, clicca su **"Progetti"**
- Seleziona un **progetto** dalla lista
- Vai alla **scheda "Articoli"** nel pannello dettagli progetto
- Oppure direttamente da **"Articoli"** nel menu per accesso globale

## Interfaccia Principale

### Layout a Tre Pannelli
La schermata è divisa in tre aree principali:

**Pannello Sinistro - Lista Articoli**
- **Tabella** con tutti gli articoli del progetto
- **Filtri** per trovare articoli specifici
- **Azioni rapide** per ogni articolo

**Pannello Centrale - BOM Viewer**
- **Vista ad albero** della distinta base
- **Struttura gerarchica** dei componenti
- **Drag & Drop** per modificare la struttura

**Pannello Destro - Dettagli Componente**
- **Informazioni** del componente selezionato
- **Schede** per diversi tipi di dettagli
- **Modifica** parametri e quantità

## Creazione di un Nuovo Articolo

### Passo 1: Aprire il Form
- Clicca il tasto **"Nuovo Articolo"** (icona +) nella lista articoli
- Si apre una **finestra modale** con il form di creazione

### Passo 2: Compilare i Dati Base
**Campi Obbligatori:**
- **Codice Articolo**: Identificativo univoco (es. "ART-001")
- **Descrizione**: Nome descrittivo dell'articolo
- **Tipo**: Prodotto finito, Semilavorato, Componente, Materia prima

**Campi Opzionali:**
- **Unità di Misura**: Pz, Kg, m, etc.
- **Categoria**: Classificazione dell'articolo
- **Note**: Informazioni aggiuntive
- **Codice Fornitore**: Riferimento del fornitore
- **Prezzo Unitario**: Costo per unità

### Passo 3: Salvare
- Clicca **"Salva"** per creare l'articolo
- L'articolo appare nella lista e puoi iniziare a costruire la BOM

## Gestione Distinte Base (BOM)

### Struttura BOM
La **distinta base** è organizzata come un **albero gerarchico**:
- **Livello 0**: Articolo principale (prodotto finito)
- **Livello 1**: Componenti diretti
- **Livello 2+**: Sotto-componenti

### Aggiungere Componenti alla BOM

**Metodo 1: Drag & Drop**
1. **Seleziona** un componente dal pannello di riferimento (destra)
2. **Trascina** nella posizione desiderata dell'albero
3. **Rilascia** per aggiungere il componente

**Metodo 2: Menu Contestuale**
1. **Clicca destro** su un componente nell'albero
2. **Seleziona** "Aggiungi componente"
3. **Scegli** il componente dalla lista

**Metodo 3: Form Diretto**
1. **Clicca** su un componente nell'albero
2. **Scheda "Composizione"** nel pannello dettagli
3. **Tasto "Aggiungi"** e compila i dati

### Configurazione Componenti

**Dati Obbligatori:**
- **Quantità**: Quanto serve per unità di prodotto
- **Unità**: Pz, Kg, m, etc.

**Dati Opzionali:**
- **Scarto**: Percentuale di materiale perso
- **Posizione**: Dove si monta il componente
- **Note**: Istruzioni particolari
- **Costo**: Prezzo del componente

### Modificare la Struttura BOM

**Spostare Componenti:**
- **Trascina** il componente nella nuova posizione
- La **gerarchia** si aggiorna automaticamente

**Eliminare Componenti:**
- **Clicca destro** sul componente
- **Seleziona** "Rimuovi" o "Elimina"
- **Conferma** l'operazione

**Duplicare Componenti:**
- **Clicca destro** sul componente
- **Seleziona** "Duplica"
- Il componente viene copiato nella stessa posizione

## Visualizzazione e Navigazione

### Vista Albero BOM
- **Espandi/Contrai** nodi cliccando le frecce
- **Seleziona** componenti per vedere i dettagli
- **Indicatori visivi** per stati diversi:
  - **Verde**: Componente completo
  - **Giallo**: Componente parzialmente configurato
  - **Rosso**: Componente con errori

### Pannello Dettagli Componente
**Scheda "Riepilogo":**
- Informazioni generali del componente
- Quantità e unità di misura
- Costo totale

**Scheda "Composizione":**
- Lista dei sotto-componenti
- Aggiunta/rimozione componenti
- Modifica quantità

**Scheda "Cicli di Lavorazione":**
- Operazioni necessarie per produrre il componente
- Tempi e costi per operazione
- Sequenza di lavorazione

**Scheda "Parametri di Costificazione":**
- Costi materiali
- Costi lavorazione
- Margini e markup
- Costo totale

**Scheda "Documenti":**
- Allegati e disegni tecnici
- Istruzioni di montaggio
- Certificati e specifiche

## Gestione Versioni BOM

### Creare Nuova Versione
1. **Menu "Versioni"** nella barra superiore
2. **"Nuova Versione"**
3. **Inserisci** numero versione e descrizione
4. **Salva** - la nuova versione diventa attiva

### Cambiare Versione Attiva
1. **Selettore versione** nell'header BOM
2. **Scegli** la versione desiderata
3. La **struttura** si aggiorna automaticamente

### Confrontare Versioni
1. **Menu "Versioni"** → **"Confronta"**
2. **Seleziona** due versioni da confrontare
3. **Visualizza** le differenze evidenziate

## Costificazione e Calcoli

### Calcolo Costi Automatico
Il sistema calcola automaticamente:
- **Costo materiali**: Somma dei componenti
- **Costo lavorazione**: Tempi × tariffe
- **Costo totale**: Materiali + Lavorazione + Margini

### Parametri di Costificazione
**Per ogni componente:**
- **Costo unitario**: Prezzo del componente
- **Scarto**: Percentuale di materiale perso
- **Margine**: Percentuale di profitto
- **Tariffa oraria**: Costo per ora di lavorazione

### Aggiornamento Costi
- **Automatico**: Quando modifichi la BOM
- **Manuale**: Tasto "Ricalcola costi"
- **Batch**: Per tutti gli articoli del progetto

## Esempi Pratici

### Esempio 1: Creare Articolo "Motore Elettrico"
1. **"Nuovo Articolo"**
2. **Codice**: "MOT-EL-001"
3. **Descrizione**: "Motore elettrico 1kW"
4. **Tipo**: "Prodotto finito"
5. **Unità**: "Pz"
6. **Salva**

### Esempio 2: Costruire BOM per Motore
1. **Seleziona** "Motore Elettrico" nella lista
2. **Aggiungi componenti**:
   - "Stator" (1 Pz)
   - "Rotor" (1 Pz)
   - "Cuscinetti" (2 Pz)
   - "Cavi" (3 m)
3. **Configura** ogni componente con quantità e costi

### Esempio 3: Gestire Sotto-Assiemi
1. **Aggiungi** "Stator" come componente
2. **Espandi** "Stator" nell'albero
3. **Aggiungi** sotto-componenti:
   - "Laminazioni" (50 Pz)
   - "Avvolgimenti" (3 Pz)
   - "Isolante" (0.5 m²)

### Esempio 4: Calcolare Costi
1. **Imposta** costi unitari per ogni componente
2. **Configura** tariffe di lavorazione
3. **Clicca** "Ricalcola costi"
4. **Visualizza** il costo totale del motore

## Import/Export BOM

### Importare BOM da Excel
1. **Menu "Importa"** → **"Da Excel"**
2. **Seleziona** il file Excel
3. **Mappa** le colonne con i campi BOM
4. **Conferma** l'importazione

### Esportare BOM
1. **Menu "Esporta"** → **"Excel"** o **"PDF"**
2. **Scegli** formato e livello di dettaglio
3. **Scarica** il file generato

### Template BOM
- **Salva** strutture BOM come template
- **Riutilizza** per articoli simili
- **Modifica** template per nuovi prodotti

## Regole e Limitazioni

### Permessi Utente
- **Utente Standard**: Può visualizzare e modificare solo i propri articoli
- **Responsabile Progetto**: Può gestire tutti gli articoli del progetto
- **Amministratore**: Accesso completo a tutti gli articoli

### Limitazioni Tecniche
- **Massimo 10 livelli** di profondità BOM
- **Massimo 1000 componenti** per articolo
- **Codice articolo**: Minimo 3 caratteri, massimo 50
- **Descrizione**: Massimo 200 caratteri

### Regole Business
- **Non puoi eliminare** articoli con BOM configurate
- **Componenti obbligatori** non possono essere rimossi
- **Quantità** devono essere positive
- **Cicli di lavorazione** richiedono tempi validi

### Limitazioni Strutturali
- **Loop infiniti**: Il sistema previene riferimenti circolari
- **Componenti orfani**: Non puoi avere componenti senza padre
- **Versioni**: Solo una versione attiva per articolo

## Risoluzione Problemi Comuni

### Problema: "Non vedo il tasto Nuovo Articolo"
**Soluzione**: Verifica di essere assegnato al progetto o di avere permessi amministratore.

### Problema: "Non riesco a trascinare componenti"
**Soluzione**: Assicurati che il componente di destinazione sia espanso e visibile.

### Problema: "I costi non si aggiornano"
**Soluzione**: Clicca "Ricalcola costi" manualmente o verifica che i costi unitari siano impostati.

### Problema: "BOM non si salva"
**Soluzione**: Controlla che tutti i componenti abbiano quantità valide e che non ci siano loop.

### Problema: "Import Excel fallisce"
**Soluzione**: Verifica il formato del file e che le colonne siano mappate correttamente.

## Suggerimenti per l'Uso Efficace

1. **Usa codici articolo** consistenti e significativi
2. **Organizza** la BOM per livelli logici
3. **Imposta sempre** i costi unitari
4. **Usa le versioni** per tracciare le modifiche
5. **Documenta** con note e allegati
6. **Testa** la BOM prima di metterla in produzione
7. **Mantieni** la struttura semplice e chiara
8. **Aggiorna** regolarmente i costi
9. **Usa i template** per articoli simili
10. **Esporta** BOM per backup e condivisione
