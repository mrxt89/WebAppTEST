# 🎯 Riepilogo Implementazione Intercompany con Gestione Progetti

**Data**: 2025-10-25
**Autore**: Claude Code
**Versione**: 1.0

---

## ✅ **IMPLEMENTAZIONE COMPLETATA**

### 📁 Database (SQL Server)

**Tutti i file SQL sono in**: `database/`

| File | Descrizione | Status |
|------|-------------|--------|
| `01 - Fix table MA_ProjectArticles_References.sql` | Aggiunge campi SourceProjectId e TargetProjectId | ✅ PRONTO |
| `02 - Create SP MA_CreateTemporaryIntercompanyItem.sql` | SP per creazione codici temporanei | ✅ PRONTO |
| `03 - Create SP MA_ApproveIntercompanyReference.sql` | SP per approvazione con creazione progetto | ✅ PRONTO |
| `04 - Update SP MA_ProjectArticles_SyncIntercompanyComponents.sql` | SP aggiornata con gestione progetti | ✅ PRONTO |

**ISTRUZIONI**: Esegui gli script nell'ordine 01 → 02 → 03 → 04

---

### 🔧 Backend (Node.js/Express)

**Tutti gli aggiornamenti sono in**: `backend/`

#### 1. **Queries** - `backend/queries/projectArticlesManagement.js`

**Modifiche Completate:**
- ✅ Funzione `syncIntercompanyComponents` - **Aggiunto parametro `projectId`** (linea ~3878)
- ✅ Nuova funzione `approveIntercompanyReferenceWithProject` (linea ~3939)
- ✅ Nuova funzione `getTemporaryIntercompanyItems` (linea ~4010)
- ✅ Nuova funzione `replaceTemporaryItem` (linea ~4065)
- ✅ Nuova funzione `getReferenceWithProjects` (linea ~4166)
- ✅ Aggiornato `module.exports` con le nuove funzioni (linea ~4292)

#### 2. **Routes** - `backend/routes/projectArticlesRoutes.js`

**Modifiche Completate:**
- ✅ Importate nuove funzioni dal queries (linea ~53)
- ✅ Route `POST /api/projectArticles/sync-intercompany-components` - **Aggiunto parametro `projectId`** (linea ~1401)
- ✅ Route `POST /api/projectArticles/intercompany/references/:id/respond` - **Aggiunto supporto codici temporanei** (linea ~1280)
- ✅ Nuova route `GET /api/projectArticles/intercompany/temporary-items` (linea ~1474)
- ✅ Nuova route `POST /api/projectArticles/intercompany/temporary-items/:id/replace` (linea ~1491)
- ✅ Nuova route `GET /api/projectArticles/intercompany/references/:id/details` (linea ~1530)

---

### ⚛️ Frontend (React)

**Tutti gli aggiornamenti sono in**: `frontend/src/`

#### 1. **Hook** - `frontend/src/hooks/useProjectArticlesActions.js`

**Modifiche Completate:**
- ✅ Funzione `syncIntercompanyComponents` - **Aggiunto parametro `projectId`** (linea ~1594)
- ✅ Funzione `respondToIntercompanyRequest` - **Aggiunto `targetItemCode` e `createTemporaryIfMissing`** (linea ~1637)
- ✅ Nuova funzione `getTemporaryIntercompanyItems` (linea ~1715)
- ✅ Nuova funzione `replaceTemporaryItem` (linea ~1725)
- ✅ Nuova funzione `getReferenceWithProjects` (linea ~1738)
- ✅ Aggiornato export con le nuove funzioni (linea ~1840)

---

## 📋 **DA COMPLETARE MANUALMENTE**

### Frontend - Componenti React

I componenti React richiedono modifiche significative all'interfaccia utente. Ho creato la documentazione completa in:

📄 **`frontend/FRONTEND_INTERCOMPANY_UPDATES.md`**

#### Componenti da Creare:

1. **`frontend/src/pages/progetti/intercompany/components/ItemCodeDialog.jsx`**
   - Dialog per scegliere tra codice temporaneo e manuale
   - Vedi documentazione completa nel file FRONTEND_INTERCOMPANY_UPDATES.md

2. **`frontend/src/pages/progetti/intercompany/components/TemporaryItemsPanel.jsx`**
   - Pannello per gestire articoli temporanei
   - Permette sostituzione con codici definitivi
   - Vedi documentazione completa nel file FRONTEND_INTERCOMPANY_UPDATES.md

#### Componenti da Modificare:

1. **`frontend/src/pages/progetti/intercompany/IntercompanyDashboard.jsx`**
   - Aggiungere tab "Articoli Temporanei"
   - Modificare funzione `handleApprove` per supportare codici temporanei
   - Aggiungere stato e caricamento articoli temporanei
   - **Riferimento**: Sezione 2 in FRONTEND_INTERCOMPANY_UPDATES.md

2. **`frontend/src/pages/progetti/intercompany/components/IntercompanyRequestDetailsPanel.jsx`**
   - Usare `getReferenceWithProjects` per caricare dettagli completi
   - Mostrare informazioni progetti sorgente/target
   - Badge per codici temporanei
   - **Riferimento**: Sezione 5 in FRONTEND_INTERCOMPANY_UPDATES.md

3. **`frontend/src/pages/progetti/progetti/articoli/BOMViewer/index.jsx`**
   - Passare `projectId` alla funzione `syncIntercompanyComponents`
   - **Riferimento**: Sezione 6 in FRONTEND_INTERCOMPANY_UPDATES.md

---

## 🔄 Flusso Operativo Aggiornato

### Scenario 1: Sincronizzazione da Ricos

```javascript
// Nel BOMViewer, quando si sincronizza:
await syncIntercompanyComponents(
  selectedComponents,
  projectId,  // ⭐ NUOVO - OBBLIGATORIO
  true        // syncAttachments
);
```

**Backend crea reference con**:
- `SourceProjectId` = ID progetto Ricos
- `SourceProjectItemId` = ID componente
- `TargetCompanyId` = ID company target (es. CBL)
- `Status` = 'PENDING'

---

### Scenario 2: Approvazione da CBL

```javascript
// Quando CBL approva, può scegliere:

// OPZIONE A: Codice temporaneo automatico
await respondToIntercompanyRequest(
  referenceId,
  'APPROVE',
  notes,
  null,        // targetItemCode = null
  true         // createTemporaryIfMissing = true
);

// OPZIONE B: Codice esistente
await respondToIntercompanyRequest(
  referenceId,
  'APPROVE',
  notes,
  'CBL_PROD_001',  // targetItemCode specifico
  false            // createTemporaryIfMissing = false
);
```

**Backend esegue**:
1. Cerca se esiste già un `TargetProjectId` per quel `SourceProjectId`
2. **Se NO**: Crea nuovo progetto CBL con cliente=Ricos
3. **Se SI**: Riusa progetto esistente
4. Crea o trova articolo (temporaneo se `targetItemCode` è NULL)
5. Associa articolo al progetto
6. Aggiorna reference con `TargetProjectId` e `TargetProjectItemId`

---

### Scenario 3: Gestione Codici Temporanei

```javascript
// Recupera tutti gli articoli temporanei
const { items } = await getTemporaryIntercompanyItems();

// Sostituisci con codice definitivo
await replaceTemporaryItem(
  temporaryItemId,
  'CBL_PROD_DEFINITIVO_001'
);
```

**Backend esegue**:
1. Trova articolo definitivo
2. Aggiorna tutte le references che usavano il temporaneo
3. Aggiorna progetti-articoli
4. Disabilita articolo temporaneo con note

---

## ⚠️ **BREAKING CHANGES**

### API Chiamate che RICHIEDONO Modifiche:

#### 1. Sincronizzazione Componenti

**PRIMA:**
```javascript
syncIntercompanyComponents(components, syncAttachments)
```

**ADESSO:**
```javascript
syncIntercompanyComponents(components, projectId, syncAttachments)
//                                      ^^^^^^^^^ OBBLIGATORIO
```

#### 2. Approvazione Reference

**PRIMA:**
```javascript
respondToIntercompanyRequest(referenceId, 'APPROVE', notes)
```

**ADESSO (opzionale, ma consigliato):**
```javascript
respondToIntercompanyRequest(
  referenceId,
  'APPROVE',
  notes,
  targetItemCode,           // null = crea temporaneo
  createTemporaryIfMissing  // default: true
)
```

---

## 📊 Nuove API Endpoints

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/projectArticles/intercompany/temporary-items` | Lista articoli temporanei |
| POST | `/api/projectArticles/intercompany/temporary-items/:id/replace` | Sostituisci con codice definitivo |
| GET | `/api/projectArticles/intercompany/references/:id/details` | Dettagli reference con progetti |

---

## 🗄️ Nuovi Campi Database

### Tabella: `MA_ProjectArticles_References`

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `SourceProjectId` | INT NULL | ID progetto sorgente (es. progetto Ricos) |
| `TargetProjectId` | INT NULL | ID progetto target (es. progetto CBL creato) |

**Foreign Keys**:
- `SourceProjectId` → `MA_Projects.ProjectID`
- `TargetProjectId` → `MA_Projects.ProjectID`

---

## 🧪 Testing

### Checklist di Test:

#### Database:
- [ ] Esegui script 01 - verifica che i campi siano stati aggiunti
- [ ] Esegui script 02 - testa creazione codice temporaneo manualmente
- [ ] Esegui script 03 - testa approvazione con progetti
- [ ] Esegui script 04 - verifica che la SP accetti projectId

#### Backend:
- [ ] Riavvia server Node.js
- [ ] Testa endpoint `POST /api/projectArticles/sync-intercompany-components` con projectId
- [ ] Testa endpoint `POST /api/projectArticles/intercompany/references/:id/respond` con approvazione
- [ ] Testa endpoint `GET /api/projectArticles/intercompany/temporary-items`

#### Frontend:
- [ ] Implementa componenti mancanti (vedi FRONTEND_INTERCOMPANY_UPDATES.md)
- [ ] Testa sincronizzazione da BOMViewer con projectId
- [ ] Testa approvazione con scelta codice temporaneo/manuale
- [ ] Testa tab "Articoli Temporanei"
- [ ] Testa sostituzione codice temporaneo

---

## 📚 Documentazione

| File | Descrizione |
|------|-------------|
| `database/00 - README Intercompany Projects.md` | Documentazione completa SQL e SP |
| `frontend/FRONTEND_INTERCOMPANY_UPDATES.md` | Guida modifiche frontend dettagliata |
| `backend/queries/projectArticlesManagement_INTERCOMPANY_ADDITIONS.js` | Codice di riferimento funzioni backend |

---

## 🚀 Deployment

### Ordine di Deploy:

1. **Database** (SQL Server)
   ```bash
   # Esegui in ordine:
   01 - Fix table MA_ProjectArticles_References.sql
   02 - Create SP MA_CreateTemporaryIntercompanyItem.sql
   03 - Create SP MA_ApproveIntercompanyReference.sql
   04 - Update SP MA_ProjectArticles_SyncIntercompanyComponents.sql
   ```

2. **Backend** (già implementato)
   ```bash
   cd backend
   npm install  # se necessario
   npm start    # o pm2 restart
   ```

3. **Frontend** (da completare componenti)
   ```bash
   cd frontend
   # Implementa componenti mancanti
   npm run build
   npm start
   ```

---

## ❓ Domande Frequenti

### Q: Cosa succede se sincronizzo lo stesso componente per progetti diversi?
**A**: Se il progetto nuovo è più recente (data creazione), la reference viene resettata a PENDING e CBL deve riapprovare per il nuovo progetto.

### Q: Come vengono creati i codici temporanei?
**A**: Formato: `IC_TEMP_{CompanyCode}_{SourceItemCode}_{YYYYMMDD}[_{N}]`
Esempio: `IC_TEMP_RICOS_ML45612DRT_20251025`

### Q: Posso usare un codice esistente invece di creare un temporaneo?
**A**: Sì, passa `targetItemCode` alla funzione `respondToIntercompanyRequest`.

### Q: Cosa succede quando sostituisco un codice temporaneo?
**A**: Vengono aggiornate tutte le references e le associazioni progetti-articoli, poi l'articolo temporaneo viene disabilitato.

---

## 📞 Supporto

Per problemi o domande:
1. Consulta `database/00 - README Intercompany Projects.md`
2. Consulta `frontend/FRONTEND_INTERCOMPANY_UPDATES.md`
3. Verifica i log backend per errori SQL
4. Verifica console browser per errori API

---

## ✨ Prossimi Passi

1. **Esegui script SQL** nel database di sviluppo
2. **Testa backend** con Postman o simili
3. **Implementa componenti frontend** seguendo FRONTEND_INTERCOMPANY_UPDATES.md
4. **Testa end-to-end** il flusso completo
5. **Deploy in produzione** seguendo l'ordine sopra

---

**Fine Implementazione**

Tutti i file backend e database sono pronti. Il frontend richiede completamento componenti UI seguendo la documentazione fornita.
