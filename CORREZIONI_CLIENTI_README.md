# 🔧 Correzioni Sistema Gestione Clienti

## 📋 Problemi Risolti

### 1. **Colonna Region mancante nel database**
   - ❌ La tabella `MA_ProjectCustomers` non aveva la colonna `Region`
   - ✅ Creato script SQL per aggiungere la colonna

### 2. **Backend non gestiva Region**
   - ❌ Tutte le query SELECT non leggevano Region
   - ❌ Le query INSERT non inserivano Region
   - ❌ L'UPDATE non salvava Region
   - ✅ Aggiornate **tutte** le query backend

### 3. **Modifica griglia frontend**
   - ℹ️ La griglia funziona correttamente
   - ℹ️ Le celle sono read-only solo per clienti collegati a ERP (comportamento corretto)

---

## 🚀 Istruzioni per Applicare le Correzioni

### **PASSO 1: Eseguire lo script SQL** ⭐ IMPORTANTE

1. Aprire SQL Server Management Studio (SSMS)
2. Connettersi al database
3. Aprire il file: `database/add_region_column.sql`
4. **MODIFICARE** la riga 4: `USE [YourDatabaseName]` con il nome del tuo database
5. Eseguire lo script (F5)

Lo script:
- Verifica se la colonna Region esiste già
- Aggiunge la colonna `Region VARCHAR(32) NULL`
- Aggiunge il default `''` (stringa vuota)
- Mostra una verifica finale

**Output atteso:**
```
Colonna Region aggiunta con successo!
Default per Region aggiunto con successo!
Verifica completata!
```

---

### **PASSO 2: Riavviare il backend**

Il backend è già stato aggiornato con le seguenti modifiche:

✅ **File modificato:** `backend/queries/projectCustomers.js`

**Query aggiornate:**
1. ✅ `getPaginatedProjectCustomers` - SELECT con Region
2. ✅ `getAllProjectCustomers` - SELECT con Region
3. ✅ `getProjectCustomerById` - SELECT con Region
4. ✅ `updateProjectCustomer` - INSERT con Region
5. ✅ `updateProjectCustomer` - UPDATE con Region (già presente)
6. ✅ `addUpdateProjectCustomersBulk` - INSERT con Region
7. ✅ `addUpdateProjectCustomersBulk` - UPDATE con Region
8. ✅ `importERPCustomerAsProspect` - INSERT con Region
9. ✅ `linkToERPCustomer` - UPDATE con Region

**Riavvia il server backend:**
```bash
# Se usi nodemon, dovrebbe riavviarsi automaticamente
# Altrimenti riavvia manualmente
npm start
```

---

### **PASSO 3: Riavviare il frontend**

Il frontend è già configurato correttamente:

✅ **File:** `frontend/src/pages/progetti/clienti/ProjectCustomersTable.jsx`
- La colonna Region è già nella definizione (righe 72-77)
- La griglia gestisce già Region

**Riavvia il server frontend:**
```bash
# Se usi vite/webpack, dovrebbe riavviarsi automaticamente
# Altrimenti riavvia manualmente
npm run dev
```

---

## ✅ Test delle Funzionalità

Dopo aver applicato le correzioni, testa:

### **1. Inserimento nuovo cliente**
1. Vai su **Clienti**
2. Clicca **Nuovo Cliente Prospect**
3. Compila i campi:
   - Ragione Sociale: `Test Cliente`
   - Nazione: Seleziona `Italia`
   - Regione: Seleziona una regione (es. `Lombardia`)
   - Provincia: Seleziona una provincia (es. `MI`)
   - Città: `Milano`
4. Clicca **Conferma**
5. ✅ Verifica che il cliente sia stato creato correttamente

### **2. Modifica cliente esistente**
1. Nella griglia clienti, trova un cliente NON collegato a ERP
2. Modifica il campo **Regione** direttamente nella cella
3. Clicca **Salva Modifiche**
4. ✅ Verifica che la modifica sia stata salvata

### **3. Verifica database**
Esegui questa query per verificare che Region sia popolato:
```sql
SELECT TOP 10
    Id, CompanyName, City, County, Country, Region
FROM MA_ProjectCustomers
WHERE Region IS NOT NULL AND Region != ''
ORDER BY Id DESC
```

---

## 🔍 Struttura Dati Completa

### **Tabella: MA_ProjectCustomers**

```sql
CREATE TABLE [dbo].[MA_ProjectCustomers](
    [CompanyId] [int] NOT NULL,
    [Id] [int] NOT NULL,
    [CustomerCode] [varchar](50) NULL,
    [CompanyName] [varchar](128) NULL,
    [TaxIdNumber] [varchar](20) NULL,
    [Address] [varchar](128) NULL,
    [City] [varchar](64) NULL,
    [County] [varchar](3) NULL,
    [Country] [varchar](64) NULL,
    [Region] [varchar](32) NULL,        -- ✅ NUOVA COLONNA
    [ZIPCode] [varchar](10) NULL,
    [ERPCustSupp] [varchar](12) NULL,
    [ERPCustSuppType] [int] NULL,
    [Disabled] [int] NULL,
    [fscodice] [varchar](64) NULL,
    [Creationdate] [datetime] NULL,
    [TBCreatedId] [int] NULL,
    [TBModified] [int] NULL,
    PRIMARY KEY (CompanyId, Id)
)
```

---

## 📌 Note Importanti

### **Modifica Griglia**

**Comportamento Read-Only:**
- ✅ I clienti **NON** collegati a ERP → **MODIFICABILI**
- 🔒 I clienti collegati a ERP → **READ-ONLY** (corretto)

Per modificare un cliente collegato a ERP:
1. Modificare prima il record in ERP
2. Aggiornare/reimportare nel sistema prospect

**Colonne sempre read-only:**
- Id (generato automaticamente)
- ERPCustSupp (codice cliente ERP)

---

## 🐛 Troubleshooting

### **Problema: "Invalid column name 'Region'"**
**Causa:** La colonna Region non è stata aggiunta al database
**Soluzione:** Eseguire lo script SQL `add_region_column.sql`

### **Problema: Region non si salva**
**Causa 1:** Backend non riavviato
**Soluzione:** Riavvia il server backend (node)

**Causa 2:** Colonna non aggiunta al database
**Soluzione:** Verifica con:
```sql
SELECT * FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MA_ProjectCustomers'
AND COLUMN_NAME = 'Region'
```

### **Problema: Non riesco a modificare la griglia**
**Causa:** Il cliente è collegato a ERP
**Verifica:**
- Colonna "Cliente ERP" popolata → Read-only (comportamento corretto)
- Colonna "Cliente ERP" vuota → Modificabile

---

## 📁 File Modificati

### **Backend**
- ✅ `backend/queries/projectCustomers.js` (9 query aggiornate)

### **Database**
- ✅ `database/add_region_column.sql` (nuovo file - da eseguire)

### **Frontend**
- ℹ️ Nessuna modifica necessaria (già configurato)

---

## 📊 Riepilogo Modifiche Backend

```javascript
// Prima (SBAGLIATO - Region mancante)
SELECT
  Id, CustomerCode, CompanyName, TaxIdNumber,
  Address, City, County, Country, ZIPCode,
  ERPCustSupp, ERPCustSuppType, Disabled
FROM MA_ProjectCustomers

// Dopo (CORRETTO - Region incluso)
SELECT
  Id, CustomerCode, CompanyName, TaxIdNumber,
  Address, City, County, Country, Region, ZIPCode,
  ERPCustSupp, ERPCustSuppType, Disabled,
  fscodice, Creationdate, TBCreatedId, TBModified
FROM MA_ProjectCustomers
```

---

## ✅ Checklist Finale

Prima di considerare completata la correzione:

- [ ] Script SQL eseguito correttamente
- [ ] Colonna Region visibile nel database
- [ ] Backend riavviato
- [ ] Frontend riavviato
- [ ] Test inserimento nuovo cliente con Region → OK
- [ ] Test modifica Region in griglia → OK
- [ ] Verifica Region salvato nel database → OK

---

## 💡 Miglioramenti Futuri Consigliati

1. **Validazione lato server** - Aggiungere controlli sui campi geografici
2. **Cascata Nazione → Regione → Provincia** - Validare coerenza dati
3. **Import massivo** - Verificare che l'import CSV gestisca Region
4. **Audit trail** - Tracciare chi/quando modifica i dati geografici

---

**Data aggiornamento:** 2025-01-04
**Versione:** 1.0
