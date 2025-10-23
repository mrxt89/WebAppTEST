# 🎯 WIKI.JS INTEGRATION - PIANO IMPLEMENTAZIONE DETTAGLIATO

> **Prerequisiti**: Leggere `WIKI_INTEGRATION_CONTEXT.md` prima di procedere
> **Data**: 2025-10-23
> **Versione**: 1.0

---

## 📊 OVERVIEW IMPLEMENTAZIONE

### Fasi Principali

```
FASE 1: Preparazione Database (15 min)
   ├─ Step 1.1: Analisi configurazione server
   ├─ Step 1.2: Creazione script SQL
   └─ Step 1.3: Esecuzione script in dev

FASE 2: Configurazione Docker (20 min)
   ├─ Step 2.1: Modifica docker-compose.yml
   ├─ Step 2.2: Configurazione variabili ambiente
   └─ Step 2.3: Test build servizio wiki

FASE 3: Configurazione Nginx (10 min)
   ├─ Step 3.1: Modifica nginx.conf.template
   └─ Step 3.2: Test routing

FASE 4: Deploy e Setup Wiki.js (15 min)
   ├─ Step 4.1: Avvio stack completo
   ├─ Step 4.2: Setup wizard Wiki.js
   ├─ Step 4.3: Configurazione permessi
   └─ Step 4.4: Test accesso pubblico

FASE 5: Integrazione Frontend (20 min)
   ├─ Step 5.1: Creazione componente WikiEmbed
   ├─ Step 5.2: Modifica routing React
   └─ Step 5.3: Test integrazione

FASE 6: Preparazione Produzione (30 min)
   ├─ Step 6.1: Analisi configurazioni server
   ├─ Step 6.2: Adattamento file configurazione
   ├─ Step 6.3: Documentazione deploy
   └─ Step 6.4: Script migrazione contenuti

FASE 7: Testing e Validazione (20 min)
   ├─ Step 7.1: Test funzionali
   ├─ Step 7.2: Test performance
   └─ Step 7.3: Verifica sicurezza

TEMPO TOTALE STIMATO: 130 minuti (2h 10min)
```

---

## 🔧 FASE 1: PREPARAZIONE DATABASE

### Step 1.1: Analisi Configurazione Server

**Obiettivo**: Verificare configurazioni server produzione

**Azioni:**
```bash
1. Verificare esistenza cartella ContestoServer/
2. Identificare file configurazione presenti
3. Estrarre parametri connection string SQL Server prod
```

**File da analizzare:**
- `ContestoServer/docker-compose.prod.yml` (se esiste)
- `ContestoServer/.env.production` (se esiste)
- `ContestoServer/nginx.conf.prod` (se esiste)
- Altri file di configurazione

**Output atteso:**
```
✓ Connection string prod identificato
✓ Differenze dev/prod documentate
✓ Variabili ambiente necessarie listate
```

**Checklist:**
- [ ] Cartella ContestoServer/ esplorata
- [ ] File configurazione letti
- [ ] Parametri SQL Server prod estratti
- [ ] Documentate differenze dev/prod

---

### Step 1.2: Creazione Script SQL

**Obiettivo**: Creare script per database WikiJS in MSSQL

**File da creare:**

#### `Scripts/01_create_wikijs_database.sql`

```sql
-- =====================================================
-- Script: Creazione Database WikiJS per Wiki.js
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Crea database separato per Wiki.js
-- =====================================================

USE [master]
GO

-- Verifica se database esiste già
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'WikiJS')
BEGIN
    PRINT 'Creazione database WikiJS...'

    CREATE DATABASE [WikiJS]
     CONTAINMENT = NONE
     ON PRIMARY
    (
        NAME = N'WikiJS',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.ARCHASERVER\MSSQL\DATA\WikiJS.mdf',
        SIZE = 100MB,
        MAXSIZE = UNLIMITED,
        FILEGROWTH = 10MB
    )
     LOG ON
    (
        NAME = N'WikiJS_log',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.ARCHASERVER\MSSQL\DATA\WikiJS_log.ldf',
        SIZE = 10MB,
        MAXSIZE = 1GB,
        FILEGROWTH = 10%
    )

    PRINT 'Database WikiJS creato con successo!'
END
ELSE
BEGIN
    PRINT 'Database WikiJS esiste già!'
END
GO

-- Imposta recovery model a SIMPLE (per dev) o FULL (per prod)
ALTER DATABASE [WikiJS] SET RECOVERY SIMPLE
GO

-- Verifica creazione
USE [WikiJS]
GO

SELECT
    name AS [Database],
    database_id AS [ID],
    create_date AS [Data Creazione],
    recovery_model_desc AS [Recovery Model],
    state_desc AS [Stato]
FROM sys.databases
WHERE name = 'WikiJS'
GO

PRINT 'Setup database completato!'
PRINT 'Ora Wiki.js può creare le sue tabelle automaticamente al primo avvio.'
GO
```

#### `Scripts/02_create_wikijs_user.sql` (OPZIONALE)

```sql
-- =====================================================
-- Script: Creazione Utente Dedicato per WikiJS
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Crea utente SQL con permessi limitati
-- OPZIONALE: Usare solo se non vuoi usare 'sa'
-- =====================================================

USE [master]
GO

-- Verifica se login esiste
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'wikijs_user')
BEGIN
    PRINT 'Creazione login wikijs_user...'

    -- MODIFICA QUESTA PASSWORD!
    CREATE LOGIN [wikijs_user]
    WITH PASSWORD = N'WikiJS_P@ssw0rd!2024',
         DEFAULT_DATABASE = [WikiJS],
         CHECK_EXPIRATION = OFF,
         CHECK_POLICY = OFF

    PRINT 'Login wikijs_user creato!'
END
ELSE
BEGIN
    PRINT 'Login wikijs_user esiste già!'
END
GO

USE [WikiJS]
GO

-- Crea user nel database WikiJS
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'wikijs_user')
BEGIN
    PRINT 'Creazione user wikijs_user nel database WikiJS...'

    CREATE USER [wikijs_user] FOR LOGIN [wikijs_user]

    -- Assegna ruoli necessari
    ALTER ROLE [db_owner] ADD MEMBER [wikijs_user]

    PRINT 'User wikijs_user configurato con permessi db_owner!'
END
ELSE
BEGIN
    PRINT 'User wikijs_user esiste già nel database!'
END
GO

-- Verifica permessi
SELECT
    dp.name AS [User],
    dp.type_desc AS [Tipo],
    dp.create_date AS [Data Creazione],
    STRING_AGG(drole.name, ', ') AS [Ruoli]
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals drole ON drm.role_principal_id = drole.principal_id
WHERE dp.name = 'wikijs_user'
GROUP BY dp.name, dp.type_desc, dp.create_date
GO

PRINT 'Setup utente completato!'
PRINT 'Usa queste credenziali in docker-compose.yml:'
PRINT '  DB_USER: wikijs_user'
PRINT '  DB_PASS: WikiJS_P@ssw0rd!2024'
GO
```

#### `Scripts/README.md`

```markdown
# Script SQL per Wiki.js Integration

## Ordine Esecuzione

### Ambiente DEV Locale

1. **Esegui su ARCHASERVER (dev)**:
   ```
   01_create_wikijs_database.sql
   ```

2. **OPZIONALE - Solo se vuoi utente dedicato**:
   ```
   02_create_wikijs_user.sql
   ```
   Poi modifica docker-compose.yml con:
   ```yaml
   DB_USER: wikijs_user
   DB_PASS: WikiJS_P@ssw0rd!2024
   ```

### Ambiente PRODUZIONE

1. **Modifica script prima di eseguire**:
   - `01_create_wikijs_database.sql`:
     - Cambia path file database se diverso
     - Imposta RECOVERY FULL invece di SIMPLE

2. **Esegui su SQL Server Produzione**:
   ```
   01_create_wikijs_database.sql
   02_create_wikijs_user.sql (raccomandato in prod)
   ```

## Verifica

```sql
-- Controlla database creato
SELECT name, database_id, create_date
FROM sys.databases
WHERE name = 'WikiJS'

-- Controlla dimensioni
EXEC sp_spaceused
```

## Backup

```sql
-- Backup database WikiJS
BACKUP DATABASE [WikiJS]
TO DISK = 'C:\Backup\WikiJS.bak'
WITH FORMAT, INIT, COMPRESSION
```

## Restore (migrazione dev → prod)

```sql
RESTORE DATABASE [WikiJS]
FROM DISK = '\\server\backup\WikiJS.bak'
WITH REPLACE
```
```

**Checklist:**
- [ ] File `01_create_wikijs_database.sql` creato
- [ ] File `02_create_wikijs_user.sql` creato (opzionale)
- [ ] File `Scripts/README.md` creato
- [ ] Path file database verificati per ambiente

---

### Step 1.3: Esecuzione Script in Dev

**Obiettivo**: Creare database WikiJS in ambiente locale

**Strumenti necessari:**
- SQL Server Management Studio (SSMS)
- O Azure Data Studio
- O `sqlcmd` da command line

**Procedura con SSMS:**

1. **Connessione a SQL Server**:
   ```
   Server: localhost\ARCHASERVER
   Authentication: SQL Server Authentication
   Login: sa
   Password: Kacu938861
   ```

2. **Esecuzione script**:
   - Apri `Scripts/01_create_wikijs_database.sql`
   - Verifica path file database (modifica se necessario)
   - Esegui (F5)
   - Verifica output: "Database WikiJS creato con successo!"

3. **Verifica creazione**:
   ```sql
   -- In SSMS, espandi Databases
   -- Dovresti vedere "WikiJS" nella lista

   -- Esegui query di verifica
   USE [WikiJS]
   GO

   SELECT COUNT(*) AS [Tabelle] FROM sys.tables
   -- Risultato atteso: 0 (Wiki.js creerà tabelle al primo avvio)
   ```

**Procedura con sqlcmd (alternativa):**

```bash
# Da command prompt in C:\Users\marcoro\Projects\WebAppTEST\Scripts
sqlcmd -S localhost\ARCHASERVER -U sa -P Kacu938861 -i 01_create_wikijs_database.sql
```

**Output atteso:**
```
Creazione database WikiJS...
Database WikiJS creato con successo!
Setup database completato!
```

**Checklist:**
- [ ] Connesso a SQL Server locale
- [ ] Script `01_create_wikijs_database.sql` eseguito
- [ ] Database `WikiJS` visibile in SSMS
- [ ] Nessun errore di esecuzione

**Troubleshooting:**

| Errore | Soluzione |
|--------|-----------|
| "Cannot open user default database" | Cambia default database a 'master' in script |
| "File path not found" | Modifica FILENAME nel script con path corretto |
| "Database already exists" | Normale se già eseguito, skip o drop database prima |
| "Permission denied" | Verifica login sa o usa Windows Authentication |

---

## 🐳 FASE 2: CONFIGURAZIONE DOCKER

### Step 2.1: Modifica docker-compose.yml

**Obiettivo**: Aggiungere servizio Wiki.js al docker-compose esistente

**File**: `WebAppTEST/docker-compose.yml`

**Modifiche da applicare:**

1. **Aggiungere servizio `wiki` nella sezione `services:`**

```yaml
  # ================================================
  # WIKI.JS SERVICE
  # ================================================
  wiki:
    image: ghcr.io/requarks/wiki:2
    container_name: webapptest-wiki
    restart: unless-stopped

    # Dipendenze: nessuna (database esterno)
    depends_on: []

    # Porte esposte
    ports:
      - "3002:3000"    # HTTP (per accesso diretto in dev)
      # - "3444:3443"  # HTTPS (disabilitato, gestiamo con nginx)

    # Network
    networks:
      - app-network-dev

    # Variabili ambiente
    environment:
      # Database MSSQL
      DB_TYPE: mssql
      DB_HOST: ${DB_SERVER:-host.docker.internal\ARCHASERVER}
      DB_PORT: 1433
      DB_USER: ${WIKI_DB_USER:-sa}
      DB_PASS: ${WIKI_DB_PASS:-Kacu938861}
      DB_NAME: WikiJS
      DB_SSL: "false"

      # SSL disabilitato (gestito da nginx)
      SSL_ACTIVE: "false"

      # High-Availability disabilitato in dev
      HA_ACTIVE: "false"

      # Logging
      LOG_LEVEL: info

    # Volumi (opzionale - per backup configurazioni)
    volumes:
      - wiki-data:/wiki/data
      - wiki-config:/wiki/config

    # Health check
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # Risorse (opzionale)
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

    # Extra hosts per accesso a SQL Server su host Windows
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

2. **Aggiungere volumi nella sezione `volumes:` (in fondo al file)**

```yaml
volumes:
  # ... volumi esistenti ...

  # Wiki.js volumes
  wiki-data:
    driver: local
  wiki-config:
    driver: local
```

**Checklist:**
- [ ] Servizio `wiki` aggiunto in `services:`
- [ ] Volumi `wiki-data` e `wiki-config` aggiunti in `volumes:`
- [ ] Porta 3002 non in conflitto con altri servizi
- [ ] Variabili DB_HOST, DB_USER, DB_PASS corrette
- [ ] Network `app-network-dev` specificato

**Verifica sintassi YAML:**

```bash
# Da WebAppTEST/
docker-compose config
```

Dovrebbe mostrare la configurazione parsata senza errori.

---

### Step 2.2: Configurazione Variabili Ambiente

**Obiettivo**: Aggiungere variabili Wiki.js al file `.env` (opzionale)

**File**: `WebAppTEST/.env`

**Modifiche da aggiungere:**

```bash
# ================================================
# WIKI.JS CONFIGURATION
# ================================================

# Database per Wiki.js (usa stesso server di WebAppTEST)
WIKI_DB_USER=sa
WIKI_DB_PASS=Kacu938861
WIKI_DB_NAME=WikiJS

# Porta esposta (dev)
WIKI_PORT=3002

# Opzionale: Override DB_SERVER per wiki
# WIKI_DB_SERVER=host.docker.internal\ARCHASERVER
```

**Aggiornamento docker-compose.yml per usare .env:**

```yaml
environment:
  DB_USER: ${WIKI_DB_USER:-sa}
  DB_PASS: ${WIKI_DB_PASS:-Kacu938861}
  DB_NAME: ${WIKI_DB_NAME:-WikiJS}
```

**Checklist:**
- [ ] Variabili WIKI_* aggiunte a `.env` (opzionale)
- [ ] docker-compose.yml referenzia variabili ${...}
- [ ] Valori di default specificati con `:-`

**Note:**
- Questo step è **opzionale** - puoi lasciare valori hardcoded in docker-compose.yml
- Utile per gestire differenze dev/prod

---

### Step 2.3: Test Build Servizio Wiki

**Obiettivo**: Verificare che il servizio wiki si avvii correttamente

**Procedura:**

1. **Stop container esistenti:**
```bash
cd C:\Users\marcoro\Projects\WebAppTEST
docker-compose down
```

2. **Pull immagine Wiki.js:**
```bash
docker pull ghcr.io/requarks/wiki:2
```

3. **Avvia solo servizio wiki (test isolato):**
```bash
docker-compose up wiki
```

4. **Verifica output console:**

Output atteso:
```
Loading configuration from environment...
Connecting to database...
Database connection established
Starting Wiki.js...
Browse to http://localhost:3000 for the setup wizard
```

Output errori comuni:
```
❌ "Cannot connect to database"
   → Verifica DB_HOST, DB_PORT, credenziali

❌ "Database WikiJS does not exist"
   → Esegui script SQL Step 1.3

❌ "Port 3002 already in use"
   → Cambia porta in docker-compose.yml
```

5. **Test accesso web:**
```
Apri browser: http://localhost:3002
```

Dovresti vedere:
- ✅ **Setup Wizard** di Wiki.js (se primo avvio)
- ✅ **Homepage Wiki** (se già configurato)

6. **Stop test:**
```bash
# Ctrl+C nella console
docker-compose stop wiki
```

**Checklist:**
- [ ] Immagine `ghcr.io/requarks/wiki:2` scaricata
- [ ] Container `webapptest-wiki` avviato senza errori
- [ ] Connessione database stabilita (log)
- [ ] Setup wizard visibile su `http://localhost:3002`
- [ ] Container fermato correttamente

---

## 🌐 FASE 3: CONFIGURAZIONE NGINX

### Step 3.1: Modifica nginx.conf.template

**Obiettivo**: Configurare reverse proxy per routing `/wiki`

**File**: `WebAppTEST/nginx.conf.template`

**Posizione modifica:**
Cerca la sezione `server { listen 80; ... }` e aggiungi **prima** di `location / { ... }`

**Codice da aggiungere:**

```nginx
    # ================================================
    # WIKI.JS PROXY
    # ================================================

    # Main wiki location
    location /wiki {
        # Rimuovi /wiki dal path passato a Wiki.js
        # rewrite ^/wiki(.*)$ $1 break;  # OPZIONE 1: Wiki.js in root
        # O mantieni /wiki nel path          # OPZIONE 2: Wiki.js config baseURL=/wiki

        proxy_pass http://wiki:3000;

        # Headers standard proxy
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Headers per client IP reale
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Headers per iframe embedding (permetti same-origin)
        proxy_hide_header X-Frame-Options;
        add_header X-Frame-Options "SAMEORIGIN" always;

        # Timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Wiki.js assets (CSS, JS, immagini)
    location /wiki/_assets {
        proxy_pass http://wiki:3000/_assets;

        # Cache statico per performance
        proxy_cache_valid 200 1d;
        proxy_cache_bypass $http_upgrade;

        # Headers caching
        add_header Cache-Control "public, max-age=86400";

        # Headers proxy standard
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Wiki.js uploads e altri file statici
    location /wiki/uploads {
        proxy_pass http://wiki:3000/uploads;

        # No cache per uploads (possono cambiare)
        proxy_cache_bypass 1;
        proxy_no_cache 1;

        # Headers proxy standard
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

**Configurazione alternativa con rewrite:**

Se Wiki.js non supporta bene il path `/wiki`, usa questa versione con rewrite:

```nginx
    location /wiki {
        rewrite ^/wiki(.*)$ $1 break;  # Rimuove /wiki dal path
        proxy_pass http://wiki:3000;

        # ... resto configurazione uguale ...
    }
```

In questo caso, dovrai configurare Wiki.js con `baseURL: http://localhost` nel setup wizard.

**Checklist:**
- [ ] Sezione `location /wiki` aggiunta
- [ ] Sezione `location /wiki/_assets` aggiunta
- [ ] Sezione `location /wiki/uploads` aggiunta
- [ ] `proxy_pass http://wiki:3000` corretto
- [ ] Headers X-Frame-Options configurati per embedding

---

### Step 3.2: Test Routing

**Obiettivo**: Verificare che nginx instradi correttamente a Wiki.js

**Procedura:**

1. **Avvia stack completo:**
```bash
cd C:\Users\marcoro\Projects\WebAppTEST
docker-compose up -d --build
```

2. **Verifica servizi running:**
```bash
docker-compose ps
```

Output atteso:
```
NAME                   STATUS    PORTS
webapptest-backend     Up        0.0.0.0:3001->3000/tcp, ...
webapptest-frontend    Up        0.0.0.0:5174->5174/tcp, ...
webapptest-nginx       Up        0.0.0.0:80->80/tcp, ...
webapptest-wiki        Up        0.0.0.0:3002->3000/tcp
```

3. **Test accesso diretto Wiki.js:**
```
Browser: http://localhost:3002
```
✅ Deve mostrare setup wizard o homepage wiki

4. **Test accesso via nginx:**
```
Browser: http://localhost/wiki
```
✅ Deve mostrare stessa pagina di prima

5. **Test routing assets:**
```
Browser DevTools > Network tab
Ricarica http://localhost/wiki
Verifica richieste a /wiki/_assets/...
```
✅ Status 200 su tutti gli assets

6. **Verifica log nginx:**
```bash
docker-compose logs nginx | grep wiki
```

Output atteso:
```
nginx: "GET /wiki HTTP/1.1" 200
nginx: "GET /wiki/_assets/css/app.123.css HTTP/1.1" 200
```

**Checklist:**
- [ ] Wiki.js raggiungibile su `http://localhost:3002`
- [ ] Wiki.js raggiungibile su `http://localhost/wiki`
- [ ] Assets caricano correttamente (no errori 404)
- [ ] Log nginx mostrano proxy a `wiki:3000`

**Troubleshooting:**

| Problema | Soluzione |
|----------|-----------|
| 502 Bad Gateway | Verifica che container wiki sia UP: `docker-compose ps wiki` |
| 404 su assets | Aggiungi `location /wiki/_assets` in nginx.conf |
| CSS non caricano | Verifica baseURL in setup wizard Wiki.js |
| Redirect loop | Rimuovi `rewrite` in nginx o cambia baseURL wiki |

---

## ⚙️ FASE 4: DEPLOY E SETUP WIKI.JS

### Step 4.1: Avvio Stack Completo

**Obiettivo**: Avviare tutti i servizi (backend, frontend, nginx, wiki)

**Procedura:**

1. **Stop eventuali container residui:**
```bash
cd C:\Users\marcoro\Projects\WebAppTEST
docker-compose down -v  # -v rimuove volumi anonimi
```

2. **Rebuild immagini (se modifiche a Dockerfile):**
```bash
docker-compose build --no-cache
```

3. **Start stack:**
```bash
docker-compose up -d
```

4. **Verifica health:**
```bash
docker-compose ps
docker-compose logs -f wiki
```

Attendi fino a vedere:
```
wiki | Browse to http://localhost:3000 for the setup wizard
```

5. **Verifica connessioni:**
```bash
# Backend
curl http://localhost:3001/api/health

# Frontend
curl http://localhost:5174

# Wiki diretto
curl http://localhost:3002

# Wiki via nginx
curl http://localhost/wiki
```

**Checklist:**
- [ ] Tutti container in stato UP
- [ ] Nessun errore nei log wiki
- [ ] Health check wiki passing (dopo 40s)
- [ ] Accesso `http://localhost/wiki` funzionante

---

### Step 4.2: Setup Wizard Wiki.js

**Obiettivo**: Completare configurazione iniziale Wiki.js

**Accesso wizard:**
```
Browser: http://localhost/wiki
O: http://localhost:3002
```

**Step wizard:**

1. **Welcome Screen**
   - Click "Get Started"

2. **Administrator Account**
   ```
   Email Address: admin@webapptest.local
   Password: [SCEGLI PASSWORD FORTE]
   Confirm Password: [RIPETI PASSWORD]
   ```
   - Click "Continue"

3. **Site Configuration**
   ```
   Site URL: http://localhost
   (In produzione: https://[server-aziendale])

   Site Title: WebAppTEST Wiki

   Telemetry: [OPZIONALE - disabilitare se non vuoi inviare dati anonimi]
   ```
   - Click "Continue"

4. **Database Configuration**
   ```
   Database Type: Microsoft SQL Server

   NOTA: Questi campi sono pre-compilati da variabili ambiente!
   Verifica che siano corretti:

   Host: host.docker.internal\ARCHASERVER
   Port: 1433
   Username: sa
   Password: ******** (nascosta)
   Database: WikiJS

   Trust Server Certificate: ✓ (checked)
   Encrypt Connection: ☐ (unchecked)
   ```
   - Click "Test Connection"
   - ✅ Deve mostrare: "Connection successful!"
   - Click "Continue"

5. **Upgrade / Fresh Install**
   ```
   Opzione: Install
   ```
   - Click "Install"
   - **Attendi 30-60 secondi** (creazione tabelle)

6. **Installation Complete**
   ```
   ✅ Database setup completed
   ✅ System initialization completed
   ```
   - Click "Go to your wiki"

7. **First Login**
   ```
   Email: admin@webapptest.local
   Password: [password scelta step 2]
   ```
   - Click "Login"

**Output atteso:**
- Homepage wiki vuota con messaggio "Welcome to your wiki"
- Sidebar a sinistra con menu
- Header in alto con pulsanti "Create" e "Admin"

**Checklist:**
- [ ] Setup wizard completato senza errori
- [ ] Test connessione database riuscito
- [ ] Installazione completata (tabelle create)
- [ ] Login admin funzionante
- [ ] Dashboard admin accessibile

**Verifica database:**

```sql
-- In SSMS, connesso a WikiJS database
USE [WikiJS]
GO

SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) AS [Columns]
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME
GO
```

Dovresti vedere ~20 tabelle create (users, pages, assets, etc.)

---

### Step 4.3: Configurazione Permessi

**Obiettivo**: Configurare accesso pubblico read-only

**Accesso Admin Area:**
```
1. Login come admin@webapptest.local
2. Click icona "Admin" in alto a destra
3. O naviga a: http://localhost/wiki/a
```

**Configurazione Authentication:**

1. **Navigate to: Admin > Authentication**
2. **Local Strategy**:
   ```
   Status: ✓ Enabled
   Self-Registration: ☐ Disabled  # IMPORTANTE!
   Allowed Email Domains: (vuoto)
   ```
   - Click "Apply"

3. **Disabilita altre strategie** (se presenti):
   - Azure AD: Disabled
   - Google: Disabled
   - GitHub: Disabled
   - Etc.

**Configurazione Groups:**

1. **Navigate to: Admin > Groups**

2. **Modifica gruppo "Guests" (built-in)**:
   - Click su "Guests"
   - **Permissions**:
     ```
     ☐ Read Pages       → ✓ Checked  # ABILITA LETTURA!
     ☐ Write Pages      → Unchecked
     ☐ Manage Pages     → Unchecked
     ☐ Delete Pages     → Unchecked
     ☐ Upload Assets    → Unchecked
     ☐ Manage Assets    → Unchecked
     ☐ View Source      → Unchecked  # O checked se vuoi mostrare markdown
     ☐ View Comments    → ✓ Checked  # Opzionale
     ☐ Add Comments     → Unchecked
     ☐ Manage Comments  → Unchecked
     ☐ Manage System    → Unchecked
     ```
   - **Page Rules**:
     ```
     Match: ALL PAGES
     Path: /
     Roles: read:pages
     Locales: All Locales
     ```
   - Click "Save"

3. **Verifica gruppo "Administrators"**:
   - Click su "Administrators"
   - **Permissions**: Tutte checked ✓
   - **Members**: admin@webapptest.local
   - Click "Save"

**Configurazione Site Settings:**

1. **Navigate to: Admin > General**
2. **Public Access**:
   ```
   Enable Public Access: ✓ Checked  # IMPORTANTE per accesso senza login!
   ```
3. **Host Settings**:
   ```
   Site URL: http://localhost (dev)
   Page Extensions: (default .html)
   ```
4. Click "Apply"

**Configurazione Security:**

1. **Navigate to: Admin > Security**
2. **Upload Security**:
   ```
   Maximum File Size: 10 MB (default)
   Allowed File Types: images, documents  # Restrittivo
   ```
3. Click "Apply"

**Checklist:**
- [ ] Self-registration disabilitato
- [ ] Guests group ha permission "read:pages"
- [ ] Public access abilitato
- [ ] Administrators group ha tutti i permessi
- [ ] Solo admin@webapptest.local in Administrators

---

### Step 4.4: Test Accesso Pubblico

**Obiettivo**: Verificare che utenti anonimi possano leggere senza login

**Procedura test:**

1. **Crea pagina di test come admin:**
   ```
   1. Login come admin
   2. Click "Create" in alto
   3. Select "Markdown" editor
   4. Path: /test
   5. Title: "Pagina di Test"
   6. Content:
      # Benvenuto nel Wiki

      Questa è una pagina di test per verificare l'accesso pubblico.

      - Punto 1
      - Punto 2
      - Punto 3
   7. Click "Create" (in alto a destra)
   ```

2. **Logout:**
   ```
   Click icona profilo > Logout
   ```

3. **Test accesso anonimo:**
   ```
   Browser (modalità incognito): http://localhost/wiki/test
   ```

   **Verifica:**
   - ✅ Vedi contenuto pagina "Pagina di Test"
   - ✅ NON vedi pulsante "Edit" (nascosto per guest)
   - ✅ NON vedi pulsante "Create"
   - ✅ NON viene richiesto login

4. **Test negazione editing:**
   ```
   Prova ad accedere manualmente: http://localhost/wiki/e/test
   ```

   **Verifica:**
   - ✅ Redirect a login page
   - ✅ Messaggio: "You must login to view this page"

5. **Test homepage:**
   ```
   Browser: http://localhost/wiki
   ```

   **Verifica:**
   - ✅ Vedi homepage wiki
   - ✅ Vedi link a "Pagina di Test" in sidebar/search
   - ✅ Click funziona

**Checklist:**
- [ ] Pagina test creata da admin
- [ ] Logout eseguito
- [ ] Accesso anonimo a `/wiki/test` funziona
- [ ] Contenuto visibile senza login
- [ ] Pulsanti edit/create nascosti
- [ ] Accesso a `/e/test` richiede login

**Configurazione completata! ✅**

Wiki.js è ora:
- ✅ Accessibile pubblicamente in lettura
- ✅ Protetto in scrittura (solo admin)
- ✅ Integrato con MSSQL
- ✅ Raggiungibile via nginx su `/wiki`

---

## ⚛️ FASE 5: INTEGRAZIONE FRONTEND

### Step 5.1: Creazione Componente WikiEmbed

**Obiettivo**: Creare componente React per mostrare wiki nella webapp

**File da creare/modificare:**

#### Opzione A: Componente Iframe Semplice

**File**: `frontend/src/components/wiki/WikiEmbed.jsx`

```jsx
import React, { useState, useEffect } from 'react';

/**
 * WikiEmbed Component
 *
 * Mostra Wiki.js in un iframe responsive all'interno della webapp
 *
 * Props:
 * - path: Percorso pagina wiki (default: "/")
 * - height: Altezza iframe (default: "calc(100vh - 100px)")
 * - showHeader: Mostra header wiki (default: true)
 */
const WikiEmbed = ({
  path = "/",
  height = "calc(100vh - 100px)",
  showHeader = true
}) => {
  const [iframeUrl, setIframeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Costruisci URL wiki
    const baseUrl = window.location.origin; // http://localhost
    const wikiPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${baseUrl}/wiki${wikiPath}`;

    setIframeUrl(fullUrl);
  }, [path]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Impossibile caricare il wiki. Verifica che il servizio sia attivo.');
  };

  return (
    <div className="wiki-embed-container" style={{
      width: '100%',
      height: height,
      position: 'relative',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div className="spinner">Caricamento wiki...</div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#ef4444'
        }}>
          <p>{error}</p>
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'underline' }}
          >
            Apri wiki in nuova finestra
          </a>
        </div>
      )}

      {/* Iframe */}
      {iframeUrl && (
        <iframe
          src={iframeUrl}
          title="Wiki.js"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: isLoading || error ? 'none' : 'block'
          }}
          onLoad={handleLoad}
          onError={handleError}
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      )}
    </div>
  );
};

export default WikiEmbed;
```

**Uso del componente:**

```jsx
// In qualsiasi pagina React
import WikiEmbed from '@/components/wiki/WikiEmbed';

function DocumentationPage() {
  return (
    <div>
      <h1>Documentazione</h1>
      <WikiEmbed path="/test" />
    </div>
  );
}
```

#### Opzione B: Componente Avanzato con Controlli

**File**: `frontend/src/components/wiki/WikiViewer.jsx`

```jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button'; // Usa i tuoi componenti UI esistenti

/**
 * WikiViewer Component
 *
 * Visualizzatore wiki avanzato con controlli navigazione
 */
const WikiViewer = ({ initialPath = "/" }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const wikiBaseUrl = `${window.location.origin}/wiki`;

  const handleOpenInNewTab = () => {
    window.open(`${wikiBaseUrl}${currentPath}`, '_blank');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const containerStyle = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'white'
  } : {};

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <Button
          onClick={handleOpenInNewTab}
          variant="outline"
          size="sm"
        >
          🔗 Apri in nuova finestra
        </Button>

        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="sm"
        >
          {isFullscreen ? '⊟ Esci da fullscreen' : '⛶ Fullscreen'}
        </Button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: '14px', color: '#6b7280', alignSelf: 'center' }}>
          {currentPath}
        </span>
      </div>

      {/* Wiki iframe */}
      <iframe
        src={`${wikiBaseUrl}${currentPath}`}
        title="Wiki.js"
        style={{
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 50px)' : 'calc(100vh - 200px)',
          border: 'none'
        }}
        allow="fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
};

export default WikiViewer;
```

**Checklist:**
- [ ] File `WikiEmbed.jsx` o `WikiViewer.jsx` creato
- [ ] Componente importabile senza errori
- [ ] Stili responsive
- [ ] Gestione loading e errori

---

### Step 5.2: Modifica Routing React

**Obiettivo**: Aggiungere route `/documentation` nella webapp

**File**: `frontend/src/App.jsx`

**Modifiche:**

1. **Import componente:**
```jsx
import WikiEmbed from './components/wiki/WikiEmbed';
// O: import WikiViewer from './components/wiki/WikiViewer';
```

2. **Aggiungi route:**

Cerca la sezione con `<Routes>` e aggiungi:

```jsx
<Routes>
  {/* Route esistenti */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<UserRegistration />} />
  <Route path="/standalone-chat/:id" element={<StandaloneChat />} />

  {/* NUOVA ROUTE - Wiki */}
  <Route
    path="/documentation"
    element={
      <ProtectedRoute>
        <div style={{ padding: '20px' }}>
          <h1 style={{ marginBottom: '20px' }}>📚 Documentazione</h1>
          <WikiEmbed />
        </div>
      </ProtectedRoute>
    }
  />

  {/* Route principale */}
  <Route path="/*" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
</Routes>
```

**Opzione alternativa - Wiki in MainPage:**

Se preferisci integrare il wiki nella struttura esistente di MainPage:

**File**: `frontend/src/components/MainPage/MainPage.jsx` (o simile)

Aggiungi nel menu/sidebar:

```jsx
// Nel menu di navigazione
<MenuItem
  icon={<BookOpenIcon />}
  label="Documentazione"
  onClick={() => navigate('/documentation')}
/>

// O aggiungi tab/sezione dedicata
<TabPanel value="documentation">
  <WikiEmbed path="/" />
</TabPanel>
```

**Checklist:**
- [ ] Route `/documentation` aggiunta
- [ ] Componente WikiEmbed integrato
- [ ] Navigazione funzionante
- [ ] ProtectedRoute applicato (opzionale)

---

### Step 5.3: Test Integrazione

**Obiettivo**: Verificare funzionamento completo integrazione

**Procedura test:**

1. **Rebuild frontend:**
```bash
cd C:\Users\marcoro\Projects\WebAppTEST
docker-compose restart frontend
```

2. **Verifica compilazione:**
```bash
docker-compose logs frontend | grep -i error
```
✅ Nessun errore di compilazione

3. **Test navigazione:**
```
Browser: http://localhost
Login con utente webapp
Naviga a: /documentation
```

**Verifiche:**
- [ ] Route `/documentation` carica senza errori
- [ ] Iframe wiki visibile
- [ ] Contenuto wiki caricato (pagina test visibile)
- [ ] Responsive (prova resize finestra)
- [ ] Scroll funzionante
- [ ] Link interni wiki funzionanti

4. **Test interazione:**
- [ ] Click su link wiki → naviga a pagina corretta
- [ ] Search wiki funzionante
- [ ] Pulsante "Apri in nuova finestra" funziona (se presente)
- [ ] Fullscreen funziona (se presente)

5. **Test su dispositivi:**
- [ ] Desktop: layout corretto
- [ ] Tablet: iframe responsive
- [ ] Mobile: scroll verticale funzionante

**Troubleshooting:**

| Problema | Soluzione |
|----------|-----------|
| Iframe vuoto | Verifica URL costruito correttamente in console browser |
| Errore CORS | Aggiungi header `X-Frame-Options` in nginx.conf |
| Wiki non carica | Verifica che servizio wiki sia UP: `docker-compose ps wiki` |
| Link wiki rotti | Verifica baseURL in Wiki.js admin settings |

---

## 🌍 FASE 6: PREPARAZIONE PRODUZIONE

### Step 6.1: Analisi Configurazioni Server

**Obiettivo**: Esaminare file configurazione server produzione

**File da analizzare** (in `ContestoServer/`):

1. **docker-compose.prod.yml** (se esiste)
2. **.env.production**
3. **nginx.conf.prod**
4. Altri file di deployment

**Procedura:**

```bash
# Lista file ContestoServer/
cd C:\Users\marcoro\Projects\WebAppTEST\ContestoServer
dir
```

**Informazioni da estrarre:**

- [ ] Nome/IP SQL Server produzione
- [ ] Porta SQL Server (default 1433)
- [ ] Database WebAppTEST name
- [ ] User SQL (sa o dedicato?)
- [ ] Metodo autenticazione (SQL o Windows)
- [ ] Nome servizi Docker in prod
- [ ] Porte esposte in prod
- [ ] Network configuration
- [ ] Volume mounts
- [ ] SSL certificates location
- [ ] Domain/hostname produzione

**Documento differenze dev/prod:**

Crea file `DIFF_DEV_PROD.md`:

```markdown
# Differenze Dev / Produzione

## Database
| Parametro | Dev | Prod |
|-----------|-----|------|
| Server | localhost\ARCHASERVER | [DA COMPILARE] |
| User | sa | [DA COMPILARE] |
| Password | Kacu938861 | [DA COMPILARE] |

## Network
| Parametro | Dev | Prod |
|-----------|-----|------|
| Domain | localhost | [DA COMPILARE] |
| Protocol | HTTP (80) | HTTPS (443) |

## Volumi
| Parametro | Dev | Prod |
|-----------|-----|------|
| Uploads | C:\TestShare\... | [DA COMPILARE] |
```

**Checklist:**
- [ ] Tutti file `ContestoServer/` analizzati
- [ ] Connection string prod identificato
- [ ] Differenze documentate
- [ ] Credenziali prod disponibili (o da richiedere)

---

### Step 6.2: Adattamento File Configurazione

**Obiettivo**: Creare file configurazione per deploy produzione

**File da creare:**

#### 1. `docker-compose.prod.yml`

Basato su `docker-compose.yml` con modifiche:

```yaml
# DIFFERENZE DA APPLICARE:

services:
  wiki:
    image: ghcr.io/requarks/wiki:2
    container_name: webapptest-wiki-prod  # Nome diverso

    ports:
      # NO porta esposta in prod (solo via nginx)
      # - "3002:3000"  # COMMENTATO

    environment:
      DB_HOST: ${PROD_DB_SERVER}  # Server produzione
      DB_USER: ${PROD_WIKI_DB_USER}
      DB_PASS: ${PROD_WIKI_DB_PASS}
      DB_NAME: WikiJS

      # SSL gestito da nginx/reverse proxy esterno
      SSL_ACTIVE: "false"

      # Opzionale: HA se più repliche
      # HA_ACTIVE: "true"

    # Restart policy produzione
    restart: always

    # Volumi persistenti
    volumes:
      - wiki-data-prod:/wiki/data
      - wiki-config-prod:/wiki/config

volumes:
  wiki-data-prod:
    driver: local
  wiki-config-prod:
    driver: local
```

#### 2. `.env.production`

```bash
# SQL Server Produzione
PROD_DB_SERVER=[NOME_SERVER_PROD]
PROD_WIKI_DB_USER=[USER_PROD]
PROD_WIKI_DB_PASS=[PASSWORD_PROD]

# Domain produzione
PROD_DOMAIN=[server-aziendale.local]
PROD_PROTOCOL=https
```

#### 3. `nginx.conf.prod`

Modifica basata su `nginx.conf.template`:

```nginx
# AGGIUNGI sezioni wiki (uguale a dev)
location /wiki { ... }
location /wiki/_assets { ... }

# SE necessario, aggiungi SSL configuration
server {
    listen 443 ssl http2;
    server_name [server-aziendale.local];

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... location /wiki ...
}
```

**Checklist:**
- [ ] `docker-compose.prod.yml` creato
- [ ] `.env.production` creato
- [ ] `nginx.conf.prod` aggiornato
- [ ] Variabili ${...} referenziano .env.production

---

### Step 6.3: Documentazione Deploy

**Obiettivo**: Creare guida passo-passo per deploy produzione

**File da creare**: `DEPLOY_PRODUCTION.md`

```markdown
# Deployment Wiki.js in Produzione

## Pre-requisiti

- [ ] Accesso SSH/RDP al server produzione
- [ ] Docker e Docker Compose installati
- [ ] Accesso SQL Server produzione (SSMS o Azure Data Studio)
- [ ] Credenziali database produzione
- [ ] Backup database WebAppTEST esistente

## Step 1: Preparazione Database

1. **Connetti a SQL Server produzione**
2. **Esegui script**:
   ```
   Scripts/01_create_wikijs_database.sql
   Scripts/02_create_wikijs_user.sql (se usi utente dedicato)
   ```
3. **Verifica creazione**:
   ```sql
   SELECT name FROM sys.databases WHERE name = 'WikiJS'
   ```

## Step 2: Upload File

1. **Copia file su server**:
   ```
   docker-compose.prod.yml → /opt/webapptest/
   .env.production → /opt/webapptest/.env
   nginx.conf.prod → /opt/webapptest/nginx.conf
   ```

2. **Verifica permessi**:
   ```bash
   chmod 600 .env
   chmod 644 docker-compose.prod.yml nginx.conf
   ```

## Step 3: Deploy Servizio Wiki

1. **Pull immagine**:
   ```bash
   docker pull ghcr.io/requarks/wiki:2
   ```

2. **Start servizio**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d wiki
   ```

3. **Verifica log**:
   ```bash
   docker-compose logs -f wiki
   ```
   Attendi: "Browse to http://localhost:3000"

4. **Test connessione DB**:
   ```bash
   docker exec -it webapptest-wiki-prod /bin/sh
   # Dentro container
   nc -zv [PROD_DB_SERVER] 1433
   ```

## Step 4: Setup Wizard

1. **Accedi via tunnel SSH** (se necessario):
   ```bash
   ssh -L 3002:localhost:3000 user@server-prod
   ```

2. **Apri browser locale**:
   ```
   http://localhost:3002
   ```

3. **Completa wizard**:
   - Admin email: admin@[azienda].com
   - Site URL: https://[server-aziendale]
   - Database: (pre-configurato da env vars)

4. **Configura permessi** (vedi Fase 4 Step 4.3)

## Step 5: Migrazione Contenuti (se da dev)

### Opzione A: Export/Import

1. **Da dev**:
   ```
   Admin > Utilities > Export
   Scarica backup.tar.gz
   ```

2. **Upload su prod**:
   ```bash
   scp backup.tar.gz user@server-prod:/tmp/
   ```

3. **Su prod**:
   ```
   Admin > Utilities > Import
   Upload backup.tar.gz
   ```

### Opzione B: Database Backup/Restore

```sql
-- Dev: Backup
BACKUP DATABASE [WikiJS]
TO DISK = 'C:\Backup\WikiJS_dev.bak'

-- Prod: Restore
RESTORE DATABASE [WikiJS]
FROM DISK = '\\server\backup\WikiJS_dev.bak'
WITH REPLACE
```

## Step 6: Test Funzionale

- [ ] Accesso: https://[server-prod]/wiki
- [ ] Homepage carica
- [ ] Pagine visibili senza login
- [ ] Admin login funziona
- [ ] Creazione pagina funziona
- [ ] Upload immagine funziona
- [ ] Search funziona

## Step 7: Backup Automatico

```bash
# Cron job per backup giornaliero
0 2 * * * /usr/local/bin/backup-wikijs.sh
```

**File**: `/usr/local/bin/backup-wikijs.sh`
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup/wikijs"

# Backup database
/opt/mssql-tools/bin/sqlcmd -S [SERVER] -U [USER] -P [PASS] -Q \
  "BACKUP DATABASE [WikiJS] TO DISK = '$BACKUP_DIR/WikiJS_$DATE.bak'"

# Retention 30 giorni
find $BACKUP_DIR -name "WikiJS_*.bak" -mtime +30 -delete
```

## Rollback

In caso di problemi:

```bash
# Stop servizio wiki
docker-compose stop wiki

# Restore DB backup pre-deploy
RESTORE DATABASE [WikiJS] FROM DISK = '[BACKUP_PATH]'

# Restart
docker-compose up -d wiki
```
```

**Checklist:**
- [ ] File `DEPLOY_PRODUCTION.md` creato
- [ ] Step deployment documentati
- [ ] Comandi testati in dev
- [ ] Procedura rollback definita

---

### Step 6.4: Script Migrazione Contenuti

**Obiettivo**: Automatizzare export/import contenuti tra ambienti

**File da creare**: `scripts/migrate-wiki-content.sh` (Bash) o `.ps1` (PowerShell)

#### PowerShell Version (Windows)

**File**: `Scripts/migrate-wiki-content.ps1`

```powershell
<#
.SYNOPSIS
    Migra contenuti Wiki.js da dev a produzione

.DESCRIPTION
    Script per automatizzare export da dev e import su prod

.PARAMETER Mode
    "export" o "import"

.EXAMPLE
    .\migrate-wiki-content.ps1 -Mode export
    .\migrate-wiki-content.ps1 -Mode import
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("export","import")]
    [string]$Mode,

    [string]$BackupFile = "wikijs-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
)

$ErrorActionPreference = "Stop"

# Configurazione
$DEV_URL = "http://localhost:3002"
$PROD_URL = "https://server-prod/wiki"
$BACKUP_DIR = ".\backups"

# Crea directory backup se non esiste
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

if ($Mode -eq "export") {
    Write-Host "=== EXPORT CONTENUTI DA DEV ===" -ForegroundColor Green

    Write-Host "1. Apri browser: $DEV_URL/a/utilities"
    Write-Host "2. Sezione 'Export'"
    Write-Host "3. Click 'Start Export'"
    Write-Host "4. Salva file in: $BACKUP_DIR\$BackupFile"
    Write-Host ""
    Write-Host "Premi INVIO quando export completato..."
    Read-Host

    $exportedFile = Get-ChildItem $BACKUP_DIR | Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($exportedFile) {
        Write-Host "File export trovato: $($exportedFile.FullName)" -ForegroundColor Green
        Write-Host "Dimensione: $([math]::Round($exportedFile.Length/1MB, 2)) MB"
    } else {
        Write-Host "ATTENZIONE: Nessun file trovato in $BACKUP_DIR" -ForegroundColor Yellow
    }

} elseif ($Mode -eq "import") {
    Write-Host "=== IMPORT CONTENUTI SU PROD ===" -ForegroundColor Green

    $latestBackup = Get-ChildItem $BACKUP_DIR\*.tar.gz | Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if (!$latestBackup) {
        Write-Error "Nessun file backup trovato in $BACKUP_DIR"
        exit 1
    }

    Write-Host "File backup: $($latestBackup.Name)" -ForegroundColor Cyan
    Write-Host "Dimensione: $([math]::Round($latestBackup.Length/1MB, 2)) MB"
    Write-Host ""
    Write-Host "1. Apri browser: $PROD_URL/a/utilities"
    Write-Host "2. Sezione 'Import'"
    Write-Host "3. Upload file: $($latestBackup.FullName)"
    Write-Host "4. Click 'Start Import'"
    Write-Host ""
    Write-Host "Premi INVIO quando import completato..."
    Read-Host

    Write-Host "Import completato!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== OPERAZIONE COMPLETATA ===" -ForegroundColor Green
```

**Uso:**
```powershell
# Da dev: export contenuti
.\Scripts\migrate-wiki-content.ps1 -Mode export

# Su prod: import contenuti
.\Scripts\migrate-wiki-content.ps1 -Mode import
```

**Checklist:**
- [ ] Script `migrate-wiki-content.ps1` creato
- [ ] Directory `backups/` creata
- [ ] Testato export in dev
- [ ] Documentato in `DEPLOY_PRODUCTION.md`

---

## ✅ FASE 7: TESTING E VALIDAZIONE

### Step 7.1: Test Funzionali

**Obiettivo**: Verificare tutte le funzionalità principali

**Test Suite:**

#### 1. Accesso e Autenticazione

```markdown
TEST: Accesso pubblico
- [ ] URL: http://localhost/wiki
- [ ] Risultato: Homepage visibile senza login
- [ ] Tempo caricamento: < 2s

TEST: Login admin
- [ ] URL: http://localhost/wiki/login
- [ ] Credenziali: admin@webapptest.local / [password]
- [ ] Risultato: Dashboard admin accessibile
- [ ] Session persistente dopo refresh

TEST: Logout
- [ ] Click "Logout"
- [ ] Risultato: Redirect a homepage, admin UI nascosto
```

#### 2. CRUD Pagine

```markdown
TEST: Creazione pagina
- [ ] Login come admin
- [ ] Click "Create" → Path: /test-crud
- [ ] Editor: Markdown
- [ ] Content: "Test content"
- [ ] Click "Create"
- [ ] Risultato: Pagina creata, redirect a /test-crud

TEST: Lettura pagina
- [ ] Logout
- [ ] URL: http://localhost/wiki/test-crud
- [ ] Risultato: Contenuto visibile, no pulsanti edit

TEST: Modifica pagina
- [ ] Login come admin
- [ ] Naviga a /test-crud
- [ ] Click "Edit"
- [ ] Modifica content: "Test content UPDATED"
- [ ] Click "Save"
- [ ] Risultato: Modifiche salvate e visibili

TEST: Eliminazione pagina
- [ ] Nella pagina /test-crud
- [ ] Click "Delete"
- [ ] Conferma
- [ ] Risultato: Pagina eliminata, redirect a home
```

#### 3. Upload e Media

```markdown
TEST: Upload immagine
- [ ] Login come admin
- [ ] Create nuova pagina /test-media
- [ ] In editor: Click "Insert Image"
- [ ] Upload file: test.png (< 5MB)
- [ ] Risultato: Immagine caricata e preview visibile
- [ ] Save pagina

TEST: Visualizzazione immagine
- [ ] Logout
- [ ] Naviga a /test-media
- [ ] Risultato: Immagine caricata correttamente
- [ ] Verifica URL: /wiki/uploads/... o /_assets/...

TEST: Dimensioni file
- [ ] Login admin
- [ ] Prova upload file > 10MB
- [ ] Risultato: Errore "File too large" (se limite configurato)
```

#### 4. Search e Navigazione

```markdown
TEST: Search
- [ ] Crea 3 pagine con keywords diverse
- [ ] Usa search bar: cerca "keyword1"
- [ ] Risultato: Pagina con keyword1 nei risultati
- [ ] Click risultato → naviga a pagina corretta

TEST: Navigation menu
- [ ] Admin > Navigation
- [ ] Aggiungi item menu: "Documentazione" → /docs
- [ ] Save
- [ ] Logout
- [ ] Risultato: Menu item visibile in sidebar
- [ ] Click → naviga a /docs
```

#### 5. Integrazione Frontend

```markdown
TEST: Iframe embedding
- [ ] Login webapp: http://localhost
- [ ] Naviga a /documentation
- [ ] Risultato: WikiEmbed component carica
- [ ] Iframe mostra wiki homepage
- [ ] Responsive: resize finestra → iframe si adatta

TEST: Link interni wiki
- [ ] In iframe, click link wiki interno
- [ ] Risultato: Navigazione dentro iframe (no nuova tab)
- [ ] URL webapp rimane /documentation

TEST: Link esterni
- [ ] In wiki, aggiungi link esterno: https://google.com
- [ ] Click link
- [ ] Risultato: Apre nuova tab (target="_blank")
```

**Checklist Test Funzionali:**
- [ ] Accesso pubblico: ✅ OK
- [ ] Login admin: ✅ OK
- [ ] Creazione pagine: ✅ OK
- [ ] Upload immagini: ✅ OK
- [ ] Search: ✅ OK
- [ ] Integrazione iframe: ✅ OK

---

### Step 7.2: Test Performance

**Obiettivo**: Verificare performance e tempi di risposta

**Metriche da misurare:**

#### 1. Tempo Caricamento Pagine

```bash
# Tool: curl con timing
curl -o /dev/null -s -w "Time: %{time_total}s\n" http://localhost/wiki

# Target: < 2s
```

```markdown
TEST: Homepage
- [ ] URL: http://localhost/wiki
- [ ] Tempo: ____s (target < 2s)
- [ ] DOMContentLoaded: ____s
- [ ] Fully Loaded: ____s

TEST: Pagina con immagini
- [ ] URL: http://localhost/wiki/test-media
- [ ] Tempo: ____s (target < 3s)
- [ ] Immagini caricate: ✅ / ❌

TEST: Pagina lunga (>5000 parole)
- [ ] URL: http://localhost/wiki/long-page
- [ ] Tempo: ____s
- [ ] Scroll smooth: ✅ / ❌
```

#### 2. Database Performance

```sql
-- Query performance monitoring
USE [WikiJS]
GO

-- Dimensione database
EXEC sp_spaceused

-- Tabelle più grandi
SELECT
    t.NAME AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 AS TotalSpaceKB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
GROUP BY t.Name, p.Rows
ORDER BY TotalSpaceKB DESC

-- Query lente (se logging abilitato)
SELECT TOP 10
    qs.execution_count,
    qs.total_elapsed_time / 1000000.0 AS total_elapsed_time_s,
    qs.total_worker_time / 1000000.0 AS total_worker_time_s,
    SUBSTRING(qt.TEXT, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.TEXT)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2)+1) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
WHERE qt.TEXT LIKE '%WikiJS%'
ORDER BY qs.total_elapsed_time DESC
```

**Checklist Performance:**
- [ ] Homepage < 2s: ✅ / ❌
- [ ] Pagine immagini < 3s: ✅ / ❌
- [ ] Database size ragionevole (< 100MB per 100 pagine): ✅ / ❌
- [ ] No query lente (> 5s): ✅ / ❌

#### 3. Resource Usage (Docker)

```bash
# Monitor risorse container wiki
docker stats webapptest-wiki --no-stream

# Target:
# CPU: < 10% idle, < 50% under load
# Memory: < 500MB idle, < 1GB under load
```

**Checklist Risorse:**
- [ ] CPU idle: ___% (target < 10%)
- [ ] Memory idle: ___MB (target < 500MB)
- [ ] CPU under load: ___% (target < 50%)
- [ ] Memory under load: ___MB (target < 1GB)

---

### Step 7.3: Verifica Sicurezza

**Obiettivo**: Testare configurazioni sicurezza

**Test Suite Sicurezza:**

#### 1. Autenticazione e Autorizzazione

```markdown
TEST: Accesso non autorizzato a editor
- [ ] Logout (modalità guest)
- [ ] URL: http://localhost/wiki/e/test
- [ ] Risultato: ❌ Redirect a login (403 o redirect)
- [ ] NO accesso editor

TEST: Self-registration disabilitata
- [ ] URL: http://localhost/wiki/register
- [ ] Risultato: ❌ Pagina non trovata o disabled

TEST: Admin-only areas
- [ ] Logout
- [ ] URL: http://localhost/wiki/a (admin area)
- [ ] Risultato: ❌ Redirect a login
- [ ] Login admin → ✅ Accesso concesso
```

#### 2. Upload Security

```markdown
TEST: Upload file type restriction
- [ ] Login admin
- [ ] Prova upload: script.exe
- [ ] Risultato: ❌ File type not allowed

TEST: File size limit
- [ ] Upload file > 10MB
- [ ] Risultato: ❌ File too large error

TEST: Path traversal
- [ ] Prova upload filename: ../../evil.txt
- [ ] Risultato: ❌ Filename sanitized
```

#### 3. Headers Security

```bash
# Verifica headers HTTP
curl -I http://localhost/wiki

# Headers richiesti:
# X-Frame-Options: SAMEORIGIN (per iframe sicuro)
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

```markdown
TEST: X-Frame-Options
- [ ] Header presente: ✅ / ❌
- [ ] Valore: SAMEORIGIN o DENY

TEST: Iframe embedding limitato
- [ ] Prova embed wiki in dominio esterno (mockup HTML)
- [ ] Risultato: ❌ Blocked by X-Frame-Options

TEST: HTTPS redirect (solo prod)
- [ ] URL: http://[server-prod]/wiki
- [ ] Risultato: ✅ Redirect a https://
```

#### 4. Database Security

```sql
-- Verifica permessi user wikijs_user
USE [WikiJS]
GO

EXECUTE AS USER = 'wikijs_user'
GO

-- Dovrebbe avere accesso a WikiJS
SELECT COUNT(*) FROM pages  -- ✅ OK

-- NON dovrebbe avere accesso a WebAppTEST
USE [WebAppTEST]
GO
SELECT COUNT(*) FROM AR_Users  -- ❌ Dovrebbe dare errore

REVERT
GO
```

**Checklist Sicurezza:**
- [ ] Guest non può editare: ✅
- [ ] Self-registration disabled: ✅
- [ ] Upload file type restricted: ✅
- [ ] X-Frame-Options: SAMEORIGIN: ✅
- [ ] Database permissions isolati: ✅

---

## 📋 CHECKLIST FINALE

### Ambiente DEV

- [ ] Database WikiJS creato in MSSQL locale
- [ ] Servizio wiki in docker-compose.yml
- [ ] Nginx routing /wiki configurato
- [ ] Setup wizard completato
- [ ] Permessi guest (read-only) configurati
- [ ] Admin account creato
- [ ] Componente WikiEmbed/WikiViewer integrato
- [ ] Route /documentation funzionante
- [ ] Test funzionali: ✅ tutti passati
- [ ] Test performance: ✅ tempi accettabili
- [ ] Test sicurezza: ✅ configurazioni corrette

### Ambiente PROD (da completare)

- [ ] File ContestoServer/ analizzati
- [ ] Connection string prod identificato
- [ ] docker-compose.prod.yml creato
- [ ] .env.production creato
- [ ] nginx.conf.prod aggiornato
- [ ] DEPLOY_PRODUCTION.md documentato
- [ ] Script migrazione contenuti testato
- [ ] Database WikiJS creato in SQL Server prod
- [ ] Deploy servizio wiki
- [ ] Setup wizard prod completato
- [ ] Migrazione contenuti da dev
- [ ] Test funzionali prod: ✅
- [ ] Backup automatico configurato
- [ ] Monitoraggio attivato

---

## 🎉 COMPLETAMENTO PROGETTO

Una volta completate tutte le fasi, il sistema sarà:

✅ **Funzionale**:
- Wiki.js accessibile su `/wiki`
- Contenuti pubblici read-only
- Admin può editare
- Integrato nella webapp React

✅ **Performante**:
- Caricamento pagine < 2s
- Database ottimizzato
- Cache configurata

✅ **Sicuro**:
- Autenticazione robusta
- Permessi granulari
- Upload protetti
- Database isolato

✅ **Deployabile**:
- Configurazioni prod pronte
- Script migrazione testati
- Documentazione completa
- Backup configurato

---

**Fine Piano Implementazione**

Per domande o supporto, consulta:
- Contesto: `WIKI_INTEGRATION_CONTEXT.md`
- Questo piano: `WIKI_INTEGRATION_PLAN.md`
- Documentazione Wiki.js: https://docs.requarks.io/
