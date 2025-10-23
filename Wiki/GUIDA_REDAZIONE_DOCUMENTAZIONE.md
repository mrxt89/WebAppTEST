# 📝 Guida per Scrivere la Documentazione WebApp

**Destinatari:** Redattori documentazione
**Livello:** Base - Nessuna competenza tecnica richiesta
**Tempo lettura:** 10 minuti

---

## 🎯 Il Compito

Documentare ogni funzionalità della WebApp in modo **chiaro**, **completo** e **facile da capire** per gli utenti finali.

**Obiettivo:** Ogni utente deve poter leggere la documentazione e capire:
- ✅ A cosa serve la funzionalità
- ✅ Come si usa
- ✅ Cosa può fare e cosa no

---

## 📋 PRIMA DI INIZIARE

### Cosa Ti Serve

1. **Accesso al Wiki**
   - URL: http://192.168.42.122:3002 
   - Credenziali amministratore

2. **Questa Guida**
   - Tienila sempre aperta mentre scrivi

---

## 🚀 COME ACCEDERE AL WIKI

### Step 1: Login

1. Apri browser (Chrome, Edge, Firefox)
2. Vai all'URL del wiki
3. **Login:**
   - Email: `michele.parise@ricos.org`
   - Password
4. Clicca "LOGIN"

### Step 2: Trova la Pagina da Documentare

**Metodo A: Da Browser**

Nel browser del wiki, tutte le pagine sono già create (skeleton) con questa struttura:

```
📁 home
  📄 dashboard              ← Documenta questa
    📄 permessi             ← Documenta questa
  📄 progetti               ← Documenta questa
    📄 categorie-progetti   ← Documenta questa
    📄 clienti-progetti     ← Documenta questa
    📄 costificazione-distinte
    📄 dashboard-progetti
    📄 intercompany
    📄 lista-attivita
```

1. Nel wiki, clicca su "Pages" (sidebar sinistra)
2. Cerca la pagina nella lista
3. Clicca sulla pagina

**Metodo B: Dalla WebApp**

`Se e solo se è presente il documento (anche vuoto ) nella wiki`

1. Apri la WebApp
2. Naviga alla funzionalità che vuoi documentare
3. Clicca sull'icona 📖 in alto a destra
4. Si apre la pagina wiki corrispondente

---

## ✏️ COME MODIFICARE UNA PAGINA

### Aprire l'Editor

1. **Sei sulla pagina** che vuoi modificare
2. **Clicca** sul pulsante "Edit" (icona matita) in alto a destra
3. **Si apre l'editor** Markdown

### Struttura della Pagina

Ogni pagina ha questa struttura **OBBLIGATORIA**:

```markdown
# [Icona] Titolo Funzionalità

**Breve descrizione in grassetto**

---

## 📖 Descrizione

[Spiega cosa fa questa funzionalità]

---

## 🎯 A Cosa Serve

[Elenca i casi d'uso principali]

- **Primo utilizzo**: ...
- **Secondo utilizzo**: ...

---

## 🔧 Funzionalità Principali

[Descrivi le funzionalità chiave]

### Sottofunzione 1

[Dettagli...]

### Sottofunzione 2

[Dettagli...]

---

## 🚀 Come Si Usa

[Tutorial step-by-step]

### Operazione Comune 1

1. **Primo passo**: Fai questo
2. **Secondo passo**: Fai quello
3. **Terzo passo**: Risultato

### Operazione Comune 2

1. ...

---

## 📍 Informazioni Tecniche

- **Percorso nell'app:** [Es: Progetti > Intercompany]
- **Route:** [Es: /progetti/intercompany]
- **Componente:** [Es: IntercompanyDashboard]
- **Livello menu:** [1 o 2]

---

## ⚠️ Attenzione

[Eventuali avvisi o limitazioni importanti]

- ⚠️ **Avviso 1**: ...
- ⚠️ **Avviso 2**: ...

---

## 💡 Note

[Informazioni aggiuntive, tips, best practices]

---

## 🔗 Pagine Correlate

[Link ad altre pagine wiki collegate]

- [Nome Pagina](/wiki/home/path)
- [Nome Pagina 2](/wiki/home/path2)

---

**📝 Da completare:**
- [ ] Screenshot interfaccia
- [ ] Esempi concreti
- [ ] FAQ comuni
- [ ] Video tutorial (opzionale)
```

---

## 📐 REGOLE DI SCRITTURA

### ✅ FARE

#### 1. Usa Linguaggio Semplice
```markdown
✅ BENE: "Clicca sul pulsante verde 'Salva' per confermare le modifiche"
❌ MALE: "Effettua il submit del form mediante il trigger dell'evento onclick"
```

#### 2. Spiega Step-by-Step
```markdown
✅ BENE:
1. **Apri** la sezione Progetti dal menu principale
2. **Clicca** su "Nuovo Progetto"
3. **Compila** i campi obbligatori:
   - Nome progetto
   - Cliente
   - Data inizio
4. **Salva** cliccando il pulsante verde

❌ MALE:
Crea un nuovo progetto inserendo i dati richiesti.
```

#### 3. Usa Esempi Concreti
```markdown
✅ BENE:
**Esempio:** Per creare un progetto di sviluppo software per il cliente "ACME SRL":
1. Nome progetto: "Sviluppo Portale Web ACME"
2. Categoria: "Sviluppo Software"
3. Cliente: Seleziona "ACME SRL" dal menu
4. Budget: 15.000€

❌ MALE:
Inserisci nome, categoria, cliente e budget.
```

#### 4. Aggiungi Screenshot
```markdown
✅ BENE:
Per aggiungere un nuovo cliente:

1. Clicca su "Nuovo Cliente"

![Screenshot pulsante nuovo cliente](uploads/nuovo-cliente-btn.png)

2. Compila il form

![Screenshot form cliente](uploads/form-cliente.png)
```

**Come aggiungere screenshot:**
1. Cattura schermata (Win + Shift + S su Windows)
2. In editor wiki, clicca "Insert" > "Image"
3. Upload immagine
4. Inserisci nel testo

#### 5. Evidenzia Punti Importanti
```markdown
✅ BENE:
⚠️ **IMPORTANTE:** Salva sempre le modifiche prima di uscire, altrimenti perderai i dati!

💡 **SUGGERIMENTO:** Usa la ricerca rapida (CTRL+F) per trovare progetti velocemente.

🎯 **BEST PRACTICE:** Assegna sempre una categoria al progetto per facilitare il filtraggio.
```

### ❌ NON FARE

#### 1. Non Usare Termini Tecnici
```markdown
❌ MALE: "Il componente esegue una query al database tramite API REST"
✅ BENE: "Il sistema recupera i dati salvati"
```

#### 2. Non Dare per Scontato
```markdown
❌ MALE: "Ovviamente, prima devi selezionare il progetto"
✅ BENE: "1. Seleziona il progetto dalla lista
         2. Solo dopo aver selezionato il progetto, puoi..."
```

#### 3. Non Essere Generico
```markdown
❌ MALE: "Compila i campi necessari"
✅ BENE: "Compila i seguenti campi:
         - Nome (obbligatorio)
         - Email (obbligatorio)
         - Telefono (facoltativo)"
```

---

## 🎨 FORMATTAZIONE MARKDOWN

### Intestazioni

```markdown
# Titolo Principale (H1) - Usalo solo all'inizio
## Sezione (H2) - Usalo per le sezioni principali
### Sottosezione (H3) - Usalo per i dettagli
```

### Testo

```markdown
**Grassetto** - Per evidenziare parole importanti
*Corsivo* - Per enfasi leggera
`Codice` - Per nomi tecnici (es: `wikiSlug`, `AR_Pages`)
```

### Liste

```markdown
Liste non numerate:
- Primo punto
- Secondo punto
  - Sotto-punto (usa 2 spazi per indentare)
  - Altro sotto-punto

Liste numerate:
1. Primo passo
2. Secondo passo
3. Terzo passo
```

### Link

```markdown
Link interno al wiki:
[Nome Pagina](/wiki/home/progetti)

Link esterno:
[Google](https://google.com)
```

### Immagini

```markdown
![Testo alternativo](uploads/nome-immagine.png)
```

### Tabelle

```markdown
| Colonna 1 | Colonna 2 | Colonna 3 |
|-----------|-----------|-----------|
| Dato 1    | Dato 2    | Dato 3    |
| Dato 4    | Dato 5    | Dato 6    |
```

### Box Informativi

```markdown
> **Nota:** Questo è un box informativo
> Può contenere più righe

⚠️ **Attenzione:** Messaggio importante

💡 **Suggerimento:** Consiglio utile

✅ **Fatto:** Conferma operazione
```

---

## 📸 SCREENSHOT: BEST PRACTICES

### Quando Fare Screenshot

- ✅ Interfacce nuove o complesse
- ✅ Pulsanti specifici da cliccare
- ✅ Form con molti campi
- ✅ Risultati/output di operazioni
- ✅ Messaggi di errore comuni

### Quando NON Serve

- ❌ Operazioni molto semplici (es: "clicca su Salva")
- ❌ Interfacce già documentate altrove

### Come Fare Buoni Screenshot

1. **Cattura solo il necessario**
   ```
   ✅ BENE: Screenshot solo del form
   ❌ MALE: Screenshot intera finestra con desktop
   ```

2. **Risoluzione chiara**
   ```
   ✅ BENE: Immagine nitida, testo leggibile
   ❌ MALE: Immagine sfocata, pixel visibili
   ```

3. **Evidenzia elementi importanti**
   - Usa frecce rosse per indicare pulsanti
   - Usa cerchi rossi per evidenziare campi
   - Tools: Windows Snipping Tool, ShareX, Greenshot

4. **Nomi file descrittivi**
   ```
   ✅ BENE: progetti-form-nuovo-progetto.png
   ❌ MALE: screenshot-1.png
   ```

---

## 📝 ESEMPIO COMPLETO: Pagina Documentata

### Prima (Template Vuoto)

```markdown
# 🔄 Intercompany

**Gestione condivisioni progetti tra aziende**

---

## 📖 Descrizione

[DA COMPLETARE]

## 🎯 A Cosa Serve

[DA COMPLETARE]
```

### Dopo (Documentazione Completa)

```markdown
# 🔄 Intercompany

**Gestione condivisioni progetti tra aziende del gruppo**

---

## 📖 Descrizione

La funzionalità Intercompany permette di condividere articoli di progetti tra diverse aziende appartenenti allo stesso gruppo.

Esempio: Se l'azienda A sta lavorando a un progetto che coinvolge anche l'azienda B, tramite Intercompany puoi far vedere il progetto anche agli utenti dell'azienda B.

---

## 🎯 A Cosa Serve

- **Collaborazione multi-azienda**: Più aziende possono lavorare sullo stesso progetto, possono condivider einformazioni in modo strutturato e mediante un unico canale comunicativo.
- **Visibilità condivisa**: Gli utenti di aziende diverse vedono le informazioni condivise.
- **Controllo accessi**: Decidi chi può solo vedere e chi può modificare
- **Tracciabilità**: Ogni modifica viene registrata con azienda e utente

---

## 🔧 Funzionalità Principali

### Condivisione Progetto

Puoi condividere un progetto con una o più aziende del gruppo.

### Livelli di Accesso

- **Solo Lettura**: L'azienda può vedere il progetto ma non modificarlo
- **Lettura e Modifica**: L'azienda può modificare il progetto
- **Amministrazione**: L'azienda può anche gestire le condivisioni

### Revoca Condivisione

Puoi revocare l'accesso in qualsiasi momento.

---

## 🚀 Come Si Usa


---

## 📍 Informazioni Tecniche

- **Percorso nell'app:** Progetti > Intercompany
- **Route:** `/progetti/intercompany`
- **Componente:** `IntercompanyDashboard`
- **Livello menu:** 2

---

## ⚠️ Attenzione

- ⚠️ **Le modifiche sono immediate**: Quando condividi o revochi, l'effetto è istantaneo

---

## 💡 Note

- **Storico modifiche**: Ogni modifica fatta da utenti di aziende diverse viene tracciata
- **Filtri rapidi**: Usa i filtri per vedere rapidamente progetti condivisi DA te o CON te

---

## 🔗 Pagine Correlate

---

**📝 Ultima modifica:** 2025-10-23
```

---

## ✅ CHECKLIST PRIMA DI SALVARE

Prima di salvare una pagina, controlla:

- [ ] **Titolo chiaro** con icona appropriata
- [ ] **Descrizione** spiega cosa fa la funzionalità
- [ ] **A cosa serve** elenca i casi d'uso principali
- [ ] **Come si usa** ha tutorial step-by-step
- [ ] **Screenshot** dove necessari
- [ ] **Esempi concreti** con dati realistici
- [ ] **Avvisi importanti** evidenziati con ⚠️
- [ ] **Link** ad altre pagine correlate funzionanti
- [ ] **Nessun errore di battitura**
- [ ] **Linguaggio semplice e chiaro**

---

## 💾 SALVARE E PUBBLICARE

### Salvare una Bozza

1. Dopo aver scritto, clicca **"Save"** in basso
2. La pagina viene salvata ma **non ancora pubblicata**
3. Solo tu (admin) puoi vederla

### Pubblicare la Pagina

1. Clicca su **"Publish"** (icona 🌐)
2. La pagina diventa **visibile a tutti gli utenti**
3. Apparirà nella navigazione del wiki

### Modificare una Pagina Pubblicata

1. Apri la pagina
2. Clicca **"Edit"**
3. Fai le modifiche
4. Clicca **"Save"**
5. Le modifiche sono **immediate** per tutti

---

## 🆘 PROBLEMI COMUNI

### "Non riesco a vedere il pulsante Edit"

**Causa:** Non sei loggato come amministratore

**Soluzione:**
1. Verifica di aver fatto login
2. Controlla di avere permessi amministratore
3. Chiedi al responsabile IT

### "Le immagini non si vedono"

**Causa:** Path immagine errato o immagine non caricata

**Soluzione:**
1. Verifica che l'immagine sia stata caricata (Insert > Image)
2. Controlla il path: deve essere `uploads/nome-file.png`
3. Ricarica l'immagine se necessario

### "I link non funzionano"

**Causa:** Path link errato

**Soluzione:**
Usa sempre path assoluti:
```markdown
✅ BENE: [Dashboard](/wiki/home/dashboard)
❌ MALE: [Dashboard](../dashboard)
```

### "Ho cancellato per sbaglio!"

**Causa:** Errore umano

**Soluzione:**
1. Non farti prendere dal panico 😊
2. Vai su "Page History" (icona orologio)
3. Seleziona versione precedente
4. Clicca "Restore"

---

## 📚 RISORSE UTILI

### Markdown

- [Markdown Cheatsheet](https://www.markdownguide.org/cheat-sheet/)
- [Markdown Tutorial](https://www.markdowntutorial.com/)

### Screenshot Tools

- **Windows:** Snipping Tool (incluso), ShareX (gratuito)
- **Online:** Lightshot, Greenshot

### Emoji

Copia-incolla da qui:
- 📊 Dashboard
- 🔐 Sicurezza
- 🏗️ Progetti
- 📂 Categorie
- 👥 Utenti
- 💰 Costi
- 📈 Report
- ⚙️ Impostazioni
- 🔄 Sincronizza
- ✅ Confermato
- ⚠️ Attenzione
- 💡 Suggerimento

---

## 🎯 OBIETTIVO FINALE

Ogni pagina documentata deve permettere a un utente che **non ha mai usato** quella funzionalità di:

1. **Capire** a cosa serve
2. **Usarla** autonomamente seguendo i tuoi step
3. **Risolvere** i problemi comuni da solo

**Se riesci in questo, hai fatto un ottimo lavoro! 🎉**

---

## 📞 SUPPORTO

**Hai dubbi o domande?**

- Consulta questa guida
- Guarda le pagine già documentate come esempio

**Buon lavoro! 📝✨**
