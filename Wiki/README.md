# 📚 Documentazione Wiki - Indice File

**Progetto:** WebAppTEST - Sistema Documentazione Integrata
**Data:** 2025-10-23

---

## 🗂️ STRUTTURA FILE

### 📖 Guide per Utenti

| File | Per Chi | Descrizione |
|------|---------|-------------|
| **GUIDA_REDAZIONE_DOCUMENTAZIONE.md** | ✍️ **Redattori** | Guida completa per scrivere la documentazione wiki. Tutorial passo-passo, regole, esempi. **INIZIA DA QUI** se devi documentare le funzionalità. |
| **WIKI_IMPORT_GUIDE.md** | 🔧 Tecnici | Come importare le pagine wiki da file .md a Wiki.js. Per setup iniziale. |

### 🛠️ Guide per Sviluppatori

| File | Per Chi | Descrizione |
|------|---------|-------------|
| **README_SISTEMA_DOCUMENTAZIONE.md** | 👨‍💻 Developer | Panoramica completa del sistema: architettura, convenzioni URL, struttura. |
| **wiki_pages_structure.json** | 👨‍💻 Developer | Struttura JSON completa di tutte le pagine (11 pagine + home). |

### 📄 Template Pagine Wiki (*.md)

Questi file sono template **già pronti** da copiare in Wiki.js:

| File | Pagina Wiki | Path Wiki |
|------|-------------|-----------|
| `01_HOME_webapp.md` | Home Documentazione | `home` |
| `02_Dashboard.md` | Dashboard | `home/dashboard` |
| `03_Dashboard_Permessi.md` | Permessi | `home/dashboard/permessi` |
| `04_Progetti.md` | Progetti | `home/progetti` |
| `05_Progetti_Categorie.md` | Categorie Progetti | `home/progetti/categorie-progetti` |
| `06_Progetti_Clienti.md` | Clienti Progetti | `home/progetti/clienti-progetti` |
| `07_Progetti_Costificazione_Distinte.md` | Costificazione Distinte | `home/progetti/costificazione-distinte` |
| `08_Progetti_Dashboard_Progetti.md` | Dashboard Progetti | `home/progetti/dashboard-progetti` |
| `09_Progetti_Intercompany.md` | Intercompany | `home/progetti/intercompany` |
| `10_Progetti_Lista_Attivita.md` | Lista Attività | `home/progetti/lista-attivita` |

**Nota:** I template sono **bozze** con struttura standard. Devono essere **completati** con contenuti specifici seguendo `GUIDA_REDAZIONE_DOCUMENTAZIONE.md`.

---

## 🚀 QUICK START

### Per Redattori Documentazione

**Obiettivo:** Scrivere la documentazione delle funzionalità webapp

1. **Leggi:** `GUIDA_REDAZIONE_DOCUMENTAZIONE.md` (10 minuti)
2. **Accedi** al wiki: http://localhost:3002 (o produzione)
3. **Scegli** una funzionalità da documentare
4. **Apri** la pagina wiki corrispondente
5. **Segui** le regole della guida per completare il contenuto
6. **Salva** e pubblica

**Hai dubbi?** Consulta la sezione "Esempio Completo" nella guida redazione!

---

### Per Tecnici IT (Setup Iniziale)

**Obiettivo:** Importare le pagine skeleton nel wiki

1. **Leggi:** `WIKI_IMPORT_GUIDE.md`
2. **Accedi** a Wiki.js come admin
3. **Crea** 11 pagine usando i template `*.md`
4. **Verifica** path corretti (es: `home/dashboard`)
5. **Passa** il wiki ai redattori per completamento contenuti

**Hai dubbi?** Consulta `README_SISTEMA_DOCUMENTAZIONE.md` per dettagli tecnici!

---

## 📋 CHECKLIST PROGETTO

### Setup Sistema (Tecnici)

- [ ] Script SQL `11_add_wikiSlug_field.sql` eseguito
- [ ] Backend modificato (server.js - query menu)
- [ ] Frontend modificato (MainPage, MainContainer)
- [ ] Wiki.js configurato e funzionante
- [ ] 11 pagine skeleton importate in Wiki.js
- [ ] Test icona 📖 funzionante in webapp
- [ ] Credenziali admin wiki fornite ai redattori

### Documentazione (Redattori)

- [ ] Home page completata
- [ ] Dashboard documentata
- [ ] Dashboard > Permessi documentata
- [ ] Progetti documentata
- [ ] Progetti > Categorie documentata
- [ ] Progetti > Clienti documentata
- [ ] Progetti > Costificazione documentata
- [ ] Progetti > Dashboard Progetti documentata
- [ ] Progetti > Intercompany documentata
- [ ] Progetti > Lista Attività documentata
- [ ] Screenshot aggiunti dove necessario
- [ ] Link tra pagine verificati

---

## 🎯 CONVENZIONI

### Naming File

```
[Numero]_[Sezione]_[Sottosezione].md

Esempi:
01_HOME_webapp.md
02_Dashboard.md
03_Dashboard_Permessi.md
05_Progetti_Categorie.md
```

### Path Wiki

```
home/[sezione]/[sottosezione]

Esempi:
home                                  → Home documentazione
home/dashboard                        → Dashboard
home/dashboard/permessi               → Permessi
home/progetti                         → Progetti
home/progetti/intercompany            → Intercompany
```

### Slug Database

```
/[sezione]/[sottosezione]

Esempi:
/dashboard                            → Dashboard
/dashboard/permessi                   → Permessi
/progetti                             → Progetti
/progetti/intercompany                → Intercompany
```

**Relazione:**
```
Database: wikiSlug = "/progetti/intercompany"
Wiki.js:  path     = "home/progetti/intercompany"
URL aperto:        = "/wiki/home/progetti/intercompany"
```

---

## 📊 Stato Documentazione

### Template Creati: 11/11 ✅

Tutti i template skeleton sono pronti in formato .md

### Contenuti Completi: 0/11 ⏳

I template hanno la struttura ma **mancano i contenuti specifici**.

**Esempio contenuto da completare:**

```markdown
## 📖 Descrizione

[DA COMPLETARE] ← Il redattore deve scrivere qui cosa fa la funzionalità

## 🚀 Come Si Usa

[DA COMPLETARE] ← Il redattore deve scrivere il tutorial passo-passo
```

**Prossimi step:**
1. Assegnare pagine ai redattori
2. Completare contenuti seguendo la guida
3. Aggiungere screenshot
4. Pubblicare

---

## 🔗 Link Utili

### Wiki

- **Locale Dev:** http://localhost:3002
- **Produzione:** https://erpsrvdoc01/wiki
- **Documentazione Wiki.js:** https://docs.requarks.io

### WebApp

- **Locale Dev:** http://localhost:5173
- **Produzione:** https://erpsrvdoc01

### Documentazione Tecnica

- **Sistema completo:** `README_SISTEMA_DOCUMENTAZIONE.md`
- **Setup integration:** `../SETUP_WIKI_INTEGRATION.md` (root progetto)

---

## 🆘 Supporto

### Per Redattori

**Domanda:** Come scrivo la documentazione?
**Risposta:** Leggi `GUIDA_REDAZIONE_DOCUMENTAZIONE.md` - Ha tutto!

**Domanda:** Dove trovo esempi?
**Risposta:** Cerca "Esempio Completo" nella guida redazione - mostra una pagina completa (Intercompany)

**Domanda:** Come aggiungo screenshot?
**Risposta:** Guida redazione, sezione "📸 SCREENSHOT: BEST PRACTICES"

### Per Tecnici

**Domanda:** Come funziona il sistema?
**Risposta:** Leggi `README_SISTEMA_DOCUMENTAZIONE.md` - Architettura completa

**Domanda:** Come importo le pagine?
**Risposta:** Segui `WIKI_IMPORT_GUIDE.md` passo-passo

**Domanda:** L'icona 📖 non appare
**Risposta:** Vedi troubleshooting in `../SETUP_WIKI_INTEGRATION.md`

---

## 📞 Contatti

**Responsabile Documentazione:** [Nome]
**Responsabile Tecnico:** [Nome]
**Email Supporto:** [email]

---

**Versione:** 1.0
**Ultima modifica:** 2025-10-23
