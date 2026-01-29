# Quick Start: Normalizzazione Descrizioni

## 🚀 Configurazione Rapida 

### Step 1: Accedi alla Configurazione
1. Vai su **Dashboard Admin** → Tab **"Regole Descrizioni"**

### Step 2: Crea le Caratteristiche Base (3 minuti)

Clicca su **"Nuova Caratteristica"** e crea queste 3 caratteristiche:

#### 1. Diametro
- **Codice:** `DIAMETER`
- **Nome:** `Diametro`
- **Template:** `D {value}mm`
- **Ordine:** `1`
- ✅ **Attiva**

#### 2. Spessore
- **Codice:** `THICKNESS`
- **Nome:** `Spessore`
- **Template:** `S {value}mm`
- **Ordine:** `2`
- ✅ **Attiva**

#### 3. Raggio
- **Codice:** `RADIUS`
- **Nome:** `Raggio curvatura`
- **Template:** `R {value}mm`
- **Ordine:** `3`
- ✅ **Attiva**

### Step 3: Crea le Regole Base 

Vai su **"Regole di Descrizione"** e crea 3 regole:

#### 1. Regola Diametro
- **Caratteristica:** `Diametro (DIAMETER)`
- **MacroFamiglia:** (lascia vuoto = tutte)
- **Famiglia:** (lascia vuoto = tutte)
- **Tipo:** (lascia vuoto = tutti)
- **Ordine:** `1`
- **Separatore:** ` - `
- ✅ **Attiva**

#### 2. Regola Spessore
- **Caratteristica:** `Spessore (THICKNESS)`
- **MacroFamiglia:** (lascia vuoto)
- **Famiglia:** (lascia vuoto)
- **Tipo:** (lascia vuoto)
- **Ordine:** `2`
- **Separatore:** ` - `
- ✅ **Attiva**

#### 3. Regola Raggio
- **Caratteristica:** `Raggio curvatura (RADIUS)`
- **MacroFamiglia:** (lascia vuoto)
- **Famiglia:** (lascia vuoto)
- **Tipo:** (lascia vuoto)
- **Ordine:** `3`
- **Separatore:** ` - `
- ✅ **Attiva**

### ✅ Fatto!

Ora quando crei un articolo con:
- Diametro: 20
- Spessore: 5
- Raggio: 100

La descrizione sarà automaticamente:
```
[Tua descrizione base] - D 20mm - S 5mm - R 100mm
```

---

## 📝 Note Importanti

- **Template:** Usa sempre `{value}` come placeholder
- **Ordine:** Le caratteristiche vengono aggiunte in ordine crescente (1, 2, 3...)
- **Separatore:** Di default usa ` - ` (spazio-trattino-spazio)
- **Vuoto = Tutte:** Se lasci vuoto MacroFamiglia/Famiglia/Tipo, la regola si applica a tutti

---

## 🔧 Personalizzazione

### Cambiare il formato
Modifica il **Template** nella caratteristica:
- `D {value}mm` → `Diam. {value} mm`
- `S {value}mm` → `Spess. {value}mm`

### Aggiungere altre caratteristiche
1. Crea nuova caratteristica (es: `BxH`, `DEPTH`, `LENGTH`)
2. Crea regola corrispondente
3. Imposta l'ordine corretto

---
