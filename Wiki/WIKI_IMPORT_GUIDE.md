# 📥 Guida Importazione Pagine in Wiki.js

Come creare le pagine della documentazione WebApp in Wiki.js

---

## 🎯 Obiettivo

Creare 11 pagine nel wiki che rispecchiano la struttura del menu WebApp:

```
webapp/                                → Home documentazione
├─ webapp/dashboard                    → Dashboard
│  └─ webapp/dashboard/permessi        → Permessi
└─ webapp/progetti                     → Progetti
   ├─ webapp/progetti/categorie-progetti
   ├─ webapp/progetti/clienti-progetti
   ├─ webapp/progetti/costificazione-distinte
   ├─ webapp/progetti/dashboard-progetti
   ├─ webapp/progetti/intercompany
   └─ webapp/progetti/lista-attivita
```

---

## 📋 Prerequisiti

1. **Wiki.js** deve essere già installato e funzionante
2. **Accesso amministratore** al wiki (admin@webapptest.local)
3. **File markdown** pronti in `Wiki/*.md`

---

## 🚀 Procedura di Importazione

### Metodo 1: Creazione Manuale (Consigliato per Prime Volte)

#### Step 1: Accedi a Wiki.js

```
http://localhost:3002
```

Login con:
- Email: `admin@webapptest.local`
- Password: [quella impostata durante setup]

#### Step 2: Crea Pagina HOME

1. **Clicca** su "Create New Page" o "New Page"
2. **Seleziona** editor: "Markdown"
3. **Imposta Path:**
   ```
   webapp
   ```
4. **Imposta Title:**
   ```
   Documentazione WebApp
   ```
5. **Copia** il contenuto da `Wiki/01_HOME_webapp.md`
6. **Incolla** nell'editor
7. **Clicca** "Create" o "Save"

#### Step 3: Crea Pagine Livello 1

**Dashboard:**
1. New Page
2. Path: `webapp/dashboard`
3. Title: `Dashboard`
4. Contenuto da: `Wiki/02_Dashboard.md`
5. Save

**Progetti:**
1. New Page
2. Path: `webapp/progetti`
3. Title: `Progetti`
4. Contenuto da: `Wiki/04_Progetti.md`
5. Save

#### Step 4: Crea Pagine Livello 2

**Dashboard > Permessi:**
1. New Page
2. Path: `webapp/dashboard/permessi`
3. Title: `Permessi`
4. Contenuto da: `Wiki/03_Dashboard_Permessi.md`
5. Save

**Progetti > Sottopagine:**

Ripeti per ogni sottopagina:

| Path | Title | File |
|------|-------|------|
| `webapp/progetti/categorie-progetti` | Categorie Progetti | `05_Progetti_Categorie.md` |
| `webapp/progetti/clienti-progetti` | Clienti Progetti | `06_Progetti_Clienti.md` |
| `webapp/progetti/costificazione-distinte` | Costificazione Distinte | `07_Progetti_Costificazione_Distinte.md` |
| `webapp/progetti/dashboard-progetti` | Dashboard Progetti | `08_Progetti_Dashboard_Progetti.md` |
| `webapp/progetti/intercompany` | Intercompany | `09_Progetti_Intercompany.md` |
| `webapp/progetti/lista-attivita` | Lista Attività | `10_Progetti_Lista_Attivita.md` |

---

### Metodo 2: Import API (Avanzato)

Se hai molte pagine, puoi usare l'API di Wiki.js per importare automaticamente.

**Prerequisiti:**
- Genera API Key in Wiki.js: Administration > API Access
- Installa tool come `curl` o `Postman`

**Esempio script PowerShell:**

```powershell
# Configurazione
$WIKI_URL = "http://localhost:3002"
$API_KEY = "YOUR_API_KEY"
$HEADERS = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

# Funzione per creare pagina
function Create-WikiPage {
    param(
        [string]$Path,
        [string]$Title,
        [string]$Content
    )

    $body = @{
        path = $Path
        title = $Title
        content = $Content
        isPublished = $true
        editor = "markdown"
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$WIKI_URL/graphql" -Method Post -Headers $HEADERS -Body $body
}

# Esempio: Crea home page
$content = Get-Content "Wiki/01_HOME_webapp.md" -Raw
Create-WikiPage -Path "webapp" -Title "Documentazione WebApp" -Content $content
```

---

## 🔍 Verifica Importazione

Dopo aver creato tutte le pagine:

### 1. Verifica Struttura

**Vai a:** Administration > Pages

Dovresti vedere:
```
□ webapp
  □ dashboard
    □ permessi
  □ progetti
    □ categorie-progetti
    □ clienti-progetti
    □ costificazione-distinte
    □ dashboard-progetti
    □ intercompany
    □ lista-attivita
```

### 2. Testa Links

Apri la home (`/wiki/webapp`) e clicca su ogni link per verificare che punti correttamente.

### 3. Testa Accesso Pubblico

Apri browser in **modalità incognito** e vai a:
```
http://localhost:3002/wiki/webapp
```

Dovresti vedere la documentazione **senza login richiesto**.

---

## 📝 Personalizzazione Contenuti

### Aggiungere Screenshot

1. **Cattura** screenshot dalla webapp
2. **Carica** in Wiki.js: Edit Page > Insert > Image
3. **Aggiungi** nella sezione "📝 Da completare"

### Espandere Descrizioni

Modifica le pagine per aggiungere:
- **Esempi concreti** di utilizzo
- **FAQ** specifiche
- **Note** tecniche
- **Video tutorial** (se disponibili)

### Aggiungere Tag

In edit mode:
- **Tags:** webapp, progetti, dashboard, etc.
- Facilita ricerca

---

## 🎨 Temi e Personalizzazione

### Logo e Branding

**Vai a:** Administration > Theme

- Carica logo aziendale
- Imposta colori aziendali
- Personalizza footer

### Sidebar Navigation

**Vai a:** Administration > Navigation

Crea navigazione sidebar:
```
Home (/)
Documentazione WebApp (/wiki/webapp)
  ├─ Dashboard
  │  └─ Permessi
  └─ Progetti
     ├─ Categorie
     ├─ Clienti
     ├─ Costificazione
     ├─ Dashboard
     ├─ Intercompany
     └─ Attività
```

---

## 🔧 Configurazioni Avanzate

### Abilita Ricerca

**Vai a:** Administration > Search Engine

- **Abilita** search engine
- **Rigenera** indice dopo import

### Notifiche Modifiche

**Vai a:** Administration > Mail

- Configura SMTP (se non fatto)
- Abilita notifiche per modifiche pagine

---

## ✅ Checklist Completamento

- [ ] Tutte le 11 pagine create
- [ ] Path corretti (es: `webapp/dashboard/permessi`)
- [ ] Links funzionanti tra pagine
- [ ] Accesso pubblico verificato
- [ ] Navigazione sidebar configurata
- [ ] Logo e branding personalizzati
- [ ] Ricerca funzionante
- [ ] Test apertura da webapp (icona 📖)

---

## 🆘 Troubleshooting

### Pagina 404 quando apro da webapp

**Problema:** Path non corrisponde

**Soluzione:**
1. Verifica in Wiki.js: Administration > Pages
2. Controlla che il path sia esattamente: `webapp/[slug]`
3. Verifica che `wikiSlug` nel database corrisponda

### Links interni non funzionano

**Problema:** Path relativo vs assoluto

**Soluzione:**
Usa sempre path assoluti nei link:
```markdown
✅ [Dashboard](/wiki/webapp/dashboard)
❌ [Dashboard](dashboard)
```

### Accesso negato

**Problema:** Permessi non configurati

**Soluzione:**
1. Administration > Groups
2. Gruppo "Guests"
3. Verifica "Read Pages" ✅
4. Administration > General
5. "Public Access" ✅

---

## 📚 Risorse

- **Wiki.js Docs:** https://docs.requarks.io
- **Markdown Guide:** https://www.markdownguide.org
- **File Template:** `Wiki/*.md`
- **Struttura JSON:** `Wiki/wiki_pages_structure.json`

---

## 🎉 Completato!

Dopo aver importato tutte le pagine:

1. **Testa** navigazione completa
2. **Condividi** link wiki con team
3. **Inizia** a personalizzare contenuti
4. **Mantieni** documentazione aggiornata

---

**Prossimo step:** Integra WikiDocLink in MainPage.jsx per aprire documentazione direttamente dalla webapp!

**Creato:** 2025-10-23
**Versione:** 1.0
