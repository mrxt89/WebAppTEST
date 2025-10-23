# ContestoServer - Configurazioni Produzione

Questa cartella contiene i file di configurazione del server produzione aziendale.

## File da Inserire

Per completare l'integrazione Wiki.js in produzione, inserisci in questa cartella i seguenti file dal server:

### 1. docker-compose (se presente)

- `docker-compose.yml` - Configurazione Docker produzione
- `docker-compose.prod.yml` - Variante produzione
- O qualsiasi file simile usato per orchestrazione container

### 2. Variabili Ambiente

- `.env` - File variabili ambiente produzione
- `.env.production` - Variante produzione
- O qualsiasi file con configurazioni ambiente

### 3. Nginx

- `nginx.conf` - Configurazione nginx produzione
- `nginx.conf.template` - Template nginx
- O file configurazione reverse proxy equivalente

### 4. Configurazioni Database

- File con connection string SQL Server produzione
- Script di configurazione database
- Credenziali (assicurati di non committare in Git!)

### 5. Altri File Rilevanti

- Script di deployment
- Certificati SSL (se gestiti manualmente)
- File di configurazione webapp specifici server

## Informazioni da Estrarre

Quando inserisci i file, assicurati che contengano queste informazioni:

### SQL Server Produzione

```
Server: [NOME_SERVER o IP]
Port: [1433 o altro]
Instance: [se presente, es. SQLSERVER\INSTANCE]
User: [utente SQL]
Password: [password]
Database: WebAppTEST
```

### Networking

```
Domain/Hostname: [es. webapp.azienda.local]
Protocol: HTTP o HTTPS
Porte esposte: [80, 443, altro]
```

### Docker

```
Network name: [nome rete bridge/custom]
Volume mounts: [percorsi volumi persistenti]
Container names: [nomi container in prod]
```

## Note Importanti

⚠️ **SICUREZZA**: Non committare password o credenziali in Git!

Se hai credenziali sensibili:
1. Crea file `.env.production.example` con placeholder
2. Aggiungi `.env.production` a `.gitignore`
3. Documenta dove recuperare le credenziali reali

## Status

- [ ] File docker-compose produzione inseriti
- [ ] Variabili ambiente produzione documentate
- [ ] Connection string SQL Server identificato
- [ ] Configurazione nginx/reverse proxy presente
- [ ] Differenze dev/prod documentate

---

Una volta inseriti i file, Claude analizzerà le configurazioni e adatterà:
- `docker-compose.prod.yml` per Wiki.js
- Script SQL con path corretti
- Documentazione deployment specifica per il tuo server
