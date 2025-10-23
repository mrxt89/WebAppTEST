# 🚀 PROMPT PER DEPLOYMENT PRODUZIONE

Usa questo prompt quando carichi i file del server per adattare la configurazione Wiki.js:

---

## 📋 PROMPT PER L'AI

```
Ho caricato i file di configurazione del server produzione nella cartella ContestoServer/.

IMPORTANTE: Devi adattare questi file per includere il servizio Wiki.js, seguendo le stesse modifiche fatte in ambiente dev.

## MODIFICHE CRITICHE NECESSARIE:

### 1. File .bat di deployment (se presente)
Se esiste un file simile a `start-prod.bat` o `deploy.bat`, devi modificarlo:

**PROBLEMA**: Il comando `docker system prune -f --volumes` elimina TUTTI i volumi Docker, inclusi `wiki-data` e `wiki-config`, causando la PERDITA DEL SETUP DEL WIKI (configurazioni, permessi, contenuti).

**SOLUZIONE**:
- Rimuovi il flag `--volumes` da `docker system prune`
- Cambia da: `docker system prune -f --volumes`
- A: `docker system prune -f`
- Aggiungi nota che i volumi wiki sono preservati

**INOLTRE**:
- Aggiungi gli URL del wiki nell'output finale:
  ```
  Wiki.js: http://[server-prod]:3002 (accesso diretto)
  Wiki.js: https://[server-prod]/wiki (via nginx)
  ```

### 2. docker-compose produzione
- Verifica che `DB_HOST` sia quotato: `"DB_HOST=server\\instance"`
- Adatta il nome del server SQL da dev a prod
- Mantieni volumi persistenti `wiki-data` e `wiki-config`

### 3. nginx produzione
- Verifica che ci siano le location `/wiki`, `/wiki/_assets`, `/wiki/uploads`

### 4. Script SQL
- Gli script in `Scripts/` vanno eseguiti anche in produzione
- Verifica path database nel file `01_create_wikijs_database.sql`

## FILE DA ANALIZZARE:
```

Poi elenca i file che hai caricato.

---

## 📝 ESEMPIO CONCRETO

Quando carichi i file, scrivi:

```
Ciao! Ho caricato i file di configurazione del server produzione:

ContestoServer/
├── docker-compose.prod.yml
├── .env.production
├── start-prod.bat
└── nginx.conf.prod

Segui le istruzioni in ContestoServer/PROMPT_DEPLOYMENT.md per:

1. CRITICO: Rimuovere --volumes da start-prod.bat (preserva dati wiki)
2. Adattare docker-compose.prod.yml per servizio wiki
3. Verificare nginx.conf.prod ha routing /wiki
4. Adattare DB_HOST per SQL Server produzione

Analizza i file e dimmi quali modifiche devo fare.
```

---

## ⚠️ PERCHÉ È IMPORTANTE

**Il flag `--volumes` in `docker system prune`:**

❌ **ELIMINA**:
- `wiki-data` → Tutti i file caricati nel wiki
- `wiki-config` → Tutte le configurazioni

✅ **RISULTATO**: Dopo ogni restart perdi:
- Setup wizard completato
- Permessi configurati
- Pagine create
- Account admin
- Tutte le personalizzazioni

**DEVE** essere rimosso in TUTTI gli script di deployment!

---

## 🎯 CHECKLIST MODIFICHE PRODUZIONE

Quando l'AI risponde, verifica che abbia fatto:

- [ ] Rimosso `--volumes` da script .bat produzione
- [ ] Quotato `DB_HOST` in docker-compose.prod.yml
- [ ] Adattato server SQL da `host.docker.internal\ARCHASERVER` a quello prod
- [ ] Verificato location `/wiki` in nginx.conf.prod
- [ ] Aggiunto URL wiki nell'output script deployment
- [ ] Documentato che volumi wiki sono preservati

---

**Salva questo file per riferimento futuro!**
