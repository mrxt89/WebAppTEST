# 📖 Guida Integrazione WikiDocLink

Guida per integrare il pulsante documentazione wiki in MainPage.jsx

---

## 🎯 Obiettivo

Aggiungere un'icona 📖 nel breadcrumb o toolbar che permette di aprire la documentazione wiki della pagina corrente.

---

## 📋 Passi di Integrazione

### 1. Import del Componente

In **MainPage.jsx**, aggiungi l'import:

```javascript
import WikiDocLink from '../wiki/WikiDocLink';
```

### 2. Recupera wikiSlug dalla Pagina Corrente

Il `wikiSlug` è già presente in `AR_Pages` (se hai eseguito lo script SQL `11_add_wikiSlug_field.sql`).

Quando carichi i menuItems e la pagina corrente, assicurati di includere il campo `wikiSlug`:

```javascript
// Esempio nel tuo codice dove carichi la pagina
const currentPage = {
  pageId: item.pageId,
  pageName: item.pageName,
  pageRoute: item.pageRoute,
  wikiSlug: item.wikiSlug,  // ← AGGIUNGI QUESTO
  // ... altri campi
};
```

### 3. Passa wikiSlug allo State

Nel tuo state di MainPage, tieni traccia del wikiSlug corrente:

```javascript
const [currentWikiSlug, setCurrentWikiSlug] = useState(null);
```

E aggiornalo quando cambia pagina:

```javascript
const handleNavigate = (item, state = {}) => {
  // ... tuo codice esistente ...

  // Aggiungi questo
  setCurrentWikiSlug(item.wikiSlug);

  // ... resto del codice ...
};
```

### 4. Aggiungi WikiDocLink al Breadcrumb

Nel punto dove renderizzi il breadcrumb (di solito nella toolbar o header), aggiungi:

```jsx
{/* Breadcrumb esistente */}
<Breadcrumbs aria-label="breadcrumb">
  {breadcrumb.map((item, index) => (
    <Link
      key={index}
      color="inherit"
      onClick={() => handleBreadcrumbClick(index)}
      style={{ cursor: "pointer" }}
    >
      {item.pageName}
    </Link>
  ))}
</Breadcrumbs>

{/* AGGIUNGI QUESTO: Icona documentazione wiki */}
<WikiDocLink
  wikiSlug={currentWikiSlug}
  size="small"
  tooltip="Apri documentazione di questa pagina"
/>
```

---

## 🎨 Opzioni di Posizionamento

### Opzione A: Nel Breadcrumb (Consigliato)

```jsx
<Box sx={{ display: 'flex', alignItems: 'center' }}>
  <Breadcrumbs aria-label="breadcrumb">
    {/* ... breadcrumb items ... */}
  </Breadcrumbs>
  <WikiDocLink wikiSlug={currentWikiSlug} />
</Box>
```

### Opzione B: In Toolbar a Destra

```jsx
<Toolbar>
  <Box sx={{ flexGrow: 1 }}>
    {/* Contenuto sx */}
  </Box>
  <WikiDocLink wikiSlug={currentWikiSlug} size="medium" />
  {/* Altri pulsanti toolbar */}
</Toolbar>
```

### Opzione C: Come Pulsante FAB (Floating Action Button)

```jsx
import { Fab } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';

<Fab
  color="primary"
  size="small"
  onClick={() => window.open(`/wiki/webapp${currentWikiSlug}`, '_blank')}
  sx={{
    position: 'fixed',
    bottom: 16,
    right: 16
  }}
>
  <MenuBookIcon />
</Fab>
```

---

## 📊 Query SQL per Verificare wikiSlug

Assicurati che tutte le pagine abbiano il wikiSlug:

```sql
SELECT
    pageId,
    pageName,
    wikiSlug,
    '/wiki/webapp' + wikiSlug AS [URL Wiki Completo]
FROM AR_Pages
WHERE disabled = 0
  AND pageName <> 'Documentazione'
ORDER BY pageId
```

Se alcune pagine non hanno wikiSlug, esegui:

```sql
EXEC Scripts/11_add_wikiSlug_field.sql
```

---

## 🔧 Personalizzazione

### Cambiare Icona

```jsx
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// In WikiDocLink.jsx, sostituisci MenuBookIcon con:
<HelpOutlineIcon fontSize={size} />
```

### Cambiare Colore

```jsx
<WikiDocLink
  wikiSlug={currentWikiSlug}
  color="secondary"  // o "error", "warning", "info", "success"
/>
```

### Cambiare Tooltip

```jsx
<WikiDocLink
  wikiSlug={currentWikiSlug}
  tooltip="Visualizza guida di questa pagina"
/>
```

---

## ✅ Verifica Funzionamento

1. **Avvia la webapp** in dev
2. **Naviga** a una pagina qualsiasi (es: Dashboard)
3. **Verifica** che appaia l'icona 📖
4. **Clicca** sull'icona
5. **Controlla** che si apra una nuova finestra con:
   ```
   http://localhost/wiki/webapp/dashboard
   ```

Se la pagina wiki non esiste ancora, vedrai un 404. Dovrai crearla nel wiki seguendo la guida di importazione.

---

## 🐛 Troubleshooting

### Icona non appare

- Verifica che `wikiSlug` non sia `null` o `undefined`
- Controlla console browser per errori import
- Verifica che il componente sia nel path corretto

### Click non apre nulla

- Verifica che `wikiSlug` sia valorizzato
- Controlla la console browser per errori
- Verifica che popup blocker non blocchi window.open

### Pagina wiki 404

- Le pagine wiki devono essere create manualmente in Wiki.js
- Usa i template in `Wiki/*.md` come riferimento
- Segui la guida importazione (prossimo step)

---

## 📚 Prossimi Passi

1. Integra WikiDocLink in MainPage.jsx seguendo questa guida
2. Importa le pagine wiki usando i template in `Wiki/*.md`
3. Testa il funzionamento completo

---

**Creato:** 2025-10-23
**Componente:** WikiDocLink.jsx
