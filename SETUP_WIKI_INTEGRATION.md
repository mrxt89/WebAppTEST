# ✅ Setup Completato - Sistema Documentazione Wiki

**Data:** 2025-10-23
**Status:** Frontend e Backend modificati ✅

---

## 🎉 MODIFICHE COMPLETATE

### ✅ Frontend
1. **MainPage.jsx**
   - Importato `WikiDocLink`
   - Aggiunto state `currentWikiSlug`
   - Modificato `handleNavigate` per aggiornare `currentWikiSlug`
   - Modificato `handleBreadcrumbClick` per aggiornare `currentWikiSlug`
   - Modificato `handleHomeClick` per resettare `currentWikiSlug`
   - Passato `currentWikiSlug` a `MainContainer`

2. **MainContainer.jsx**
   - Importato `WikiDocLink`
   - Riceve prop `currentWikiSlug`
   - Renderizza icona 📖 nel breadcrumb (quando `breadcrumb.length > 0`)
   - Renderizza icona 📖 nella toolbar pagina (quando `isPageComponent = true`)

3. **WikiDocLink.jsx**
   - Componente già creato
   - Apre `/wiki/home${wikiSlug}` in nuova finestra
   - Mostra icona libro con tooltip

### ✅ Backend
1. **server.js**
   - Aggiunto `T2.wikiSlug` alla query `/api/menu`
   - Ora il frontend riceve anche il campo `wikiSlug` per ogni pagina

---

## ⚡ STEP FINALI (DA FARE SUBITO)

### STEP 1: Esegui Script SQL 📊

**IMPORTANTE:** Devi eseguire questo script per aggiungere il campo `wikiSlug` al database!

```sql
-- Apri SQL Server Management Studio
-- Connetti a: localhost\ARCHASERVER
-- Database: WebAppTEST
-- Esegui questo script:

C:\Users\marcoro\Projects\WebAppTEST\Scripts\11_add_wikiSlug_field.sql
```

**Cosa fa lo script:**
- Aggiunge colonna `wikiSlug` alla tabella `AR_Pages`
- Crea funzione `fn_GenerateSlug` per conversione testo → slug
- Genera automaticamente slug per tutte le pagine esistenti
- Esempi:
  - "Dashboard" → `/dashboard`
  - "Dashboard Progetti" → `/dashboard-progetti`
  - "Costificazione Distinte" → `/costificazione-distinte`

**Verifica risultato:**
```sql
SELECT
    pageId,
    pageName,
    wikiSlug,
    '/wiki/home' + wikiSlug AS [URL Wiki Completo]
FROM AR_Pages
WHERE disabled = 0 AND pageName <> 'Documentazione'
ORDER BY pageId
```

Output atteso:
```
pageId  pageName                wikiSlug                        URL Wiki Completo
1       Dashboard               /dashboard                      /wiki/home/dashboard
2       Permessi                /dashboard/permessi             /wiki/home/dashboard/permessi
15      Progetti                /progetti                       /wiki/home/progetti
19      Categorie progetti      /progetti/categorie-progetti    /wiki/home/progetti/categorie-progetti
...
```

---

### STEP 2: Riavvia Backend 🔄

Dopo aver eseguito lo script SQL, riavvia il backend:

```bash
# Se backend è in esecuzione, fermalo con CTRL+C
# Poi riavvia:
cd C:\Users\marcoro\Projects\WebAppTEST\backend
npm start
```

Il backend ora restituirà anche `wikiSlug` nell'API `/api/menu`.

---

### STEP 3: Riavvia Frontend 🔄

Riavvia anche il frontend per applicare le modifiche a MainPage e MainContainer:

```bash
# Se frontend è in esecuzione, fermalo con CTRL+C
# Poi riavvia:
cd C:\Users\marcoro\Projects\WebAppTEST\frontend
npm run dev
```

---

### STEP 4: Test Funzionamento ✅

1. **Apri webapp** in browser:
   ```
   http://localhost:5173
   ```

2. **Login** con le tue credenziali

3. **Naviga** a una pagina qualsiasi (es: Dashboard o Progetti)

4. **Verifica icona 📖** appare:
   - Nel breadcrumb (in alto)
   - Oppure nella toolbar della pagina

5. **Clicca** sull'icona 📖

6. **Controlla** che si apra una nuova finestra con URL tipo:
   ```
   http://localhost/wiki/home/dashboard
   ```

7. **Aspettato:** Vedrai un 404 perché le pagine wiki non sono ancora state create

---

## 📝 PROSSIMI PASSI (Dopo il test)

### 1. Importa Pagine Wiki

Segui la guida:
```
C:\Users\marcoro\Projects\WebAppTEST\Wiki\WIKI_IMPORT_GUIDE.md
```

**Quick start:**
1. Vai a http://localhost:3002
2. Login: admin@webapptest.local
3. Crea 11 pagine usando i template in `Wiki/*.md`:
   - `webapp` → Home
   - `webapp/dashboard` → Dashboard
   - `webapp/dashboard/permessi` → Permessi
   - `webapp/progetti` → Progetti
   - ... e così via

**IMPORTANTE:** I **path** delle pagine wiki devono corrispondere ai **wikiSlug** del database!

**Esempio:**
```
Database:
pageId=15, pageName="Progetti", wikiSlug="/progetti"

Wiki.js:
Path: "webapp/progetti"  (senza / iniziale, con "webapp" come prefisso)
Title: "Progetti"
```

**Perché funzioni:**
- WikiDocLink apre: `/wiki/home${wikiSlug}` = `/wiki/home/progetti`
- Nginx (vedi modifiche in WikiDocLink.jsx) deve fare redirect a path wiki corretto

---

### 2. Aggiorna WikiDocLink.jsx (se necessario)

**NOTA:** L'utente ha già modificato WikiDocLink.jsx per usare `/wiki/home` invece di `/wiki/webapp`.

**Verifica in WikiDocLink.jsx (riga 31):**
```javascript
const wikiUrl = `/wiki/home${wikiSlug}`;
```

**Se vuoi tornare a `/wiki/webapp`:**
```javascript
const wikiUrl = `/wiki/webapp${wikiSlug}`;
```

E aggiorna i path delle pagine wiki di conseguenza:
- Con `/wiki/home`: path = `home/dashboard`, `home/progetti`, ecc.
- Con `/wiki/webapp`: path = `webapp/dashboard`, `webapp/progetti`, ecc.

---

## 🐛 Troubleshooting

### Icona 📖 non appare

**Causa:** `wikiSlug` è `null` o `undefined`

**Soluzione:**
1. Verifica script SQL 11 eseguito:
   ```sql
   SELECT TOP 5 pageId, pageName, wikiSlug FROM AR_Pages
   ```
2. Verifica backend restituisce `wikiSlug`:
   - Apri browser console (F12)
   - Tab Network
   - Cerca richiesta `/api/menu`
   - Verifica risposta include `wikiSlug` per ogni pagina

3. Riavvia backend e frontend

### Click su icona non apre nulla

**Causa:** Popup blocker o errore JavaScript

**Soluzione:**
1. Apri console browser (F12)
2. Cerca errori
3. Disabilita popup blocker per localhost
4. Verifica `wikiSlug` non sia `null`

### Pagina wiki 404

**Causa:** Pagina non creata o path errato

**Soluzione:**
1. Vai a Wiki.js: http://localhost:3002
2. Administration > Pages
3. Verifica path pagina corrisponde a slug
4. Crea pagina se mancante usando template in `Wiki/*.md`

---

## 📊 Checklist Completa

- [ ] Script SQL `11_add_wikiSlug_field.sql` eseguito
- [ ] Campo `wikiSlug` presente in AR_Pages
- [ ] Slug generati per tutte le pagine
- [ ] Backend riavviato
- [ ] Frontend riavviato
- [ ] Icona 📖 visibile in webapp
- [ ] Click su icona apre nuova finestra
- [ ] 11 pagine wiki create (vedi WIKI_IMPORT_GUIDE.md)
- [ ] Link funzionanti tra pagine wiki
- [ ] Test completo da tutte le pagine webapp

---

## 📚 Documentazione

- **Sistema completo:** `Wiki/README_SISTEMA_DOCUMENTAZIONE.md`
- **Guida importazione wiki:** `Wiki/WIKI_IMPORT_GUIDE.md`
- **Integrazione frontend:** `frontend/src/components/wiki/INTEGRATION_GUIDE.md`
- **Template pagine wiki:** `Wiki/*.md` (11 file)
- **Struttura JSON:** `Wiki/wiki_pages_structure.json`

---

## ✅ RIEPILOGO MODIFICHE FILE

### Frontend
```
frontend/src/components/main/MainPage.jsx         → Modificato
frontend/src/components/main/MainContainer.jsx    → Modificato
frontend/src/components/wiki/WikiDocLink.jsx      → Creato (già esistente)
```

### Backend
```
backend/server.js                                  → Modificato (query /api/menu)
```

### Database
```
Scripts/11_add_wikiSlug_field.sql                 → DA ESEGUIRE
```

---

## 🎯 RISULTATO FINALE

Dopo aver completato tutti gli step:

1. **Utente** naviga in webapp
2. **Vede** icona 📖 in ogni pagina
3. **Clicca** icona
4. **Si apre** documentazione wiki specifica
5. **Legge** guida dettagliata della funzionalità

**Esempio:**
- Utente in "Progetti > Intercompany"
- Click su 📖
- Apre `/wiki/home/progetti/intercompany`
- Vede documentazione completa di Intercompany

---

**Tutto pronto! Esegui STEP 1-4 e poi procedi con importazione wiki! 🚀**
