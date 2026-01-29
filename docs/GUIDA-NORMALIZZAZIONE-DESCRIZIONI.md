# Guida Operativa: Normalizzazione Descrizioni Articoli

## 📋 Indice
1. [Cos'è e a cosa serve](#cosè-e-a-cosa-serve)
2. [Come funziona](#come-funziona)
3. [Configurazione Iniziale](#configurazione-iniziale)
4. [Gestione Caratteristiche Tecniche](#gestione-caratteristiche-tecniche)
5. [Gestione Regole di Descrizione](#gestione-regole-di-descrizione)
6. [Esempi Pratici](#esempi-pratici)
7. [FAQ](#faq)

---

## 🎯 Cos'è e a cosa serve

Il sistema di **Normalizzazione Descrizioni** serve per garantire che le caratteristiche tecniche degli articoli (Diametro, Spessore, Raggio, ecc.) vengano sempre scritte nello stesso formato standard.

**Problema risolto:**
- ❌ Prima: ogni utente scriveva diversamente → "D 20", "D%20", "D. 20", "diam 20"
- ✅ Ora: sempre lo stesso formato → "D 20mm" (configurabile)

**Vantaggi:**
- ✅ Descrizioni uniformi e professionali
- ✅ Ricerca più semplice (stesso formato = più facile trovare)
- ✅ Documentazione più chiara
- ✅ Meno errori di digitazione

---

## 🔧 Come funziona

Il sistema funziona in **due fasi**:

### 1. **Configurazione** (una volta, da Admin)
- L'amministratore definisce i **template** per ogni caratteristica tecnica
- L'amministratore definisce le **regole** per quando aggiungere le caratteristiche

### 2. **Utilizzo Automatico** (ogni volta che si crea/modifica un articolo)
- L'utente inserisce i valori tecnici (Diametro, Spessore, ecc.)
- Il sistema **automaticamente** formatta e aggiunge le caratteristiche alla descrizione
- L'utente vede la descrizione finale già formattata correttamente

---

## ⚙️ Configurazione Iniziale

### Accesso alla Configurazione

1. Accedi alla **Dashboard Admin**
2. Vai al tab **"Regole Descrizioni"**
3. Troverai due sottotab:
   - **Caratteristiche Tecniche** - Definisce i template
   - **Regole di Descrizione** - Definisce quando usarli

---

## 📝 Gestione Caratteristiche Tecniche

### Cosa sono le Caratteristiche Tecniche?

Sono i **template** che definiscono come formattare ogni caratteristica (Diametro, Spessore, Raggio, ecc.).

### Come Creare una Caratteristica

1. Vai su **"Caratteristiche Tecniche"**
2. Clicca su **"Nuova Caratteristica"**
3. Compila il form:

   | Campo | Descrizione | Esempio |
   |-------|-------------|---------|
   | **Codice Caratteristica** | Codice univoco (maiuscolo) | `DIAMETER` |
   | **Nome** | Nome descrittivo | `Diametro` |
   | **Template di Formattazione** | Come formattare il valore | `D {value}mm` |
   | **Unità di Misura** | Unità (opzionale) | `mm` |
   | **Ordine di Visualizzazione** | Ordine nella lista | `1` |
   | **Attiva** | Se la caratteristica è attiva | ☑️ |

4. Clicca su **"Salva"**

### Esempi di Template

| Caratteristica | Template | Risultato con valore 20 |
|----------------|----------|-------------------------|
| Diametro | `D {value}mm` | `D 20mm` |
| Spessore | `S {value}mm` | `S 5mm` |
| Raggio | `R {value}mm` | `R 100mm` |
| Base x Altezza | `BxH {value}` | `BxH 50x30` |
| Profondità | `P {value}mm` | `P 10mm` |
| Lunghezza | `L {value}mm` | `L 500mm` |

**Nota:** Usa sempre `{value}` come placeholder per il valore numerico.

### Come Modificare una Caratteristica

1. Trova la caratteristica nella tabella
2. Clicca sull'icona **✏️ Modifica**
3. Modifica i campi necessari
4. Clicca su **"Salva"**

### Come Eliminare una Caratteristica

1. Trova la caratteristica nella tabella
2. Clicca sull'icona **🗑️ Elimina**
3. Conferma l'eliminazione

**⚠️ Attenzione:** Eliminare una caratteristica elimina anche tutte le regole che la usano!

---

## 📋 Gestione Regole di Descrizione

### Cosa sono le Regole?

Le regole definiscono **quando** e **in che ordine** aggiungere le caratteristiche tecniche alla descrizione dell'articolo.

### Come Creare una Regola

1. Vai su **"Regole di Descrizione"**
2. Clicca su **"Nuova Regola"**
3. Compila il form:

   | Campo | Descrizione | Esempio |
   |-------|-------------|---------|
   | **Caratteristica** | Quale caratteristica aggiungere | `Diametro (DIAMETER)` |
   | **MacroFamiglia** | Applica solo a questa macrofamiglia (opzionale) | `89` o vuoto = tutte |
   | **Famiglia** | Applica solo a questa famiglia (opzionale) | `486` o vuoto = tutte |
   | **Tipo** | Applica solo a questo tipo (opzionale) | `123` o vuoto = tutti |
   | **Ordine di Aggiunta** | Ordine nella descrizione (1, 2, 3...) | `1` = prima caratteristica |
   | **Separatore** | Separatore prima della caratteristica | ` - ` |
   | **Attiva** | Se la regola è attiva | ☑️ |

4. Clicca su **"Salva"**

### Esempi di Regole

#### Esempio 1: Regola Generale (per tutti gli articoli)
- **Caratteristica:** Diametro
- **MacroFamiglia:** (vuoto = tutte)
- **Famiglia:** (vuoto = tutte)
- **Tipo:** (vuoto = tutti)
- **Ordine:** 1
- **Separatore:** ` - `

**Risultato:** Per qualsiasi articolo con diametro, aggiunge " - D 20mm" alla descrizione.

#### Esempio 2: Regola Specifica (solo per una famiglia)
- **Caratteristica:** Spessore
- **MacroFamiglia:** 89
- **Famiglia:** 486
- **Tipo:** (vuoto = tutti)
- **Ordine:** 2
- **Separatore:** ` - `

**Risultato:** Solo per articoli della MacroFamiglia 89 e Famiglia 486, aggiunge " - S 5mm" dopo il diametro.

### Ordine delle Caratteristiche

Le caratteristiche vengono aggiunte in base all'**Ordine di Aggiunta**:

1. Prima viene la descrizione base (es: "Tubo - Rotondo - Standard")
2. Poi le caratteristiche in ordine crescente:
   - Ordine 1 → Diametro → " - D 20mm"
   - Ordine 2 → Spessore → " - S 5mm"
   - Ordine 3 → Raggio → " - R 100mm"

**Risultato finale:** `Tubo - Rotondo - Standard - D 20mm - S 5mm - R 100mm`

### Come Modificare una Regola

1. Trova la regola nella tabella
2. Clicca sull'icona **✏️ Modifica**
3. Modifica i campi necessari
4. Clicca su **"Salva"**

### Come Eliminare una Regola

1. Trova la regola nella tabella
2. Clicca sull'icona **🗑️ Elimina**
3. Conferma l'eliminazione

---

## 💡 Esempi Pratici

### Esempio Completo: Configurazione per Tubi

#### Step 1: Creare le Caratteristiche

1. **Diametro**
   - Codice: `DIAMETER`
   - Nome: `Diametro`
   - Template: `D {value}mm`
   - Ordine: 1

2. **Spessore**
   - Codice: `THICKNESS`
   - Nome: `Spessore`
   - Template: `S {value}mm`
   - Ordine: 2

3. **Raggio**
   - Codice: `RADIUS`
   - Nome: `Raggio curvatura`
   - Template: `R {value}mm`
   - Ordine: 3

#### Step 2: Creare le Regole

1. **Regola Diametro** (per tutti)
   - Caratteristica: `DIAMETER`
   - MacroFamiglia: (vuoto)
   - Ordine: 1

2. **Regola Spessore** (per tutti)
   - Caratteristica: `THICKNESS`
   - MacroFamiglia: (vuoto)
   - Ordine: 2

3. **Regola Raggio** (solo per tubi curvi)
   - Caratteristica: `RADIUS`
   - MacroFamiglia: 89 (esempio: Tubi)
   - Famiglia: 486 (esempio: Curvi)
   - Ordine: 3

#### Step 3: Utilizzo

Quando un utente crea un articolo:
- **Descrizione base:** "Tubo - Rotondo - Standard"
- **Diametro:** 20
- **Spessore:** 5
- **Raggio:** 100

**Risultato automatico:**
```
Tubo - Rotondo - Standard - D 20mm - S 5mm - R 100mm
```

---

## ❓ FAQ

### Q: Cosa succede se non configuro nulla?
**R:** Il sistema funziona normalmente, ma le caratteristiche tecniche non verranno aggiunte automaticamente alla descrizione.

### Q: Posso avere template diversi per famiglie diverse?
**Sì!** Crea regole diverse con MacroFamiglia/Famiglia/Tipo specifici.

### Q: Come faccio a cambiare il formato di una caratteristica?
1. Vai su "Caratteristiche Tecniche"
2. Modifica il "Template di Formattazione"
3. Salva

**Esempio:** Cambiare da `D {value}mm` a `Diam. {value} mm`

### Q: Cosa succede se ho più regole per la stessa caratteristica?
Il sistema usa la regola **più specifica**:
1. Prima cerca regole con Tipo specifico
2. Poi regole con Famiglia specifica
3. Poi regole con MacroFamiglia specifica
4. Infine regole generali (tutte vuote)

### Q: Posso disattivare una regola senza eliminarla?
**Sì!** Nella modifica della regola, deseleziona "Attiva" e salva.

### Q: Come vedo un'anteprima della descrizione normata?
Quando crei/modifichi un articolo, la descrizione viene generata automaticamente. Puoi anche usare l'API `/codingRules/description/generate` per vedere un'anteprima.

### Q: Cosa succede se inserisco un valore ma non c'è una regola?
Il valore viene salvato nel database, ma **non viene aggiunto** alla descrizione. Solo le caratteristiche con regole attive vengono aggiunte.

### Q: Posso usare caratteristiche personalizzate?
**Sì!** Puoi creare qualsiasi caratteristica tecnica con il codice che preferisci (es: `PESO`, `MATERIALE`, ecc.), ma devi poi integrare il supporto nel codice se non è già presente.

---

## 🎓 Best Practices

1. **Usa codici chiari:** `DIAMETER` invece di `DIA` o `D`
2. **Template consistenti:** Usa sempre lo stesso formato (es: sempre `mm` o sempre senza unità)
3. **Ordine logico:** Metti prima le caratteristiche più importanti
4. **Testa le regole:** Dopo aver creato una regola, testala creando un articolo di prova
5. **Documenta:** Se crei regole specifiche per famiglie particolari, documentale

---

## 🔍 Troubleshooting

### Problema: Le caratteristiche non vengono aggiunte alla descrizione

**Controlla:**
1. ✅ La caratteristica è **attiva**?
2. ✅ La regola è **attiva**?
3. ✅ Il valore tecnico è stato inserito nell'articolo?
4. ✅ La regola corrisponde alla gerarchia dell'articolo (MacroFamiglia/Famiglia/Tipo)?

### Problema: Le caratteristiche sono nell'ordine sbagliato

**Soluzione:** Controlla l'**Ordine di Aggiunta** nelle regole. Deve essere crescente (1, 2, 3...).

### Problema: Il formato non è quello che volevo

**Soluzione:** Modifica il **Template di Formattazione** nella caratteristica tecnica.

