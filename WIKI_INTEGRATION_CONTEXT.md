# 📚 WIKI.JS INTEGRATION - CONTESTO COMPLETO

> **Data creazione**: 2025-10-23
> **Versione**: 1.0
> **Scopo**: Documento di contesto per integrazione Wiki.js in WebAppTEST

---

## 🎯 OBIETTIVO DEL PROGETTO

Integrare **Wiki.js** nella WebAppTEST esistente per fornire:
- Documentazione tecnica e manuali utente
- Knowledge base aziendale accessibile
- Sistema di gestione contenuti documentali

### Requisiti Funzionali

1. **Database**: Utilizzare MSSQL esistente con database separato `WikiJS`
2. **Autenticazione**:
   - Admin: Accesso completo per editing
   - Utenti: Accesso pubblico in sola lettura (nessun login richiesto)
3. **Multi-azienda**: NON gestito nel wiki (gestito solo dalla webapp principale)
4. **Networking**: Nessuna configurazione aggiuntiva, usare infrastruttura esistente
5. **Deploy**: Funzionare sia in dev locale che in server produzione aziendale

---

## 🏗️ ARCHITETTURA WEBAPPTEST ESISTENTE

### Struttura Generale

```
WebAppTEST/
├── backend/                    # Node.js Express API (porta 3001 HTTP, 3443 HTTPS)
├── frontend/                   # React 18 + Vite (porta 5174 HTTP, 5173 HTTPS)
├── database/                   # Script SQL MSSQL
├── docker-compose.yml          # Orchestrazione Docker
├── nginx.conf.template         # Reverse proxy (porta 80 HTTP, 443 HTTPS)
└── .env                        # Variabili ambiente
```

### Servizi Docker Attuali

| Servizio | Immagine | Porte | Scopo |
|----------|----------|-------|-------|
| **backend** | Node 22-alpine | 3001:3000 (HTTP)<br>3443:3443 (HTTPS) | API Express.js |
| **frontend** | Node 22-alpine | 5174:5174 (HTTP)<br>5173:5173 (HTTPS) | React Vite dev server |
| **nginx** | nginx:1.25-alpine | 80:80 (HTTP)<br>443:443 (HTTPS) | Reverse proxy |

**Network**: Bridge `app-network-dev`

### Database MSSQL

**Ambiente Dev Locale:**
```
Server: host.docker.internal\ARCHASERVER
Port: 1433
User: sa
Password: Kacu938861
Database: WebAppTEST
```

**Ambiente Produzione:**
```
Server: [DA CONFIGURARE - vedi ContestoServer/]
Port: 1433
User: [DA CONFIGURARE]
Password: [DA CONFIGURARE]
Database: WebAppTEST
```

### Tabelle Principali Database WebAppTEST

- `AR_Users` - Utenti con password bcrypt
- `AR_Companies` - Aziende multi-tenant
- `AR_CompaniesUsers` - Associazioni utente-azienda
- `AR_Groups` - Gruppi permessi
- `AR_GroupMembers` - Membri gruppi
- `AR_Pages` - Pagine navigazione
- `AR_GroupPages` - Permessi accesso pagine

### Autenticazione Esistente

**Metodo**: JWT (jsonwebtoken)
- Secret: `cDb!Yu6wU!2`
- Expiration: Configurabile per utente (default 8h)
- Token payload: `{UserId, username, role, CompanyId}`
- Middleware: `authenticateToken.js`

**Endpoints:**
- `POST /api/login` - Autenticazione
- `POST /api/refresh-token` - Rinnovo token
- `POST /api/logout` - Logout

### Frontend React

**Stack:**
- React 18.3
- Vite 5.4
- React Router
- Redux Toolkit
- Axios
- Material-UI + Radix UI + Tailwind CSS

**Routing:**
```
/login              → Login component
/register           → User registration
/standalone-chat/:id → Chat window
/*                  → MainPage (protected)
  ├── AuthProvider
  ├── CompanyProvider
  └── UserSettingsProvider
```

**Componenti Wiki Esistenti:**
- `src/components/wiki/` - Componenti wiki già presenti
- `src/context/WikiProvider.jsx` - Context provider wiki

### Nginx Routing Attuale

```nginx
location /api {
    proxy_pass http://backend:3000;
}

location / {
    proxy_pass http://frontend:5173;
}
```

---

## 📋 SOLUZIONE SCELTA: WIKI.JS CON MSSQL

### Decisioni Architetturali

| Aspetto | Decisione | Motivazione |
|---------|-----------|-------------|
| **Database** | MSSQL separato (`WikiJS`) | Consistenza dev/prod, backup centralizzato |
| **Autenticazione** | Local Strategy + Public Access | Semplicità, admin edita, utenti leggono |
| **Networking** | Servizio Docker in rete esistente | Nessuna config aggiuntiva |
| **Porta** | 3002:3000 | Evita conflitto con backend (3001) |
| **Accesso** | `http://localhost/wiki` via nginx | Routing unificato |
| **Multi-tenant** | NON implementato | Gestito solo da webapp principale |

### Architettura Finale

```
┌─────────────────────────────────────────────────────────────┐
│  USER BROWSER                                               │
│  http://localhost  o  https://server-aziendale              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   NGINX (80/443)       │
        │  Reverse Proxy         │
        └─┬──────────┬───────────┘
          │          │
   /api   │          │  /wiki          /
          │          │                 │
          ▼          ▼                 ▼
    ┌─────────┐  ┌─────────┐    ┌──────────┐
    │ Backend │  │ Wiki.js │    │ Frontend │
    │ :3001   │  │ :3002   │    │ :5174    │
    └────┬────┘  └────┬────┘    └──────────┘
         │            │
         │            │
         ▼            ▼
    ┌────────────────────────┐
    │   MSSQL SERVER         │
    │  ├─ WebAppTEST (DB)    │
    │  └─ WikiJS (DB)        │ ← NUOVO
    └────────────────────────┘
```

### Database WikiJS - Struttura Tabelle

Wiki.js creerà automaticamente ~20 tabelle con prefisso standard:

**Tabelle principali:**
- `analytics` - Analytics e statistiche
- `assetData` - Dati asset caricati
- `assetFolders` - Struttura cartelle asset
- `assets` - File e immagini
- `authentication` - Configurazioni autenticazione
- `comments` - Sistema commenti
- `groups` - Gruppi utenti wiki
- `locales` - Lingue disponibili
- `navigation` - Menu navigazione
- `pageHistory` - Storico versioni pagine
- `pageLinks` - Collegamenti tra pagine
- `pages` - Contenuti pagine wiki
- `settings` - Configurazioni sistema
- `storage` - Configurazioni storage
- `tags` - Tag pagine
- `userGroups` - Associazioni utente-gruppo
- `users` - Utenti wiki

**Importante**: Queste tabelle sono **completamente isolate** dal database `WebAppTEST`.

---

## 🔧 CONFIGURAZIONE WIKI.JS

### Variabili Ambiente Docker

```yaml
environment:
  # Database MSSQL
  DB_TYPE: mssql
  DB_HOST: host.docker.internal\ARCHASERVER  # Dev locale
  DB_PORT: 1433
  DB_USER: sa
  DB_PASS: Kacu938861
  DB_NAME: WikiJS
  DB_SSL: false

  # No HTTPS interno (gestito da nginx)
  SSL_ACTIVE: false

  # No High-Availability in dev
  HA_ACTIVE: false
```

### Configurazione Iniziale (Post-Deploy)

**Setup Wizard:**
1. Admin email: `admin@webapptest.local`
2. Admin password: `[DA DEFINIRE - es: Admin123!]`
3. Site URL: `http://localhost` (dev) / `https://server-aziendale` (prod)
4. Locale: `it-IT` (Italiano)

**Configurazioni Amministrazione:**

1. **Authentication** (Admin Area > Authentication):
   ```
   Strategy: Local
   Self-Registration: DISABLED
   ```

2. **Groups** (Admin Area > Groups):
   ```
   Administrators:
     - Permissions: read, write, manage, delete, upload, admin
     - Members: admin@webapptest.local

   Guests (built-in):
     - Permissions: read (solo lettura)
     - Public access: ENABLED
   ```

3. **Rendering** (Admin Area > Rendering):
   ```
   Page Rules:
     - Default Editor: Markdown / Visual Editor
     - Code Injection: [header/footer per embedding]
   ```

4. **Theme** (Admin Area > Theme):
   ```
   Theme: Default / Customizable
   Hide elements for iframe embedding:
     - Header: Optional
     - Sidebar: Optional
     - Footer: Optional
   ```

---

## 📂 STRUTTURA FILE PROGETTO

### File da Creare/Modificare

```
WebAppTEST/
├── docker-compose.yml              [MODIFICARE]
├── nginx.conf.template             [MODIFICARE]
├── .env                            [MODIFICARE - opzionale]
│
├── ContestoServer/                 [NUOVO]
│   ├── docker-compose.prod.yml    [DA FORNIRE]
│   ├── .env.production            [DA FORNIRE]
│   └── nginx.conf.prod            [DA FORNIRE]
│
├── Scripts/                        [NUOVO]
│   ├── 01_create_wikijs_database.sql
│   ├── 02_create_wikijs_user.sql  [OPZIONALE]
│   └── README.md
│
├── frontend/src/
│   ├── components/wiki/
│   │   └── WikiEmbed.jsx          [MODIFICARE/CREARE]
│   └── App.jsx                    [MODIFICARE - opzionale]
│
└── WIKI_INTEGRATION_PLAN.md       [NUOVO - Piano dettagliato]
```

### Volume Docker per Wiki.js

```yaml
volumes:
  wiki-config:
    driver: local
    # Persistenza configurazioni Wiki.js
    # Non necessario per database (già in MSSQL)
```

---

## 🌐 ROUTING E ACCESSO

### URL Accesso

**Ambiente Dev Locale:**
- Webapp: `http://localhost` o `https://localhost`
- Wiki: `http://localhost/wiki`
- Backend API: `http://localhost/api`

**Ambiente Produzione:**
- Webapp: `https://[server-aziendale]`
- Wiki: `https://[server-aziendale]/wiki`
- Backend API: `https://[server-aziendale]/api`

### Configurazione Nginx

```nginx
# Location per Wiki.js
location /wiki {
    proxy_pass http://wiki:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Headers per iframe embedding (se necessario)
    proxy_hide_header X-Frame-Options;
    add_header X-Frame-Options "SAMEORIGIN" always;
}

# Location per asset Wiki.js
location /wiki/_assets {
    proxy_pass http://wiki:3000/_assets;
    proxy_cache_valid 200 1d;
}
```

---

## 🔐 SICUREZZA E PERMESSI

### Accesso Pubblico Read-Only

**Configurazione Wiki.js:**
- Guest group: Read permission only
- No self-registration
- No anonymous editing
- Public page viewing enabled

**Workflow:**
1. Utenti webapp accedono a `/wiki` via iframe o link
2. Vedono contenuti senza login (gruppo Guests)
3. Solo admin può editare (login richiesto per admin)

### Utenti Admin Wiki

**Creazione manuale via UI:**
```
Admin 1:
  Email: admin@webapptest.local
  Password: [STRONG PASSWORD]
  Group: Administrators

Admin 2 (opzionale):
  Email: [secondo admin]
  Password: [STRONG PASSWORD]
  Group: Administrators
```

**NO integrazione JWT webapp**: Sistemi autenticazione separati.

---

## 📦 DEPLOYMENT

### Checklist Dev Locale

- [ ] Creare database `WikiJS` in MSSQL locale
- [ ] Modificare `docker-compose.yml`
- [ ] Modificare `nginx.conf.template`
- [ ] Avviare stack: `docker-compose up -d --build`
- [ ] Completare setup wizard Wiki.js: `http://localhost:3002`
- [ ] Configurare permessi e gruppi
- [ ] Testare accesso: `http://localhost/wiki`

### Checklist Produzione

- [ ] Verificare configurazioni `ContestoServer/`
- [ ] Creare database `WikiJS` in SQL Server produzione
- [ ] Adattare `docker-compose.prod.yml` con nuove variabili
- [ ] Aggiornare `nginx.conf.prod` con location `/wiki`
- [ ] Deploy su server aziendale
- [ ] Completare setup wizard con URL produzione
- [ ] Configurare backup database `WikiJS`
- [ ] Migrare contenuti da dev a prod (export/import)

---

## 🧪 TESTING

### Test Funzionali

1. **Accesso base:**
   - ✅ Apertura `http://localhost/wiki` senza errori
   - ✅ Visualizzazione homepage wiki
   - ✅ Navigazione tra pagine

2. **Permessi:**
   - ✅ Accesso pubblico (no login) visualizza contenuti
   - ✅ Editing richiede login admin
   - ✅ Guest non vede pulsanti edit/create

3. **Integrazione frontend:**
   - ✅ Iframe carica wiki correttamente
   - ✅ Dimensioni responsive
   - ✅ No errori CORS

4. **Performance:**
   - ✅ Caricamento pagine < 2s
   - ✅ Upload immagini funzionante
   - ✅ Search funzionante

---

## 🔄 MIGRAZIONE DEV → PROD

### Opzione A: Export/Import Manuale

1. **Admin Area > Utilities > Export**
2. Scaricare backup completo (JSON/Tar)
3. Upload su server produzione
4. **Admin Area > Utilities > Import**

### Opzione B: Backup Database

```sql
-- Backup DB WikiJS da dev
BACKUP DATABASE [WikiJS]
TO DISK = 'C:\Backup\WikiJS_dev.bak'

-- Restore su server prod
RESTORE DATABASE [WikiJS]
FROM DISK = '\\server-prod\Backup\WikiJS_dev.bak'
```

---

## 📞 CONTATTI E RIFERIMENTI

### Documentazione Ufficiale
- Wiki.js Docs: https://docs.requarks.io/
- Docker Setup: https://docs.requarks.io/install/docker
- MSSQL Config: https://docs.requarks.io/install/requirements

### File Riferimento Progetto
- Context Document: `WIKI_INTEGRATION_CONTEXT.md` (questo file)
- Implementation Plan: `WIKI_INTEGRATION_PLAN.md`
- SQL Scripts: `Scripts/`
- Server Config: `ContestoServer/`

---

## 📝 NOTE AGGIUNTIVE

### Limitazioni Conosciute

1. **No SSO**: Autenticazione wiki separata da webapp
2. **No Multi-tenant**: Wiki unico per tutte le aziende
3. **No Sincronizzazione Utenti**: Utenti wiki gestiti manualmente

### Future Implementazioni (Opzionali)

- [ ] SSO via OAuth2 personalizzato
- [ ] API integration per creare pagine da webapp
- [ ] Embedding avanzato con custom CSS
- [ ] Notifiche wiki in webapp esistente
- [ ] Search unificato webapp + wiki

---

## 🚀 QUICK START (Nuova Chat)

Se stai aprendo questo contesto in una nuova chat Claude, usa questo prompt:

```
Ciao! Sto lavorando all'integrazione di Wiki.js nella WebAppTEST.

Ho il documento di contesto completo in WebAppTEST/WIKI_INTEGRATION_CONTEXT.md
e il piano dettagliato in WebAppTEST/WIKI_INTEGRATION_PLAN.md.

Per favore:
1. Leggi entrambi i file
2. Dimmi a che punto siamo dell'implementazione
3. Procediamo con il prossimo step

Il progetto è in: C:\Users\marcoro\Projects\WebAppTEST
```

---

**Fine Documento di Contesto**
