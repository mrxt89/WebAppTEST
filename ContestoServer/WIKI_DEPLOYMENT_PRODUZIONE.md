# 📋 DEPLOYMENT WIKI.JS IN PRODUZIONE

**Server:** erpsrvdoc01 (192.168.42.122)
**SQL Server:** 192.168.42.117
**Database WebApp:** WebApp
**Database Wiki:** WikiJS
**Data:** 2025-10-23

---

## 🎯 SOMMARIO MODIFICHE

### ✅ FILE MODIFICATI

#### 1. **docker-compose.prod.yml**
**Cosa è stato fatto:**
- Aggiunto servizio `wiki-prod` con configurazione MSSQL
- Collegato a database WikiJS su server 192.168.42.117
- Creati volumi persistenti `wiki-data-prod` e `wiki-config-prod`
- Configurati limiti risorse per produzione (2GB RAM, 2 CPU)
- Porta esposta: 3002

**Dettagli configurazione:**
```yaml
wiki-prod:
  image: ghcr.io/requarks/wiki:2
  environment:
    - DB_HOST=192.168.42.117
    - DB_USER=rosset
    - DB_PASS=OraetLabora25-!
    - DB_NAME=WikiJS
  volumes:
    - wiki-data-prod:/wiki/data
    - wiki-config-prod:/wiki/config
```

#### 2. **nginx.conf**
**Cosa è stato fatto:**
- Aggiunta location `/wiki` per proxy a wiki-prod:3000
- Aggiunta location `/wiki/_assets` con cache (1 giorno)
- Aggiunta location `/wiki/uploads` senza cache
- Configurati timeout e header appropriati

**Posizione nel file:** Linee 49-82 (PRIMA di location /)

#### 3. **start-prod.bat**
**Cosa è stato fatto:**
- ⚠️ **CRITICO:** Rimosso flag `--volumes` da `docker system prune`
- Aggiunta nota che volumi wiki sono preservati
- Aggiunti URL wiki nell'output finale

**Perché è importante:**
- Senza questa modifica, ogni restart cancella il setup del wiki!
- I volumi `wiki-data-prod` e `wiki-config-prod` contengono:
  - Configurazione wizard completata
  - Permessi e gruppi
  - Pagine create
  - Account amministratore

---

## 📁 NUOVI FILE CREATI

### Script SQL Produzione (Scripts/Production/)

1. **01_create_wikijs_database_PROD.sql**
   - Crea database WikiJS su SQL Server produzione
   - ⚠️ IMPORTANTE: Verifica i percorsi dei file!
   - Recovery model: FULL (per backup)

2. **03_add_documentazione_page_PROD.sql**
   - Aggiunge voce "Documentazione" nel menu WebApp
   - Database: WebApp (non WebAppTEST)
   - pageRoute: /wiki
   - pageComponent: NULL (apre in nuova finestra)

3. **04_add_documentazione_permissions_PROD.sql**
   - Assegna permessi di accesso a tutti i gruppi
   - Database: WebApp

4. **05_fix_documentazione_standalone_PROD.sql**
   - Aggiorna route se necessario
   - Assicura che pageComponent sia NULL

---

## 🚀 PROCEDURA DI DEPLOYMENT

### FASE 1: Preparazione SQL Server (192.168.42.117)

#### Step 1.1: Verifica Percorsi File Database
Connettiti al SQL Server 192.168.42.117 ed esegui:

```sql
-- Trova i percorsi corretti per i tuoi file database
SELECT
    physical_name
FROM sys.master_files
WHERE database_id = DB_ID('WebApp')
```

Annota i percorsi! Dovrai modificare script 01 se diversi.

#### Step 1.2: Crea Database WikiJS
Esegui script: `Scripts/Production/01_create_wikijs_database_PROD.sql`

**⚠️ PRIMA DI ESEGUIRE:**
- Apri lo script e verifica che i percorsi alle righe 30-31 corrispondano a quelli del tuo server
- Se diversi, modifica:
  ```sql
  FILENAME = N'C:\...\WikiJS.mdf'
  FILENAME = N'C:\...\WikiJS_log.ldf'
  ```

**Output atteso:**
```
Database WikiJS creato con successo!
```

#### Step 1.3: Aggiungi Voce Menu
Esegui script: `Scripts/Production/03_add_documentazione_page_PROD.sql`

**Output atteso:**
```
Pagina Documentazione aggiunta con pageId: XX
```

#### Step 1.4: Assegna Permessi
Esegui script: `Scripts/Production/04_add_documentazione_permissions_PROD.sql`

**Output atteso:**
```
Permessi assegnati con successo!
```

---

### FASE 2: Deployment Docker (Server erpsrvdoc01)

#### Step 2.1: Copia File Modificati
Sul server di produzione (erpsrvdoc01), i seguenti file sono già stati modificati:

- ✅ ContestoServer/docker-compose.prod.yml
- ✅ ContestoServer/nginx.conf
- ✅ ContestoServer/start-prod.bat

**Verifica che siano presenti nel server!**

#### Step 2.2: Pull Immagine Wiki.js
```bash
docker pull ghcr.io/requarks/wiki:2
```

#### Step 2.3: Avvia Stack Produzione
```bash
cd C:\percorso\ContestoServer
.\start-prod.bat
```

Lo script farà:
1. Stop container esistenti
2. Pulizia (SENZA eliminare volumi)
3. Backup volumi esistenti
4. Build nuove immagini
5. Avvio stack completo

**Output atteso:**
```
=== AMBIENTE DI PRODUZIONE AVVIATO ===
Frontend HTTPS: https://192.168.42.122
Wiki.js diretto: http://192.168.42.122:3002
Wiki.js nginx:   https://192.168.42.122/wiki
```

#### Step 2.4: Verifica Container
```bash
docker ps
```

Dovresti vedere 3 container running:
- webapptest-backend-prod
- webapptest-frontend-prod
- webapptest-wiki-prod ← **NUOVO**

---

### FASE 3: Configurazione Wiki.js

#### Step 3.1: Accedi al Setup Wizard
Apri browser e vai a:
```
http://192.168.42.122:3002
```

Ti verrà mostrato il setup wizard (solo al primo avvio).

#### Step 3.2: Completa Setup Wizard

**Administrator Account:**
- Email: `admin@webapptest.local`
- Password: `[scegli password sicura]`
- ✅ Annota le credenziali!

**Site URL:**
```
https://192.168.42.122/wiki
```

**Telemetry:**
- Disabilita se non vuoi inviare statistiche anonime

**Clicca:** Proceed to Wiki

#### Step 3.3: Configura Autenticazione

**Vai a:** Administration → Authentication

**Local Strategy:**
- Enabled: ✅ Yes
- Self-registration: ❌ No (IMPORTANTE!)
- Allowed email domains: `webapptest.local`

**Salva.**

#### Step 3.4: Configura Gruppi e Permessi

**Vai a:** Administration → Groups

**Gruppo: Guests (già esistente)**
- Accesso alle pagine: Read Pages ✅
- Non può modificare

**Gruppo: Administrators (già esistente)**
- Tutti i permessi ✅

**Salva.**

#### Step 3.5: Abilita Accesso Pubblico

**Vai a:** Administration → General

**Public Access:**
- Enable Public Access: ✅ Yes
- Default Read Access: ✅ Yes

**Salva e riavvia** (se richiesto).

#### Step 3.6: Crea Pagina di Test

**Dal menu principale:** Pages → New Page

**Home Page:**
- Percorso: `/`
- Titolo: `Benvenuti nel Wiki`
- Contenuto: Testo di benvenuto

**Salva.**

---

### FASE 4: Test e Verifica

#### Test 4.1: Accesso Diretto
Verifica che Wiki.js risponda direttamente:
```
http://192.168.42.122:3002
```

✅ Dovresti vedere la home page del wiki.

#### Test 4.2: Accesso via Nginx
Verifica che nginx proxy funzioni:
```
https://192.168.42.122/wiki
```

✅ Dovresti vedere la stessa home page (con HTTPS).

#### Test 4.3: Accesso Anonimo
Apri browser in incognito e vai a:
```
https://192.168.42.122/wiki
```

✅ Dovresti vedere la pagina SENZA login (accesso pubblico).

#### Test 4.4: Menu WebApp
Accedi alla WebApp produzione:
```
https://192.168.42.122
```

**Login con credenziali WebApp.**

**Nel menu principale:**
- Dovresti vedere la voce "Documentazione"
- Clicca su "Documentazione"

✅ Si apre una nuova finestra/tab con il wiki!

#### Test 4.5: Persistenza Dati
Per verificare che i volumi siano preservati:

```bash
# Riavvia lo stack
docker-compose -f docker-compose.prod.yml restart wiki-prod

# Attendi 30 secondi
timeout /t 30

# Verifica che wiki sia di nuovo accessibile
curl http://192.168.42.122:3002
```

✅ Il wiki riappare con tutte le configurazioni intatte (no setup wizard).

---

## 🔍 TROUBLESHOOTING

### Problema: Wiki non si connette al database

**Sintomo:**
```
Database Connection Error: EINSTLOOKUP
Will retry in 3 seconds...
```

**Soluzione:**
1. Verifica che database WikiJS esista:
   ```sql
   SELECT name FROM sys.databases WHERE name = 'WikiJS'
   ```

2. Verifica connettività da container:
   ```bash
   docker exec webapptest-wiki-prod ping 192.168.42.117
   ```

3. Verifica credenziali in docker-compose.prod.yml:
   - DB_HOST=192.168.42.117 ✅
   - DB_USER=rosset ✅
   - DB_PASS=OraetLabora25-! ✅

### Problema: Menu non mostra "Documentazione"

**Soluzione:**
1. Verifica pagina in database:
   ```sql
   SELECT * FROM AR_Pages WHERE pageName = 'Documentazione'
   ```

2. Verifica permessi:
   ```sql
   SELECT * FROM AR_GroupPages gp
   INNER JOIN AR_Pages p ON gp.pageId = p.pageId
   WHERE p.pageName = 'Documentazione'
   ```

3. Ricarica la webapp (refresh browser).

### Problema: Click su Documentazione non apre wiki

**Verifica:**
1. Che pageComponent sia NULL:
   ```sql
   SELECT pageComponent FROM AR_Pages WHERE pageName = 'Documentazione'
   ```
   Deve essere NULL!

2. Che il frontend abbia la logica aggiornata in MainPage.jsx:
   ```javascript
   if (!item.pageComponent && item.pageRoute) {
     window.open(item.pageRoute, '_blank');
     return;
   }
   ```

### Problema: Setup Wizard riappare dopo restart

**Causa:** Volumi eliminati da docker system prune --volumes

**Soluzione:**
- Verifica che start-prod.bat NON abbia il flag `--volumes`
- Dovrebbe essere: `docker system prune -f` (senza --volumes)

---

## 📊 VERIFICA FINALE

Usa questa checklist prima di dichiarare completato il deployment:

- [ ] Database WikiJS creato su 192.168.42.117
- [ ] Script SQL 01, 03, 04 eseguiti con successo
- [ ] Container wiki-prod running (`docker ps`)
- [ ] Setup wizard completato
- [ ] Autenticazione Local configurata (no self-registration)
- [ ] Accesso pubblico abilitato
- [ ] Pagina di test creata
- [ ] URL diretto funzionante (http://192.168.42.122:3002)
- [ ] URL nginx funzionante (https://192.168.42.122/wiki)
- [ ] Menu WebApp mostra "Documentazione"
- [ ] Click su Documentazione apre wiki in nuova finestra
- [ ] Accesso anonimo funzionante
- [ ] Restart container preserva configurazione
- [ ] start-prod.bat senza flag --volumes

---

## 📝 NOTE AGGIUNTIVE

### Backup

Il wiki usa i seguenti volumi persistenti:
- `wiki-data-prod`: Contiene uploads, file caricati
- `wiki-config-prod`: Contiene configurazione

**Includi questi volumi nel backup automatico produzione!**

### Manutenzione

**Aggiornamento Wiki.js:**
```bash
docker-compose -f docker-compose.prod.yml pull wiki-prod
docker-compose -f docker-compose.prod.yml up -d wiki-prod
```

**Log monitoring:**
```bash
docker-compose -f docker-compose.prod.yml logs -f wiki-prod
```

### Sicurezza

- Wiki accessibile pubblicamente in READ-ONLY
- Solo admin@webapptest.local può modificare
- No self-registration
- HTTPS tramite nginx (usa certificati produzione)

---

## ✅ FILE NON MODIFICATI

I seguenti file **NON richiedono modifiche**:

- ✅ frontend/src/components/main/MainPage.jsx (già modificato in dev, stesso codice)
- ✅ frontend/src/App.jsx (no modifiche necessarie)
- ✅ frontend/src/pages/StandaloneWiki.jsx (non usato, wiki si apre via window.open)
- ✅ backend/.env (no modifiche necessarie)
- ✅ .env.production (no modifiche necessarie)

---

## 🎉 DEPLOYMENT COMPLETATO!

Dopo aver seguito tutti i passi, il wiki sarà:

- ✅ Accessibile da https://192.168.42.122/wiki
- ✅ Visibile nel menu WebApp come "Documentazione"
- ✅ Aperto in nuova finestra al click
- ✅ Leggibile da tutti (pubblico)
- ✅ Modificabile solo da admin
- ✅ Persistente tra restart

**Buon lavoro! 🚀**
