# BOM Viewer - Identificatori Sezioni

Questo documento elenca tutti gli ID delle sezioni del BOM Viewer per facilitare la documentazione e la manutenzione.

## Struttura Principale

### Container Principale
- **`bom-viewer`** - Container principale del BOM Viewer

### Sezioni Principali
- **`bom-header-section`** - Sezione header fissa (codice BOM, descrizione, selettore versione)
- **`bom-main-content`** - Area principale con i 3 pannelli ridimensionabili

## Pannelli

### Pannello Sinistro - Struttura BOM
- **`bom-tree-container`** - Container del pannello albero
- **`bom-tree-header`** - Header fisso del pannello albero ("Struttura BOM")
- **`bom-tree-content`** - Area scrollabile con il diagramma ad albero

### Pannello Centrale - Dettagli Componente
- **`bom-detail-container`** - Container del pannello dettagli
- **`bom-detail-header`** - Header fisso del pannello dettagli ("Dettagli Componente")
- **`bom-detail-content`** - Area scrollabile con i dettagli del componente

### Pannello Destro - BOM di Riferimento
- **`bom-reference-container`** - Container del pannello riferimento
- **`bom-reference-header`** - Header fisso del pannello riferimento ("BOM di Riferimento")
- **`bom-reference-content`** - Area scrollabile con le BOM di riferimento

## Layout e Comportamento

### Header Completamente Fisso
- **Header fisso**: `bom-header-section` usa `flex-shrink-0` per rimanere sempre visibile
- **Z-index elevato**: `z-10` per assicurarsi che sia sopra tutti gli altri elementi
- **Sfondo bianco**: `bg-white` per coprire il contenuto sottostante
- **Ombra**: `shadow-sm` per distinguere visivamente l'header dal contenuto
- **Altezza fissa**: Non si riduce mai, mantiene sempre la sua altezza naturale

### Scroll Indipendente per Sezioni
- **Pannelli con altezza fissa**: Ogni pannello ha un'altezza fissa basata sull'altezza della finestra
- **Scroll interno**: Solo il contenuto dei pannelli scorre (`overflow-y-auto`)
- **Scroll orizzontale disabilitato**: `overflow-x-hidden` per evitare scroll orizzontale indesiderato
- **Header pannelli fissi**: Gli header dei singoli pannelli rimangono fissi durante lo scroll

### Responsive Design
- **Pannelli ridimensionabili**: Utilizzano `ResizablePanel` per permettere il ridimensionamento
- **Dimensioni minime/massime**: Impostate per garantire usabilità su schermi diversi

## Utilizzo per Documentazione

Questi ID possono essere utilizzati per:
- **Documentazione utente**: Per spiegare le diverse sezioni dell'interfaccia
- **Wiki**: Per creare guide dettagliate
- **Testing**: Per identificare elementi durante i test automatizzati
- **Manutenzione**: Per localizzare rapidamente le sezioni nel codice

## Esempi di Utilizzo

```javascript
// Selezionare il contenuto dell'albero per scroll programmatico
const treeContent = document.getElementById('bom-tree-content');
treeContent.scrollTop = 0; // Scroll to top

// Selezionare l'header per modifiche di stile
const treeHeader = document.getElementById('bom-tree-header');
treeHeader.style.backgroundColor = '#f0f0f0';
```

## Note Tecniche

- Tutti gli ID seguono la convenzione `bom-[section]-[element]`
- Gli header hanno sempre `flex-shrink-0` per rimanere fissi
- I contenuti hanno sempre `flex-1 min-h-0 overflow-y-auto` per lo scroll
- La struttura utilizza Flexbox per il layout responsive
- **CRITICO**: `min-h-0` è essenziale per permettere al flexbox di ridurre l'altezza

## Troubleshooting

### Problemi Comuni

1. **Header che sparisce durante lo scroll**
   - Verificare che `bom-header-section` abbia `flex-shrink-0`
   - Controllare che il container padre abbia `h-full`

2. **Scroll non funziona nei pannelli**
   - Verificare che i contenuti abbiano `min-h-0`
   - Controllare che il container abbia `overflow-hidden`

3. **Pannelli non si ridimensionano**
   - Verificare che `ResizablePanelGroup` abbia `h-full w-full`
   - Controllare che i pannelli abbiano `h-full w-full`

### Debug CSS

```css
/* Per debug, aggiungere temporaneamente: */
#bom-viewer { border: 2px solid red; }
#bom-header-section { border: 2px solid blue; }
#bom-main-content { border: 2px solid green; }
#bom-tree-content { border: 2px solid orange; }
```

### Approccio Semplificato

- **Rimossi `h-full`**: Evitano conflitti con il layout flexbox
- **Layout naturale**: Il container si adatta automaticamente all'altezza disponibile
- **Flexbox puro**: Usa solo `flex-1` e `min-h-0` per il controllo dell'altezza
- **Più stabile**: Meno dipendente da altezze fisse che possono causare problemi
