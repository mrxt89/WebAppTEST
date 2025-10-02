import ItemClass from '../../../src/components/Item/Item.js'
import ClassSerial from '../../../src/components/Serial/Serial.js'
import SelectPrinter from "../../../src/components/SelectPrinter/SelectPrinter.js";

// Funzioni globali per la gestione dei disegni
function checkAndShowDrawing(componentCode) {
    const drawingUrl = `/magopanel/src/api/drawings.php?code=${componentCode}`
    
    // Controlla se il disegno esiste
    fetch(drawingUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                // Il disegno esiste, mostralo
                imgViewer({ src: drawingUrl })
            } else {
                // Nessun disegno disponibile
                showNoDrawingMessage(componentCode)
            }
        })
        .catch(error => {
            console.error('Errore nel controllo del disegno:', error)
            showNoDrawingMessage(componentCode)
        })
}

function showNoDrawingMessage(componentCode) {
    // Mostra un messaggio elegante quando non c'è disegno
    const modal = document.createElement('div')
    modal.className = 'modal fade'
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-warning text-dark">
                    <h5 class="modal-title">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Nessun disegno disponibile
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <div class="mb-3">
                        <i class="bi bi-image text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <p class="mb-2">Per il componente <strong>${componentCode}</strong></p>
                    <p class="text-muted">Nessun disegno tecnico è presente nel sistema.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="bi bi-x-circle me-1"></i>Chiudi
                    </button>
                </div>
            </div>
        </div>
    `
    
    document.body.appendChild(modal)
    const bsModal = new bootstrap.Modal(modal)
    bsModal.show()
    
    // Rimuovi il modal dal DOM quando viene chiuso
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal)
    })
}

// Rendi le funzioni disponibili globalmente
window.checkAndShowDrawing = checkAndShowDrawing
window.showNoDrawingMessage = showNoDrawingMessage

async function loadData(Unit, WC, fastRefresh = 1) {
    let data = await getData('sequenceController.php', {mode: 'head', Unit: Unit, WC: WC, fastRefresh: fastRefresh})
    console.log(data)
    // Se non ci sono riesegue la SP con fastRefresh = 0
    if (!data) {
        console.log('Riesecuzione SP con fastRefresh = 0')
        data = await getData('sequenceController.php', {mode: 'head', Unit: Unit, WC: WC, fastRefresh: 0})
    }
    return data
}


class Sequence {
    // Proprietà pubbliche
    initialData = []
    initialDataAll = []
    
    // Proprietà private per gestione stato
    #expandedRows = new Set()
    #scrollPositions = new Map()
    #isLoading = false
    #lastUpdateTime = 0
    
    // Proprietà per mantenere l'ODP espanso dopo il prelievo
    #currentExpandedODP = null
    #shouldMaintainExpansion = false
    #savedScrollPosition = null
    
    // Configurazione
    config = {
        refreshInterval: 20000,
        cacheTimeout: 3000,
        maxRetries: 3,
        debounceDelay: 300
    }

    constructor() {
        this.initializeElements()
        this.initializeState()
        this.setupEventListeners()
        this.setupTouchOptimizations()
        this.createWCSelect()
    }
    
    initializeElements() {
        this.elements = {
            BUnitSelect: document.querySelector('#BUOption'),
            WCSelect: document.querySelector('#WCOption'),
            tableRows: document.querySelector('#tableRows'),
            refresh_btn: document.querySelector('#refresh_btn'),
            location_btn: document.querySelector('#location_btn'),
            openPopup: document.getElementById('open-popup'),
            popupContainer: document.getElementById('popup-container'),
            closePopup: document.getElementById('close-popup'),
            pulsantiContainer: document.getElementById('pulsantiContainer')
        }
    }
    
    initializeState() {
        this.WCSelected = ''
        this.BUnitSelected = ''
        this.printerLabelSet = false
        this.printerA4Set = false
    }
    
    setupEventListeners() {
        // Event listeners per i pulsanti
        this.elements.refresh_btn?.addEventListener('click', this.debounce(() => this.handleRefresh(), this.config.debounceDelay))
        this.elements.location_btn?.addEventListener('click', this.debounce(() => this.handleLocationClick(), this.config.debounceDelay))
        this.elements.closePopup?.addEventListener('click', this.debounce(() => this.handleClosePopup(), this.config.debounceDelay))
        this.elements.openPopup?.addEventListener('click', this.debounce(() => this.handleOpenPopup(), this.config.debounceDelay))
        
        // Observer per popup
        this.setupPopupObserver()
    }
    
    setupPopupObserver() {
        if (!this.elements.popupContainer) return
        
        const observer = new MutationObserver(async (mutations) => {
            mutations.forEach(async (mutation) => {
                if (mutation.attributeName === "style") {
                    if (window.getComputedStyle(this.elements.popupContainer).display === "none") {
                        console.log("Chiuso popup avanzamento fasi");
                        await this.handlePopupClose()
                    }
                }
            });
        });
        
        observer.observe(this.elements.popupContainer, {
            attributes: true,
            attributeFilter: ["style"],
        });
    }
    
    // Utility per debounce
    debounce(func, delay) {
        let timeoutId
        return (...args) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => func.apply(this, args), delay)
        }
    }
    
    // Handler methods
    async handleRefresh() {
        if (this.#isLoading) return
        this.initialData = []
        this.createTable()
        console.log('Aggiornamento dati da tasti aggiorna')
        await this.init(this.BUnitSelected, this.WCSelected, 1)
    }
    
    async handleLocationClick() {
        const locations = await Swal.fire({
            title: `Attenzione`,
            text: `Aprire ubicazioni?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Conferma',
            cancelButtonText: 'Annulla'
        })
        if (locations.isConfirmed) {
            await this.openLocations()
        }
    }
    
    async handleClosePopup() {
        console.log("Aggiornamento da chiusura popup avanzamento fasi - 2");
        await this.reload()
        this.elements.popupContainer.style.display = 'none';
        this.elements.closePopup.style.display = 'none';
    }
    
    async handleOpenPopup() {
        console.log("Aggiornamento da apertura popup avanzamento fasi");
        await this.reload(36000000)
        this.elements.popupContainer.style.display = 'block';
    }
    
    async handlePopupClose() {
        console.log('Aggiornamento da chiusura popup avanzamento fasi - 1')
        await this.init(this.BUnitSelected, this.WCSelected, 1)
        
        // Ripristina lo stato di scroll e evidenzia la riga dopo il reload
        setTimeout(() => {
            this.#restoreScrollStateFromPopup()
        }, 1500) // Piccolo delay per assicurarsi che la tabella sia renderizzata
    }
    
    setupTouchOptimizations() {
        // Prevenire zoom su double tap per tablet
        let lastTouchEnd = 0
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime()
            if (now - lastTouchEnd <= 300) {
                event.preventDefault()
            }
            lastTouchEnd = now
        }, false)
        
        // Ottimizzazioni per performance su tablet
        if ('ontouchstart' in window) {
            // Disabilita hover effects su dispositivi touch
            document.body.classList.add('touch-device')
            
            // Aggiungi feedback tattile per i pulsanti
            document.addEventListener('touchstart', (e) => {
                if (e.target.classList.contains('btn')) {
                    e.target.style.transform = 'scale(0.95)'
                }
            })
            
            document.addEventListener('touchend', (e) => {
                if (e.target.classList.contains('btn')) {
                    setTimeout(() => {
                        e.target.style.transform = ''
                    }, 150)
                }
            })
        }
    }

    async initializeWCSelect() {
        this.createWCSelect().then(async r => {
            // Se Stabilimento = 'Seleziona' allora non fa niente
            if (this.elements.BUnitSelect.value === 'Seleziona') return
            console.log('Aggiornamento dati da inizializzazione classe Sequence - createWCSelect')
            await this.init(this.BUnitSelected, this.WCSelected, 1)
        })


    }

    async init(Unit = this.BUnitSelected, WC = this.WCSelected, fastRefresh = 0) {
        if (this.#isLoading) return
        
        this.#isLoading = true
        this.#lastUpdateTime = Date.now()
        
        try {
            // Mostra loading indicator
            this.showLoadingState()
            
            this.initialData = await this.loadDataWithRetry(Unit, WC, fastRefresh)
            this.sortData()
            this.createTable()
            
            console.log("Aggiornamento da creazione tabella");
            await this.reload()
            
            document.getElementById("barcode")?.focus()
        } catch (error) {
            console.error('Errore durante il caricamento:', error)
            this.showErrorState(error.message)
        } finally {
            this.#isLoading = false
            this.hideLoadingState()
        }
    }
    
    async loadDataWithRetry(Unit, WC, fastRefresh, retryCount = 0) {
        try {
            return await loadData(Unit, WC, fastRefresh)
        } catch (error) {
            if (retryCount < this.config.maxRetries) {
                console.log(`Tentativo ${retryCount + 1} fallito, riprovo...`)
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
                return this.loadDataWithRetry(Unit, WC, fastRefresh, retryCount + 1)
            }
            throw error
        }
    }
    
    sortData() {
        this.initialData.sort((a, b) => {
            // Prima mette in coda tutti gli odp con DDT conto lavoro emesso
            if (a.ComponentsToPick > b.ComponentsToPick && a.Outsourced == '1') {
                return -1;
            }
            if (a.ComponentsToPick < b.ComponentsToPick && a.Outsourced == '1') {
                return 1;
            }
            // Poi mette in coda gli odp con flag prelevato
            if (a.Producible > b.Producible) {
                return 1;
            }
            if (a.Producible < b.Producible) {
                return -1;
            }

            // a parità di prelievo ordina per sequenza
            if (parseInt(a.Sequence) < parseInt(b.Sequence)) {
                return -1;
            }
            if (parseInt(a.Sequence) > parseInt(b.Sequence)) {
                return 1;
            }

            return 0;
        });
    }
    
    showLoadingState() {
        if (this.elements.tableRows) {
            // Usa un colspan dinamico basato sul numero di colonne dell'header
            const headerCells = document.querySelectorAll('thead th')
            const colspan = headerCells.length
            this.elements.tableRows.innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                        <div class="mt-2">Caricamento dati...</div>
                    </td>
                </tr>
            `
        }
    }
    
    hideLoadingState() {
        // Il loading state viene sostituito dal createTable()
    }
    
    showErrorState(message) {
        if (this.elements.tableRows) {
            // Usa un colspan dinamico basato sul numero di colonne dell'header
            const headerCells = document.querySelectorAll('thead th')
            const colspan = headerCells.length
            this.elements.tableRows.innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="text-center py-4 text-danger">
                        <i class="bi bi-exclamation-triangle-fill fs-1"></i>
                        <div class="mt-2">Errore nel caricamento: ${message}</div>
                        <button class="btn btn-outline-danger mt-2" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise me-1"></i>Ricarica pagina
                        </button>
                    </td>
                </tr>
            `
        }
    }

    async createWCSelect() {
        const ROOT = getRoot()
        let cdl = await getData(`${ROOT}/src/api/cdl.php`);
        console.log(cdl)
        const availableCdl = [...new Set(cdl.map(({WC}) => WC))]
        cdl = (cdl.filter(el => el.HasOdp === '1'))
        // Toglie da cdl tutte le postazioni ovvero cdl.IsWC = 0
        cdl = cdl.filter(el => el.IsWC === '1')
        const bunit = Object.keys(cdl.group('D2'))

        // Se ci sono 8 o meno elementi in cdl allora nasconde i dropdown e crea pulsanti diretti per le postazioni
        if (cdl.length <= 8) {
            // Nasconde i dropdown
            this.elements.BUnitSelect.style.display = 'none';
            this.elements.WCSelect.style.display = 'none';
            
            // Aggiunge un pulsante per ogni cdl e lo inserisce dentro il div con id="pulsantiContainer"
            for (const el of cdl) {
                const btn = document.createElement('button')
                btn.classList.add('btn', 'btn-secondary', 'm-2')
                const parts = el.Description.split('-');
                parts.shift(); // Rimuovi il primo elemento dall'array
                const rightPart = parts.join('-').trim();
                btn.innerText = rightPart
                // width:200px e height:60px
                btn.style.width = '200px';
                btn.style.height = '60px';
                this.elements.pulsantiContainer.appendChild(btn)
                
                btn.addEventListener('click', async () => {
                    this.initialData = []
                    this.createTable()
                    // associa a this.WCSelected il valore del cdl del pulsante cliccato
                    this.WCSelected = el.WC
                    this.BUnitSelected = el.D2.replaceAll(' ', '')
                    console.log('Aggiornamento dati da selezione cdl : ', el.D2, el.WC)
                    await this.init(el.D2, el.WC, 1) // Aggiornamento dati a selezione cdl
                })
            }
            
            // Imposta il div con id="pulsantiContainer" come display:flex
            this.elements.pulsantiContainer.style.display = 'flex';
            // gli elementi nel div con id="pulsantiContainer" devono essere allineati al centro in orizzontale e in basso in verticale
            this.elements.pulsantiContainer.style.justifyContent = 'center';
            this.elements.pulsantiContainer.style.alignItems = 'flex-end';
        } else {
            for (const unit of bunit) {
                this.elements.BUnitSelect.insertAdjacentHTML('beforeend', `<option value="${unit}">${unit}</option>`)
            }
            this.elements.BUnitSelect.addEventListener('change', () => {
                const val = this.elements.BUnitSelect.value
                let html = ''
                for (const unit of cdl.filter(el => el.D2 === val)) {
                    html += `<option ${!html.length ? 'selected' : ''} value="${unit.WC}">${unit.Description}</option>`
                }
                html += '<option value="ALL">Tutti</option>'
                this.elements.WCSelect.innerHTML = html
                this.initialData = []
                this.createTable()
            })
            this.elements.WCSelect.addEventListener('change', async () => {
                this.initialData = []
                this.WCSelected = this.elements.WCSelect.value
                this.BUnitSelected = this.elements.BUnitSelect.value.replaceAll(' ', '')
                this.createTable()
                console.log('Aggiornamento dati da selezione cdl')
                await this.init(this.BUnitSelected, this.WCSelected, 1) // Aggiornamento dati a selezione cdl
            })
        }

        // Event listeners già gestiti in setupEventListeners()
        const evt = new Event('change')
        this.elements.BUnitSelect.dispatchEvent(evt)
        //this.elements.WCSelect.dispatchEvent(evt)
    }

    createRow({
                  MOId
                  , RtgStep
                  , Serial
                  , Producible
                  , MONo
                  , ProductionNotes
                  , Item
                  , Itemdescription
                  , Qty
                  , Printed
                  , PrintedLabel
                  , ModulaMissionGenerated
                  , MagModula
                  , Location
                  , LocationODP
                  , Outsourced
                  , SubContractOrder
                  , OutsourcingToSend
                  , WCDescription
                  , BusinessUnit
                  , HasMissingItems
                  , InternalOrdNo
                  , CompanyName
                  , Sequence
                  , PreviousStep_MOStatus
                  , PreviousStep_MOId
                  , WC
                  , ComponentsToPick
                  , ProducableQty
                  , PickingModula
                  , PickingModulaDone
                  , Ritardo
                  , PlannedDate
                  , EstimatedUseDate
                  , LastMissingItem
              }) {
        let elencoUbicazioni = `<table class="">
                                <tbody id="${MONo}"
                                    <tr>
                                        <td><b>${LocationODP}</b></td>
                                    </tr>
                                    `
        const ubicazioni = Location.split(',').filter(el => el !== "")
        for (const key of ubicazioni) {
            elencoUbicazioni += `<tr><td>${key}</td></tr>`
        }
        elencoUbicazioni += `</tbody></table>`

        const uniqueId = 'id' + MOId + RtgStep + Serial
            , infoId = 'INFO' + uniqueId, prelevaId = 'XDS' + uniqueId
            , printId = 'PRN' + uniqueId
            , printLabelId = 'LBL' + uniqueId
            , isProduce = Producible === '1'
            , isOdp = Serial === '0'
            , hasNotes = ProductionNotes.trim() !== ''
            , printed = Printed === '1'
            , printedLabel = PrintedLabel === '1'
            , isInModula = MagModula === '1'
            , hasMission = ModulaMissionGenerated === '1'
            , outsourced = Outsourced
            , componentsToPick = ComponentsToPick == '0'


            , td1 = outsourced
                ? '<p id="open-popup" >' + MONo + '' + (SubContractOrder === '0' ? '' : `<br><b>(Ord.for. ${SubContractOrder})</p>`)
                : isOdp
                    ? ` <b id="open-popup" >${MONo}</b>${printed ? '<i class="bi bi-printer-fill m-2"></i>' : ''}`
                    : ` <b style="font-size: clamp(10px, 3vh, 20px);">${CompanyName.substring(0, 20)}</b><br>Ord.cli. <b>${InternalOrdNo}</b><br>
                            <b id="open-popup">${Serial}</b>`
            ,
            td2 = hasNotes ? `<div id="${infoId}" class="d-flex gap-2">${Item}<i class="bi bi-info-square-fill"></i></div>` : Item
            , td3 = Itemdescription
            , td4 = `` + (isNaN(parseInt(Qty))
                    ? '0'
                    : [parseInt(Qty), parseInt(ProducableQty) <= 0 || parseInt(ProducableQty) == parseInt(Qty) ? '' : `<b>(${parseInt(ProducableQty)})</b>`].join(' ')
            )
            , td5 = ''
            //, td5 = DateProdData?.myFormat('date')
            //, tdloc = `<b>${LocationODP}</b></br>`+`${Location.replaceAll(',', '<br>')}`
            , tdloc = elencoUbicazioni
            , tdSupplier = WCDescription.substring(9)
            , tdSequenza = Sequence
            ,
            td6A = isOdp ? '' : `<button type="button" class="btn ${printed ? 'btn-success' : 'btn-secondary'} w-100" id="${printId}" >${printed ? 'Ristampa' : 'Stampa'}</button>`
            ,
            td6B = isOdp ? '' : `<button type="button" class="btn bi bi-printer ${printedLabel ? 'btn-success' : 'btn-secondary'} w-100" id = "${printLabelId}" data-item ="${Item}"></button>`
            , td7 = isOdp && WC !== 'CC000020'
                ? `<button type="button" class="btn ${isProduce ? 'btn-danger' : 'btn-secondary'} w-100" id="${prelevaId}" >${isProduce ? 'Annulla' : 'Preleva'}</button>`
                : !hasMission && isInModula && BusinessUnit === 'COTTURA' && (!/^CC07|^CC06/.test(WC))
                    ? `<button type="button" class="btn btn-dark w-100" id="${prelevaId}" >Missione</button>`
                    : hasMission && isInModula && BusinessUnit === 'COTTURA' && (!/^CC07|^CC06/.test(WC))
                        ? `<button type="button" class="btn btn-warning w-100" id="${prelevaId}" >Etichetta</button>`
                        : ''
            ,
            tdModulaIcon = PickingModula == '1' ? `<i class="bi bi-check-circle-fill text-warning "></i>` : PickingModulaDone == '1' ? `<i class="bi bi-check-circle-fill text-success"></i>` : ''
        // Legenda per conto lavoro
        let trClass = 'xxx'
        let iconClass = '<i></i>'
        switch (Outsourced) {
            case '1':
                switch (OutsourcingToSend) {
                    case '-1': // Prelievo parziale conto lavoro
                        trClass = 'bg-gold'
                        break;
                    case '0': // Prelievo totale conto lavoro
                        trClass = 'bg-success'
                        break;
                    case '1': // Da prelevare conto lavoro
                        trClass = 'xxx'
                        break;
                    default:
                        trClass = 'xxx'
                        break;
                }
                break;
            case '0':
                switch (isProduce) {
                    case '1':
                        trClass = 'bg-success'
                        break;
                    default:
                        'xxx'
                        break;
                }
                break;
            default:
                trClass = 'xxx'
                break;
        }
        // Attesa fase precedente
        trClass = PreviousStep_MOStatus != 20578306 && PreviousStep_MOStatus != 0
            ? PreviousStep_MOId === MOId && Serial === '0'
                ? 'bg-danger'
                : 'xxx'
            : 'xxx'

        // Icona componenti mancanti
        switch (HasMissingItems) {
            case '1':
                //iconClass = `<i class="bi m-2 bi-exclamation-diamond text-danger"></i>`
                trClass = 'bg-danger'
                break;
            case '-1':
                //iconClass = `<i class="bi m-2 bi-exclamation-diamond text-danger"></i>`
                trClass = 'bg-gold'
                break;
            case '0':
                iconClass = '<i></i>'
                break;
            default:
                iconClass = '<i></i>'
        }
        // Prelevati per conto lavoro
        trClass = (componentsToPick && outsourced)
            ? 'bg-success'
            : trClass

        // Determina se mostrare la colonna stampa (solo per matricole)
        const hasSerial = Serial.substring(0, 3) === 'SN_'
        
        // Aggiorna header tabella dinamicamente
        document.querySelector("#th1").innerHTML = '<i class="bi bi-chevron-down"></i>'
        document.querySelector("#th2").innerText = 'Riga'
        document.querySelector("#th3").innerText = 'N.Ordine/Seriale'
        document.querySelector("#th4").innerText = 'Codice'
        document.querySelector("#th5").innerText = 'Descrizione'
        document.querySelector("#th6").innerText = 'Qta'
        document.querySelector("#th7").innerText = `${outsourced ? 'Fornitore' : Serial.substring(0, 3) !== 'SN_' ? 'Ubicazione' : ''}`
        
        // Mostra colonna stampa solo se c'è una matricola
        if (hasSerial) {
            document.querySelector("#th8").innerText = 'Stampa'
            document.querySelector("#th8").style.display = ''
        } else {
            document.querySelector("#th8").style.display = 'none'
        }
        
        document.querySelector("#th9").innerText = `${outsourced ? 'Ubicazione' : 'Azioni'}`
        const tr = document.createElement('tr')
        tr.classList.add(trClass)
        tr.id = MONo + '-' + Serial

        const rowContent = () => {
            let content = `
            <td id="Z${uniqueId}"><i class="bi bi-plus-square-fill fs-4"></i></td>
            <td>${LastMissingItem == '1' ? '<i class="bi bi-asterisk"></i>' : tdSequenza}</td>
            <td>${td1}</td>
            <td style="font-size:clamp(15px, 3vh, 20px);">${td2}</td>
            <td style="font-size:clamp(10px, 3vh, 20px);">${td3}</td>
            <td style="font-size:clamp(10px, 3vh, 20px); class="text-end">${td4}</td>
            <td>${outsourced ? tdSupplier : Serial.substring(0, 3) !== 'SN_' ? tdloc : ''}</td>`
            
            // Aggiungi colonna stampa solo se c'è una matricola
            if (hasSerial) {
                content += `<td>${Serial.substring(0, 3) === 'SN_' && !['CC070005', 'CC070010', 'CC070015', 'CC070020'].includes(WC) // Se è una matricola e il cdl NON è premontaggio allora mostra pulsante di stampa bindello
                    ? td6A
                    : Serial.substring(0, 3) === 'SN_' && ['CC070005', 'CC070010', 'CC070015', 'CC070020'].includes(WC) // Se cdl è premontaggio allora mostra pulsante di stampa etichetta
                        ? td6B
                        : ''}</td>`
            }
            
            content += `<td>${outsourced ? tdloc : td7}</td>`
            
            return content
        }
        const updateRow = () => {
            tr.innerHTML = rowContent()
        }
        updateRow()


        const expandTD = tr.querySelector('#Z' + uniqueId)

        tr.addEventListener('click', async (e) => {
            switch (e.target) {
                case tr.querySelector('#' + infoId):
                    if (hasNotes) await Swal.fire({icon: 'info', title: ProductionNotes})
                    break;
                case tr.querySelector('#' + printId):
                    if (printed && !await this.askPrintPassword()) break;
                    const b = await ClassSerial.init(Serial);
                    await b.printBindello();
                    // ricarica la pagina
                    await this.init(this.BUnitSelected, this.WCSelected, 1) // Aggiornamento dati con tasto stampa bindello
                    break;
                case tr.querySelector('#' + printLabelId):
                    /* Pulsante stampa etichetta */
                    let printLabelCheck = true;
                    let printSchemaCheck = false;
                    // Se il cdl è premontaggio cruscotti allora stampa etichetta + schema ellettrico in A4 altrimenti solo etichetta
                    if (['CC070010', 'CC000020'].includes(WC)) { 
                        // Swal con 2 checkbox: 1) stampa etichetta 2) stampa schema elettrico A4. Entrambe le checkbox sono selezionate di default su true. Se l'utente le deseleziona, allora non stampa.
                        const {value: formValues} = await Swal.fire({
                            title: 'Seleziona cosa stampare',
                            html: `<div class="d-grid justify-content-center text-start">
                                            <div class="form-check fs-2 my-3">
                                                <input class="form-check-input" type="checkbox" value="printLabel" id="printLabel" checked>
                                                <label class="form-check-label" for="printLabel">Etichetta
                                                </label>
                                            </div>
                                            <div class="form-check fs-2 my-3">
                                                <input class="form-check-input" type="checkbox" value="printSchema" id="printSchema" checked>
                                                <label class="form-check-label" for="printSchema">Schema elettrico A4
                                                </label>
                                            </div>
                                    </div>`,
                            focusConfirm: false,
                            preConfirm: () => {
                                return [
                                    document.getElementById('printLabel').checked,
                                    document.getElementById('printSchema').checked
                                ]
                            }
                        })
                        printLabelCheck = formValues[0];
                        printSchemaCheck = formValues[1];
                    } else {
                        const printQuestion = await Swal.fire({
                            title: `Attenzione`,
                            text: `Stampare etichetta?`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                            confirmButtonText: 'Conferma',
                            cancelButtonText: 'Annulla'
                        })
                        if (!printQuestion.isConfirmed) return;
                        printLabelCheck = true;
                    }

                    if (!this.printerLabelSet && printLabelCheck) {
                        // Imposta stampante etichette
                        const print = await (await SelectPrinter.init()).select(SelectPrinter.ZPLPrinters)
                        if (!print.isConfirmed) return 0
                        this.printerLabelSet = print.value
                    }

                    if (!this.printerA4Set && printSchemaCheck) {
                        // Imposta stampante A4
                        const print = await (await SelectPrinter.init()).select(SelectPrinter.A4Printers)
                        if (!print.isConfirmed) return 0
                        this.printerA4Set = print.value
                    }
                    console.log(this.printerA4Set)
                    // STAMPA SCHEMA ELETTRICO IN A4
                    if (printSchemaCheck) {
                        // Prende il codice articolo dalla riga cliccata
                        const itemCode = tr.querySelector('#' + printLabelId).dataset.item;
                        const item = await ItemClass.init(itemCode)
                        const res = await item.printElectricalDiagram(this.printerA4Set);

                    }
                    if (!printLabelCheck) return 0;
                    // Dati della matricola
                    const a = await ClassSerial.init(Serial);
                    // STAMPA ETICHETTA
                    const res = await a.printLabelFromWC(MOId, RtgStep, this.printerLabelSet);
                    Swal.fire({
                        title: 'Risultato operazione',
                        text: res.msg,
                        icon: res.success ? 'success' : 'error',
                        toast: true,
                        position: 'bottom-end',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                    })
                    // Se la stampa è andata a buon fine, aggiorna la classe del bottone con id '${printLabelId}'
                    if (res.success) {
                        document.getElementById(`${printLabelId}`).classList.remove('btn-secondary');
                        document.getElementById(`${printLabelId}`).classList.add('btn-success');
                    }

                    break;
                case tr.querySelector('#' + printId + 'CL'):
                    const compo = await getData('sequenceController.php', {
                        mode: 'components',
                        moid: MOId,
                        rtgstep: RtgStep,
                        serial: Serial
                    }, true)

                    if (compo.every(el => el.Picked === '1' && this.BUnitSelected === 'Contolavoro')) {
                        const packQty = await this.prepareCL() //arrivato qui
                        if (packQty) {
                            const cldata = this.initialData.filter(el => el.MOId === MOId)
                            const print = await postData('sequenceController.php', {
                                mode: 'CLLabel',
                                data: {rowinfo: cldata[0], qty: packQty, compo: compo}
                            })
                            console.log(print)
                        }
                    }
                    break;
                case tr.querySelector('#' + prelevaId):
                    if (isOdp && WC !== 'CC000020') {
                        if (!isProduce) {
                            await this.prelevaODP(MOId, RtgStep, WC)
                        } else {
                            await this.annullaPrelievo(MOId, RtgStep)
                        }
                        let searchValue = Serial == '0' ? MONo : Serial
                        ricercaBarcode(searchValue)
                        break
                    }
                    await this.preleva(Serial, ModulaMissionGenerated, MONo)
                    break;
                case tr.querySelector(`#open-popup`):
                    // Salva l'ID della riga cliccata prima di aprire il popup
                    this.#saveScrollStateForPopup(tr.id)
                    
                    const phaseProgress = await Swal.fire({
                        title: `Attenzione`,
                        text: `Aprire avanzamento fasi di lavoro?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Conferma',
                        cancelButtonText: 'Annulla'
                    })
                    if (phaseProgress.isConfirmed) {
                        let value = Serial === '0' || Serial === '' ? MONo : Serial
                        await this.openPhaseProgress(value)
                    }

                    break;
                case expandTD:
                case expandTD.firstElementChild:
                    let lastExpandedId = expandTD
                    const isClosed = [...expandTD.firstElementChild.classList].includes('bi-plus-square-fill')
                    const hiddenTR = document.getElementById('S' + uniqueId)
                    hiddenTR.classList.toggle('hidden')
                    expandTD.firstElementChild.classList.toggle('bi-dash-square', isClosed)
                    expandTD.firstElementChild.classList.toggle('bi-plus-square-fill', !isClosed)
                    
                    if (isClosed) {
                        // Stiamo aprendo la sezione
                        this.#expandedRows.add(uniqueId)
                        // Se i componenti non sono già caricati, caricali
                        if (!hiddenTR.dataset.componentsLoaded) {
                            await this.loadComponents(uniqueId, MOId, RtgStep, Serial)
                        }
                    } else {
                        // Stiamo chiudendo la sezione
                        this.#expandedRows.delete(uniqueId)
                    }
            }
        })

        return tr
    }

    async loadComponents(uniqueId, MOId, RtgStep, Serial) {
        const hiddenTR = document.getElementById('S' + uniqueId)
        
        hiddenTR.innerHTML = `
            <div class="d-flex justify-content-center align-items-center">
                    <div class="loading-spinner">
                        <div class="spinner-border" style="width: 2rem; height: 2rem;" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
            </div>`
            
        const components = await getData('sequenceController.php', {
            mode: 'components',
            moid: MOId,
            rtgstep: RtgStep,
            serial: Serial
        }, false)
        
        // Trova le informazioni dell'ODP dai dati iniziali
        const odpInfo = this.initialData.find(odp => 
            odp.MOId === MOId && 
            odp.RtgStep === RtgStep && 
            odp.Serial === Serial
        )
        
        hiddenTR.innerHTML = this.createComponents(components, odpInfo)
        hiddenTR.dataset.componentsLoaded = 'true'
        hiddenTR.dataset.moid = MOId
        hiddenTR.dataset.rtgstep = RtgStep
        hiddenTR.dataset.serial = Serial
        
        // Aggiungi event listener per il pulsante di chiusura nella testata
        this.setupCollapseButton(uniqueId)
        
        // Aggiungi event listener per il pulsante filtro
        this.setupFilterButton(uniqueId, components)
        


        hiddenTR.querySelectorAll("tr.sloestd").forEach(el => {
            const {
                component,
                neededqty: NeededQty,
                pickedqty: PickedQty,
                moid,
                serial,
                rtgstep,
                picked,
                uom,
                declaredmissing
            } = el.dataset
            this.alterRow(el, {
                component,
                NeededQty,
                PickedQty,
                moid,
                serial,
                rtgstep,
                Picked: picked === 'true',
                wasted: false,
                uom,
                declaredmissing
            })
        })
    }
    
    setupCollapseButton(uniqueId) {
        const hiddenTR = document.getElementById('S' + uniqueId)
        const collapseBtn = hiddenTR?.querySelector('.collapse-btn')
        
        if (collapseBtn) {
            // Rimuovi eventuali event listener precedenti per evitare duplicati
            const newCollapseBtn = collapseBtn.cloneNode(true)
            collapseBtn.parentNode.replaceChild(newCollapseBtn, collapseBtn)
            
            newCollapseBtn.addEventListener('click', (e) => {
                e.stopPropagation() // Previeni la propagazione dell'evento
                
                // Trova il pulsante di espansione nella riga principale
                const expandTD = document.querySelector('#Z' + uniqueId)
                if (expandTD) {
                    // Simula il click sul pulsante di espansione per chiudere
                    expandTD.click()
                } else {
                    console.warn('Pulsante di espansione non trovato per uniqueId:', uniqueId)
                }
            })
            
            // Aggiungi feedback visivo al click
            newCollapseBtn.addEventListener('touchstart', () => {
                newCollapseBtn.style.transform = 'scale(0.9)'
            })
            
            newCollapseBtn.addEventListener('touchend', () => {
                setTimeout(() => {
                    newCollapseBtn.style.transform = ''
                }, 150)
            })
            
            // Aggiungi un attributo per identificare il pulsante
            newCollapseBtn.setAttribute('data-unique-id', uniqueId)
        } else {
            console.warn('Pulsante di implosione non trovato per uniqueId:', uniqueId)
        }
    }
    
    // Metodo per verificare se il pulsante di implosione funziona
    checkCollapseButton(uniqueId) {
        const hiddenTR = document.getElementById('S' + uniqueId)
        const collapseBtn = hiddenTR?.querySelector('.collapse-btn')
        
        if (collapseBtn && collapseBtn.getAttribute('data-unique-id') === uniqueId) {
            return true
        }
        return false
    }
    
    // Setup del pulsante filtro per componenti mancanti
    setupFilterButton(uniqueId, components) {
        const hiddenTR = document.getElementById('S' + uniqueId)
        const filterBtn = hiddenTR?.querySelector('.filter-btn')
        
        if (!filterBtn) return
        
        // Conta i componenti con icona danger (mancanti)
        const missingComponents = components.filter(comp => {
            // Un componente è mancante se ha IsMissing = '1'
            return comp.IsMissing === '1'
        })
        
        // Mostra sempre il pulsante filtro se ci sono componenti
        if (components.length === 0) {
            filterBtn.style.display = 'none'
            return
        }
        
        let isFiltered = false
        
        filterBtn.addEventListener('click', () => {
            const componentRows = hiddenTR.querySelectorAll('tr.sloestd')
            
            if (!isFiltered) {
                // Filtra: mostra solo componenti con IsMissing = '1'
                componentRows.forEach(row => {
                    const component = row.dataset.component
                    const componentData = components.find(comp => comp.Component === component)
                    
                    // Debug: mostra i valori
                    console.log(`Componente: ${component}, IsMissing: ${componentData?.IsMissing}, Tipo: ${typeof componentData?.IsMissing}`)
                    
                    // Un componente è mancante se ha IsMissing = '1'
                    const isMissing = componentData && componentData.IsMissing == '1'
                    
                    if (isMissing) {
                        row.style.display = ''
                        row.classList.add('missing-highlight')
                        console.log(`Mostrando componente mancante: ${component}`)
                    } else {
                        row.style.display = 'none'
                    }
                })
                
                // Aggiorna il pulsante
                filterBtn.innerHTML = '<i class="bi bi-funnel-fill me-1"></i>Tutti'
                filterBtn.title = 'Mostra tutti i componenti'
                filterBtn.style.background = 'rgba(255, 193, 7, 0.2)'
                filterBtn.style.borderColor = 'rgba(255, 193, 7, 0.5)'
                
                isFiltered = true
            } else {
                // Mostra tutti i componenti
                componentRows.forEach(row => {
                    row.style.display = ''
                    row.classList.remove('missing-highlight')
                })
                
                // Aggiorna il pulsante
                filterBtn.innerHTML = '<i class="bi bi-funnel me-1"></i>Filtra'
                filterBtn.title = 'Mostra solo componenti mancanti'
                filterBtn.style.background = 'rgba(255,255,255,0.1)'
                filterBtn.style.borderColor = 'rgba(255,255,255,0.3)'
                
                isFiltered = false
            }
        })
        
        // Aggiungi feedback visivo
        filterBtn.addEventListener('touchstart', () => {
            filterBtn.style.transform = 'scale(0.95)'
        })
        
        filterBtn.addEventListener('touchend', () => {
            setTimeout(() => {
                filterBtn.style.transform = ''
            }, 150)
        })
    }
    

    async refreshExpandedComponents() {
        // Aggiorna solo le sezioni espanse
        for (const uniqueId of this.#expandedRows) {
            const hiddenTR = document.getElementById('S' + uniqueId)
            if (hiddenTR && hiddenTR.dataset.componentsLoaded === 'true') {
                const moid = hiddenTR.dataset.moid
                const rtgstep = hiddenTR.dataset.rtgstep
                const serial = hiddenTR.dataset.serial
                
                // Salva la posizione di scroll del contenitore dei componenti
                const scrollTop = hiddenTR.scrollTop
                
                await this.loadComponents(uniqueId, moid, rtgstep, serial)
                
                // Ripristina la posizione di scroll
                hiddenTR.scrollTop = scrollTop
                
                // Reimposta il pulsante di chiusura
                this.setupCollapseButton(uniqueId)
            }
        }
    }

    createComponents(components, odpInfo = null) {
        // Controlla se almeno un componente ha il campo Label compilato
        const hasLabel = components?.some(comp => comp.Label && comp.Label.trim() !== '');
        
        // Conta i componenti mancanti
        const missingComponents = components?.filter(comp => 
            comp.IsMissing === '1'
        ) || [];
        
        // Controlla se la riga è rossa (fase precedente non completata)
        const isRedRow = odpInfo && (odpInfo.LastMissingItem === '1' || odpInfo.Picked === '0');
        
        // Crea header fisso con info ODP se disponibili (solo se ci sono più di 5 componenti)
        const stickyHeader = (odpInfo && components.length > 5) ? `
            <div class="sticky-odp-header" style="
                position: sticky; 
                top: 45px; 
                z-index: 100; 
                background: linear-gradient(135deg, #404040  0%, #415495 100%);
                color: white;
                padding: 10px 15px;
                margin: -12px -12px 10px -12px;
                border-radius: 8px 8px 0 0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
                backdrop-filter: blur(10px);
                border-bottom: 2px solid rgba(255,255,255,0.1);
                border-radius: 8px;
            ">
                <div class="d-flex align-items-center gap-3">
                    <div class="odp-badge" style="
                        background: rgba(255,255,255,0.25);
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 0.9rem;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                    ">
                        <i class="bi bi-clipboard-data me-1"></i>ODP: ${odpInfo.MONo}
                    </div>
                    ${odpInfo.Serial !== '0' ? `
                    <div class="serial-badge" style="
                        background: rgba(255,255,255,0.25);
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 0.9rem;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                    ">
                        <i class="bi bi-upc-scan me-1"></i>${odpInfo.Serial}
                    </div>
                    ` : ''}
                    <div class="odp-item" style="
                        font-size: 0.8rem;
                        background: rgba(255,255,255,0.1);
                        padding: 4px 8px;
                        border-radius: 6px;
                    ">
                        <i class="bi bi-box me-1"></i>${odpInfo.Item}
                    </div>
                    ${isRedRow && missingComponents.length === 0 ? `
                    <div class="warning-badge" style="
                        background: rgba(255, 193, 7, 0.9);
                        color: #000;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 0.8rem;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        border: 1px solid rgba(255, 193, 7, 1);
                        animation: pulse-warning 2s infinite;
                    ">
                        <i class="bi bi-exclamation-triangle me-1"></i>Fase precedente non completata
                    </div>
                    ` : ''}
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-light filter-btn" 
                            id="filterMissingBtn_${odpInfo.MONo}_${odpInfo.Serial}"
                            style="
                                border: 1px solid rgba(255,255,255,0.3);
                                color: white;
                                background: rgba(255,255,255,0.1);
                                backdrop-filter: blur(10px);
                                transition: all 0.2s ease;
                                min-width: 44px;
                                min-height: 36px;
                                border-radius: 20px;
                                font-size: 0.8rem;
                                padding: 6px 12px;
                            "
                            onmouseover="this.style.background='rgba(255,255,255,0.2)'"
                            onmouseout="this.style.background='rgba(255,255,255,0.1)'"
                            title="Mostra solo componenti mancanti">
                        <i class="bi bi-funnel me-1"></i>Filtra ${missingComponents.length > 0 ? `(${missingComponents.length})` : ''}
                    </button>
                    <button class="btn btn-sm btn-outline-light collapse-btn" 
                            style="
                                border: 1px solid rgba(255,255,255,0.3);
                                color: white;
                                background: rgba(255,255,255,0.1);
                                backdrop-filter: blur(10px);
                                transition: all 0.2s ease;
                                min-width: 44px;
                                min-height: 36px;
                                border-radius: 50%;
                            "
                            onmouseover="this.style.background='rgba(255,255,255,0.2)'"
                            onmouseout="this.style.background='rgba(255,255,255,0.1)'"
                            title="Chiudi dettagli">
                        <i class="bi bi-chevron-up"></i>
                    </button>
                </div>
                <div class="odp-info" style="
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    max-width: 300px;
                ">
                    <div class="odp-description" style="
                        font-size: 0.75rem; 
                        opacity: 0.9;
                        background: rgba(255,255,255,0.1);
                        padding: 4px 8px;
                        border-radius: 6px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">
                        <i class="bi bi-info-circle me-1"></i>${odpInfo.Itemdescription?.substring(0, 40)}${odpInfo.Itemdescription?.length > 40 ? '...' : ''}
                    </div>
                    ${odpInfo.CompanyName ? `
                    <div class="odp-customer" style="
                        font-size: 0.75rem; 
                        opacity: 0.9;
                        background: rgba(255,255,255,0.1);
                        padding: 4px 8px;
                        border-radius: 6px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">
                        <i class="bi bi-person me-1"></i>Cliente: ${odpInfo.CompanyName?.substring(0, 30)}${odpInfo.CompanyName?.length > 30 ? '...' : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
        ` : '';
        
        let html = `${stickyHeader}<table class="table table-striped innerTable h-100">
                          <thead>
                            <tr>
                             <th class="hidden"></th>
                             <th>Codice</th>
                             <th>Descrizione</th>
                             ${hasLabel ? '<th>Etichetta</th>' : ''}
                             <th>Qta</th>
                             <th class="hidden">Da prelevare</th>
                             <th>Qta disponibile</th>
                             <th>Ubicazione</th>
                             <th></th>
                          </tr>
                        </thead>
                            <tbody>`
        components?.forEach(({
                                 Component,
                                 Description,
                                 Label,
                                 NeededQty,
                                 UoM,
                                 Location,
                                 MOId,
                                 Serial,
                                 RtgStep,
                                 Picked,
                                 IsMissing,
                                 PickedQty,
                                 AvailableQty,
                                 DeclaredMissing,
                                 PickableQty,
                                 NotEnter
                             }) => {


            let elencoUbicazioniCmp = `<table class="">
                                <tbody id="${MOId}" `
            const ubicazioni = Location.split(',').filter(el => el !== "")
            const ubicazioniMostrate = ubicazioni.slice(0, 5)
            const altreUbicazioni = ubicazioni.length > 5
            
            for (const key of ubicazioniMostrate) {
                elencoUbicazioniCmp += `<tr><td>${key}</td></tr>`
            }
            
            if (altreUbicazioni) {
                elencoUbicazioniCmp += `<tr><td><span style="color: #6c757d; font-style: italic; font-size: 0.9em;">+ Altre ${ubicazioni.length - 5}...</span></td></tr>`
            }
            
            elencoUbicazioniCmp += `</tbody></table>`

            // let toPick = Math.round((NeededQty - PickedQty + Number.EPSILON) * 100) / 100
            html += `<tr class="sloestd ${Picked ? 'bg-success' : ''} ${IsMissing ? 'bg-danger' : ''}" data-picked="${Picked}" data-component="${Component}" data-neededqty="${NeededQty}" data-pickedqty="${PickedQty}" data-moid="${MOId}" data-serial="${Serial}" data-rtgstep="${RtgStep}" data-uom="${UoM}" data-declaredmissing=${DeclaredMissing}>
                                                <td style="width: 10%" class="text-center hidden">${Picked === '0' ? `<button class="btn waste btn-sm btn-danger" > scarta </button>` : ''}</td>
                                                <td onClick="checkAndShowDrawing('${Component}')" style="${NotEnter == '1' ? 'color: darkblue;' : ''} cursor: pointer;" title="Clicca per vedere il disegno">${Component}</td>
                                                <td>${Description}</td>
                                                ${hasLabel ? `<td>${Label || ''}</td>` : ''}
                                                <td id = "qty" data-component="${Component}" data-moid="${MOId}" class="${IsMissing ? 'bg-danger' : ''}">${NeededQty}&nbsp${UoM}<i class="bi m-2 ${IsMissing ? 'bi-exclamation-diamond' : ''}"></i>${IsMissing && PickableQty > 0 ? ` <b>(` + parseInt(PickableQty) + `)</b>` : ''}</td>
                                                <td class="hidden"><span class="tpqty" >${PickedQty}&nbsp${UoM}</span></td>
                                                <td>${AvailableQty ?? '0'}&nbsp${UoM}</td>
                                                <td id="locations" data-component="${Component}" >${elencoUbicazioniCmp}</td>
                                                <td class="setMiss"></td>
                                                <td style="width: 10%" class="text-center" ><button type="button" class="btn btn-sm pick m-auto ${Picked ? 'btn-danger">Annulla' : 'btn-secondary">Preleva'}</button></td>
                                             </tr>`
        })
        html += `      
                            </tbody>
                        </table>`
        return html

    }

    // NUOVO METODO: Aggiornamento in-place senza ricreare elementi
    updateRowInPlace(trEl, {component, NeededQty, PickedQty, moid, serial, rtgstep, wasted, uom, declaredmissing}) {
        declaredmissing = parseInt(declaredmissing);
        const toPickQty = Math.round((NeededQty - PickedQty + Number.EPSILON) * 100) / 100
        
        // BATCH UPDATE - Riduce il re-render
        trEl.classList.add('batch-update')
        
        // Aggiorna solo i valori esistenti senza ricreare elementi
        const qtySpan = trEl.querySelector('.tpqty')
        const btnPick = trEl.querySelector('button.pick')
        const tdqty = trEl.querySelector('#qty')
        
        // Batch update dei contenuti
        if (qtySpan) {
            qtySpan.innerText = !toPickQty ? `` : toPickQty + ` ` + uom;
        }
        
        if (btnPick) {
            // Batch update delle classi
            btnPick.className = btnPick.className.replace(/btn-(danger|secondary)/g, '')
            btnPick.classList.add('btn', 'btn-sm', !toPickQty ? 'btn-danger' : 'btn-secondary')
            btnPick.innerText = !toPickQty ? 'Annulla' : 'Preleva'
        }
        
        if (tdqty) {
            // Aggiorna il dataset per mantenere la coerenza
            tdqty.dataset.component = component
            tdqty.dataset.moid = moid
        }
        
        // Batch update dei dataset della riga
        Object.assign(trEl.dataset, {
            picked: !toPickQty ? 'true' : 'false',
            component: component,
            neededqty: NeededQty,
            pickedqty: PickedQty,
            moid: moid,
            serial: serial,
            rtgstep: rtgstep,
            uom: uom,
            declaredmissing: declaredmissing
        })
        
        // Batch update delle classi CSS della riga
        trEl.className = trEl.className.replace(/bg-(success|danger|warning)/g, '')
        if (!toPickQty) {
            trEl.classList.add('bg-success')
        }
        
        // Rimuovi la classe batch-update dopo l'aggiornamento
        requestAnimationFrame(() => {
            trEl.classList.remove('batch-update')
        })
    }
    
    // Aggiorna i componenti espansi in-place senza ricaricare
    updateExpandedComponentsInPlace(uniqueId, component, pickedQty) {
        const componentContainer = document.getElementById('S' + uniqueId)
        if (!componentContainer) return
        
        // Trova la riga del componente specifico nei componenti espansi
        const componentRow = componentContainer.querySelector(`tr[data-component="${component}"]`)
        if (!componentRow) return
        
        // Aggiorna solo i valori necessari
        const qtySpan = componentRow.querySelector('.tpqty')
        const btnPick = componentRow.querySelector('button.pick')
        
        if (qtySpan) {
            const currentText = qtySpan.innerText
            const currentQty = parseFloat(currentText) || 0
            const newQty = Math.max(0, currentQty - pickedQty)
            const uom = currentText.split(' ').pop() || ''
            qtySpan.innerText = newQty > 0 ? `${newQty} ${uom}` : ''
        }
        
        if (btnPick) {
            const currentQty = parseFloat(qtySpan?.innerText) || 0
            btnPick.classList.remove('btn-danger', 'btn-secondary')
            btnPick.classList.add(currentQty > 0 ? 'btn-secondary' : 'btn-danger')
            btnPick.innerText = currentQty > 0 ? 'Preleva' : 'Annulla'
        }
        
        // Aggiorna le classi CSS della riga del componente
        componentRow.classList.remove('bg-success', 'bg-danger', 'bg-warning')
        const currentQty = parseFloat(qtySpan?.innerText) || 0
        if (currentQty === 0) {
            componentRow.classList.add('bg-success')
        }
    }
    
    // AGGIORNAMENTO COMPLETAMENTE ASINCRONO - Zero re-render
    scheduleAsyncUpdate(trEl, updateData) {
        // Usa requestAnimationFrame per sincronizzare con il refresh del browser
        requestAnimationFrame(() => {
            // Prima aggiorna la riga principale
            this.updateRowInPlace(trEl, updateData)
            
            // Poi aggiorna i componenti espansi se necessario
            if (updateData.wasExpanded) {
                this.updateExpandedComponentsInPlace(updateData.uniqueId, updateData.component, updateData.pickedQty)
                
                // Reimposta il pulsante di implosione dopo l'aggiornamento
                this.setupCollapseButton(updateData.uniqueId)
                
                // Reimposta il pulsante filtro (se necessario)
                const hiddenTR = document.getElementById('S' + updateData.uniqueId)
                if (hiddenTR && hiddenTR.dataset.componentsLoaded === 'true') {
                    // Ricarica i componenti per aggiornare il filtro
                    this.loadComponents(updateData.uniqueId, updateData.moid, updateData.rtgstep, updateData.serial)
                }
                
                // Verifica che il pulsante funzioni
                setTimeout(() => {
                    if (!this.checkCollapseButton(updateData.uniqueId)) {
                        console.warn('Ripristino pulsante di implosione per uniqueId:', updateData.uniqueId)
                        this.setupCollapseButton(updateData.uniqueId)
                    }
                }, 100)
            }
            
            // Infine ripristina lo scroll
            if (updateData.wasExpanded && updateData.expandedScrollPosition) {
                requestAnimationFrame(() => {
                    const tableContainer = document.querySelector('.table-responsive')
                    const componentContainer = document.getElementById('S' + updateData.uniqueId)
                    
                    if (tableContainer) {
                        tableContainer.scrollTop = updateData.expandedScrollPosition.container
                    }
                    if (componentContainer) {
                        componentContainer.scrollTop = updateData.expandedScrollPosition.component
                    }
                })
            }
        })
    }

    alterRow(trEl, {component, NeededQty, PickedQty, moid, serial, rtgstep, wasted, uom, declaredmissing}) {
        declaredmissing = parseInt(declaredmissing);
        
        // Salva lo stato di espansione per evitare il flash
        const uniqueId = 'id' + moid + rtgstep + serial
        const wasExpanded = this.#expandedRows.has(uniqueId)
        
        const tdWaste = trEl.firstElementChild
        const tdPick = trEl.lastElementChild
        const tdSetMiss = trEl.querySelector('.setMiss')
        const btnWaste = document.createElement('btn')
        const btnPick = document.createElement('btn')
        const btnSetMiss = document.createElement('btn')
        const qtySpan = trEl.querySelector('.tpqty')
        const toPickQty = Math.round((NeededQty - PickedQty + Number.EPSILON) * 100) / 100
        const tdlocations = trEl.querySelector('#locations')
        const tdqty = trEl.querySelector('#qty')
        let res;
        btnPick.classList.add('btn', 'btn-sm', !toPickQty ? 'btn-danger' : 'btn-secondary')
        btnSetMiss.classList.add('btn', 'btn-sm', declaredmissing ? 'btn-secondary' : 'btn-warning')
        btnWaste.classList.add('btn', 'btn-sm', wasted ? 'btn-warning' : 'btn-danger')
        btnPick.innerText = !toPickQty ? 'Annulla' : 'Preleva'
        btnWaste.innerText = wasted ? 'Annulla' : 'Scarta'
        btnSetMiss.innerHTML = !declaredmissing ? '<i class="bi bi-exclamation-diamond m-2"></i>' : '<i class="bi bi-x-octagon m-2 "></i>'
        qtySpan.innerText = !toPickQty ? `` : toPickQty + ` ` + uom;

        if (!toPickQty && wasted) {
            Swal.fire({
                title: 'Errore: contattare il responsabile',
                icon: 'danger',
                text: 'l\'articolo risulta prelevato e scartato'
            });
            return;
        }


        tdlocations.addEventListener('click', async () => {
            // Prende il componente cliccato
            const Component = tdlocations.dataset.component
            const item = await ItemClass.init(Component)
            await item.manageLocations({
                showAddLocation: false,
            })
        })

        tdqty.addEventListener('click', async () => {
            // Prende il componente cliccato e il moid
            const component = tdqty.dataset.component
            const moid = tdqty.dataset.moid
            const missingInfo = await getData('sequenceController.php', {
                mode: 'missingInfo',
                moid: moid,
                component: component,
            }, false)
            console.log(missingInfo)
            // Riceve un array con un solo oggetto con le info del componente: Component,Description, OrderType, Category, MOId, MONo, WCDescription, OperationDescription, MONoNotes, MOLocation, InternalOrdNo, Supplier, CompanyName
            // Apre una swal con le info del componente 
            const result = await Swal.fire({
                title: `<div class="justify-content-between fs-4 nav navbar text-white fw-normal">
                            <div> 
                                Informazioni mancante
                                ${missingInfo[0].Component}
                                ${missingInfo[0].Description}
                            </div>
                        </div>`,
                // Se OrderType = 'Acquisto' allora mostra: OrderType (tipo ordine),Category (stato ordine),InternalOrdNo (numero ordine),CompanyName (fornitore)
                // Se OrderType = 'Produzione' allora mostra: OrderType (tipo ordine),MONo (numero odp), OperationDescription (OPerazione), MOLocation(Ubicazione odp), MONoNotes (note odp), Printed (Odp stampato)
                // Il formato deve essere a due colonne, a sinistra il titolo a destra il valore
                html: missingInfo[0].OrderType === 'Acquisto' ? `
                                <div class="d-flex fs-5 justify-content-sm-around">
                                    <div class="fw-semibold">
                                        <div class="my-1">Tipo ordine</div>
                                        <div class="my-1">Stato ordine</div>
                                        <div class="my-1">Numero ordine</div>
                                        <div class="my-1">Fornitore</div>
                                    </div>
                                    <div class="">
                                        <div class="my-1">${missingInfo[0].OrderType}</div>
                                        <div class="my-1">${missingInfo[0].Category}</div>
                                        <div class="my-1">${missingInfo[0].InternalOrdNo}</div>
                                        <div class="my-1">${missingInfo[0].CompanyName}</div>
                                    </div>
                                </div>
                                ` : `
                                <div class="d-flex fs-5 justify-content-sm-around">
                                    <div class="fw-semibold">
                                        <div class="my-1">Tipo ordine</div>
                                        <div class="my-1">Numero ODP</div>
                                        <div class="my-1">Operazione</div>
                                        <div class="my-1">Ubicazione</div>
                                        <div class="my-1">Note</div>
                                        <div class="my-1">Stampato</div>
                                    </div>
                                    <div class="">
                                        <div class="my-1">${missingInfo[0].OrderType}</div>
                                        <div class="my-1">${missingInfo[0].MONo}</div>
                                        <div class="my-1">${missingInfo[0].OperationDescription}</div>
                                        <div class="my-1">${missingInfo[0].MOLocation}</div>
                                        <div class="my-1">${missingInfo[0].MONoNotes}</div>
                                        <div class="my-1">${missingInfo[0].Printed}</div>
                                    </div>
                                </div>
                                `,
                customClass: 'swal-medium',
                showCancelButton: true,
                confirmButtonText: 'Conferma',
                showConfirmButton: false,
                cancelButtonText: 'Esci',
                reverseButtons: true,
            })

        })

        btnPick.addEventListener('click', async () => {
            // Salva lo stato di espansione prima del prelievo
            const uniqueId = 'id' + moid + rtgstep + serial
            const wasExpanded = this.#expandedRows.has(uniqueId)
            const expandedScrollPosition = wasExpanded ? {
                container: document.querySelector('.table-responsive')?.scrollTop || 0,
                component: document.getElementById('S' + uniqueId)?.scrollTop || 0
            } : null
            
            let qty = '-' + NeededQty;
            if (toPickQty) {
                //dichiarazione prelevato

                // Parte commentata su richiesta di Zuliani/Girotto/Paglia/Zarro 11.10.2023. Non serve più dichiarare quanti pezzi ho prelevato.
                /*
                const html = `<div class="d-grid m-auto my-3 w-50">   
                         <h3 class="mx-auto text-center">Quantità prelevata</h3>
                         <input class=" mx-auto text-center fs-1 border-0" type="number" id="pickQuantity" name="pickQuantity" value="${toPickQty}" min="1.0" max="${toPickQty}">
                     </div>
                              <div>
                              <div class="w-100 d-flex ">
                                     <button class="btn btn-outline-dark inc-dec-btn text-center text-bg-secondary" id="pickedQtyMinus"><i class="bi bi-dash-lg"></i></button>
                                     <button class="btn btn-outline-dark inc-dec-btn text-center text-bg-secondary" id="pickedQtyPlus"><i class="bi bi-plus-lg"></i></button>
                              </div>
                             </div>`
                const result = await Swal.fire({
                    showCancelButton: true,
                    confirmButtonText: 'Preleva',
                    cancelButtonText: 'Annulla',
                    allowOutsideClick: false,
                    reverseButtons: true,
                    didOpen: () => {
                        const father = Swal.getContainer(), qtyInput = father.querySelector('#pickQuantity')
                        father.querySelector('#pickedQtyPlus').addEventListener('click', () => {
                            if (qtyInput.value * 1 + 1 > toPickQty) return
                            qtyInput.value++
                        })
                        father.querySelector('#pickedQtyMinus').addEventListener('click', () => {
                            if (qtyInput.value - 1 <= 0) return
                            qtyInput.value = (Math.round((qtyInput.value - 1 + Number.EPSILON) * 100) / 100)
                        })
                        qtyInput.addEventListener('input', (e) => {
                            const value = e.target.value
                            if (value === '') return
                            if (value > toPickQty) e.target.value = toPickQty
                            if (value < 0) e.target.value = 1
                        })
                        qtyInput.addEventListener('focusout', (e) => {
                            const value = e.target.value
                            if (value > toPickQty) e.target.value = toPickQty
                            if (value <= 0 || value === '') e.target.value = 1
                        })
                    },
                    html: html,
                    preConfirm: () => {
                        const value = document.querySelector('#pickQuantity').value
                        //controlli
                        if (value === '' || value > toPickQty || value <= 0) {
                            return false;
                        }
                        return {pickedQty: value}

                    }

                })
                if (!result.isConfirmed) return
                qty = result.value.pickedQty
                */
                qty = toPickQty
                /*
                //gestione ubicazione
                const itemData = await getData('sequenceController.php', {mode: 'item', item: component})
                const item = new Item(itemData)
                const movment = await item.askAction()
                */
            }

            try {
                res = await putData('sequenceController.php', {
                    mode: 'pickComponent',
                    moid: moid,
                    qty: qty,
                    serial: serial,
                    rtgstep: rtgstep,
                    component: component
                })
                console.log('Aggiornamento dati da prelievo componente')
            } catch (error) {
                console.error('Errore durante il prelievo:', error)
                throw error // Rilancia l'errore per gestirlo a livello superiore
            }
            

/* 03-07-2025 - Commentato per evitare di ricreare la tabella

            // Aggiorna solo i dati senza ricreare la tabella
            this.initialData = await loadData(this.BUnitSelected, this.WCSelected, 1)
            this.initialData.sort((a, b) => {
                // Prima mette in coda tutti gli odp con DDT conto lavoro emesso
                if (a.ComponentsToPick > b.ComponentsToPick && a.Outsourced == '1') {
                    return -1;
                }
                if (a.ComponentsToPick < b.ComponentsToPick && a.Outsourced == '1') {
                    return 1;
                }
                // Poi mette in coda gli odp con flag prelevato
                if (a.Producible > b.Producible) {
                    return 1;
                }
                if (a.Producible < b.Producible) {
                    return -1;
                }

                // a parità di prelievo ordina per sequenza
                if (parseInt(a.Sequence) < parseInt(b.Sequence)) {
                    return -1;
                }
                if (parseInt(a.Sequence) > parseInt(b.Sequence)) {
                    return 1;
                }

                // If both properties are equal, return 0
                return 0;
            });

            console.log('fastRefresh: 1')
            
            */
            
            
            // AGGIORNAMENTO COMPLETAMENTE ASINCRONO - Zero re-render
            this.scheduleAsyncUpdate(trEl, {
                component,
                NeededQty,
                PickedQty: (res.pickQty * 1 + PickedQty * 1),
                moid,
                serial,
                rtgstep,
                wasted,
                uom,
                declaredmissing,
                uniqueId,
                wasExpanded,
                expandedScrollPosition,
                pickedQty: res.pickQty
            })
            
            const compo = await getData('sequenceController.php', {
                mode: 'components',
                moid: moid,
                rtgstep: rtgstep,
                serial: serial
            }, false)
            if (compo.every(el => el.Picked === '1' && this.BUnitSelected === 'Contolavoro')) {
                const packQty = await this.prepareCL() //arrivato qui
                if (packQty) {
                    const cldata = this.initialData.filter(el => el.MOId === moid)
                    const print = await postData('sequenceController.php', {
                        mode: 'CLLabel',
                        data: {rowinfo: cldata[0], qty: packQty, compo: compo}
                    })
                }
            }
            
            // Mantieni la riga evidenziata senza cercarla di nuovo
            const currentRow = document.getElementById(compo[0].MONo + '-' + compo[0].Serial);
            if (currentRow) {
                currentRow.classList.add("highlighted");
                setTimeout(() => {
                    currentRow.classList.remove("highlighted");
                }, 3000);
            }
            
            // Aggiorna tutte le sezioni espanse
            await this.refreshExpandedComponents()
        })

        btnWaste.addEventListener('click', async () => {
            const declared = await declareNC(component, NeededQty, this.WCSelected, true, moid, rtgstep, serial)
            if (declared) {
                this.alterRow(trEl, {component, NeededQty, moid, serial, rtgstep, picked, wasted: declared})
            }
        })

        btnSetMiss.addEventListener('click', async () => {
            if (!declaredmissing) {
                const {isConfirmed} = await Swal.fire({
                    title: `Attenzione`,
                    text: `Vuoi dichiarare ${component} mancante ?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Si',
                    cancelButtonText: 'Annulla'
                })
                if (!isConfirmed) return;
                const {succeed, msg, id} = await postData('../Avanzamento Fasi/phaseController.php', {
                    mode: 'setMissing'
                    , serial: serial
                    , moid: moid
                    , rtgStep: rtgstep
                    , component: component
                    , wc: this.WCSelected
                })
                console.log(succeed, msg, id)
                if (succeed) {
                    this.alterRow(trEl, {
                        component,
                        NeededQty,
                        PickedQty,
                        moid,
                        serial,
                        rtgstep,
                        wasted,
                        declaredmissing: id
                    })
                }
                Swal.fire({
                    title: msg,
                    toast: true,
                    icon: succeed ? 'success' : 'error',
                    position: 'bottom-right',
                    showConfirmButton: false,
                    timer: 4000,
                })
            } else {
                const {isConfirmed} = await Swal.fire({
                    title: `Attenzione`,
                    text: `Vuoi ripristinare il componente?`,
                    icon: 'question',
                    showCancelButton: true,
                })
                if (!isConfirmed) return;
                const {
                    succeed,
                    msg
                } = await deleteData('../Avanzamento Fasi/phaseController.php', {
                    mode: 'removeMissingLog',
                    lineId: declaredmissing
                })
                if (succeed) {
                    this.alterRow(trEl, {
                        component,
                        NeededQty,
                        PickedQty,
                        moid,
                        serial,
                        rtgstep,
                        wasted,
                        declaredmissing: '0'
                    })
                }
                Swal.fire({
                    title: msg,
                    toast: true,
                    icon: succeed ? 'success' : 'error',
                    position: 'bottom-right',
                    showConfirmButton: false,
                    timer: 4000,
                })
            }

        })

        tdPick.innerHTML = ''
        tdWaste.innerHTML = ''
        tdSetMiss.innerHTML = ''
        trEl.classList.toggle('bg-success', !toPickQty)
        trEl.classList.toggle('bg-danger', wasted)

        if (!toPickQty) {
            tdPick.insertAdjacentElement('afterbegin', btnPick)
            tdWaste.insertAdjacentHTML('afterbegin', '<strong>Prelevato</strong>')
        } else if (wasted) {
            tdWaste.insertAdjacentElement('afterbegin', btnWaste)
            tdPick.insertAdjacentHTML('afterbegin', '<strong>Scartato</strong>')
        } else {
            tdWaste.insertAdjacentElement('afterbegin', btnWaste)
            tdPick.insertAdjacentElement('afterbegin', btnPick)
        }
        tdSetMiss.insertAdjacentElement('afterbegin', btnSetMiss)
    }

    // Metodo per salvare lo stato dell'ODP/matricola espanso
    #saveExpandedODPState() {
        const expandedRows = Array.from(this.#expandedRows).filter(rowId => {
            const row = document.getElementById(rowId)
            return row && (row.dataset.serial === '0' || row.dataset.serial?.substring(0, 3) === 'SN_')
        })
        
        if (expandedRows.length > 0) {
            this.#currentExpandedODP = expandedRows[0] // Prendi la prima riga espansa (ODP o matricola)
            this.#shouldMaintainExpansion = true
            
            // Salva la posizione di scroll del contenitore principale
            const tableContainer = document.querySelector('.table-responsive')
            this.#savedScrollPosition = tableContainer ? tableContainer.scrollTop : 0
            
            const rowType = this.#currentExpandedODP.includes('SN_') ? 'Matricola' : 'ODP'
            console.log('💾 Salvo stato', rowType, 'espanso:', this.#currentExpandedODP, 'Scroll:', this.#savedScrollPosition)
        }
    }

    // Metodo per salvare la posizione di scroll e la riga cliccata per il popup
    #saveScrollStateForPopup(clickedRowId) {
        const tableContainer = document.querySelector('.table-responsive')
        const scrollPosition = tableContainer ? tableContainer.scrollTop : 0
        
        // Salva nello sessionStorage per persistenza tra navigazioni
        sessionStorage.setItem('sequenceScrollPosition', scrollPosition.toString())
        sessionStorage.setItem('sequenceClickedRow', clickedRowId)
        
        console.log('💾 Salvo stato per popup - Scroll:', scrollPosition, 'Riga:', clickedRowId)
    }

    // Metodo per ripristinare la posizione di scroll e evidenziare la riga
    #restoreScrollStateFromPopup() {
        const savedScrollPosition = sessionStorage.getItem('sequenceScrollPosition')
        const savedClickedRow = sessionStorage.getItem('sequenceClickedRow')
        
        if (savedScrollPosition && savedClickedRow) {
            const tableContainer = document.querySelector('.table-responsive')
            const clickedRow = document.getElementById(savedClickedRow)
            
            if (tableContainer && clickedRow) {
                // Ripristina la posizione di scroll
                tableContainer.scrollTop = parseInt(savedScrollPosition)
                
                // Evidenzia la riga cliccata
                this.#highlightRow(clickedRow)
                
                console.log('🔄 Ripristino stato da popup - Scroll:', savedScrollPosition, 'Riga:', savedClickedRow)
            }
            
            // Pulisci il sessionStorage
            sessionStorage.removeItem('sequenceScrollPosition')
            sessionStorage.removeItem('sequenceClickedRow')
        }
    }

    // Metodo per evidenziare temporaneamente una riga
    #highlightRow(row) {
        // Rimuovi eventuali evidenziazioni precedenti
        document.querySelectorAll('.row-highlight, .row-highlight-pulse').forEach(el => {
            el.classList.remove('row-highlight', 'row-highlight-pulse')
        })
        
        // Usa l'evidenziazione con bordo lampeggiante (più visibile)
        row.classList.add('row-highlight-pulse')
        
        // Rimuovi l'evidenziazione dopo 3 secondi
        setTimeout(() => {
            row.classList.remove('row-highlight-pulse')
        }, 3000)
        
        console.log('✨ Evidenzio riga con bordo lampeggiante:', row.id)
        
        // Aggiungi anche un effetto di "shake" per attirare l'attenzione
        this.#shakeRow(row)
    }

    // Metodo per aggiungere un effetto "shake" alla riga
    #shakeRow(row) {
        row.style.animation = 'shake 0.5s ease-in-out'
        
        setTimeout(() => {
            row.style.animation = ''
        }, 500)
    }

    // Metodo per ripristinare lo stato dell'ODP/matricola espanso
    async #restoreExpandedODPState() {
        if (!this.#shouldMaintainExpansion || !this.#currentExpandedODP) {
            return
        }

        // Trova la riga nella nuova lista usando l'ID
        const newRow = document.getElementById(this.#currentExpandedODP)
        if (newRow) {
            // Ri-espandi la riga
            this.#expandedRows.add(this.#currentExpandedODP)
            newRow.classList.add('expanded')
            
            // Estrai i dati per caricare i componenti
            const moid = newRow.dataset.moid
            const rtgstep = newRow.dataset.rtgstep
            const serial = newRow.dataset.serial
            
            // Carica i componenti se non sono già caricati
            const hiddenTR = document.getElementById('S' + this.#currentExpandedODP)
            if (hiddenTR && !hiddenTR.dataset.componentsLoaded) {
                await this.loadComponents(this.#currentExpandedODP, moid, rtgstep, serial)
            }
            
            // Mostra i componenti
            const componentsRow = newRow.nextElementSibling
            if (componentsRow && componentsRow.classList.contains('components-row')) {
                componentsRow.style.display = 'table-row'
            }
            
            // Ripristina la posizione di scroll
            const tableContainer = document.querySelector('.table-responsive')
            if (tableContainer && this.#savedScrollPosition !== null) {
                setTimeout(() => {
                    tableContainer.scrollTop = this.#savedScrollPosition
                    console.log('🔄 Ripristino scroll position:', this.#savedScrollPosition)
                }, 150)
            }
            
            const rowType = this.#currentExpandedODP.includes('SN_') ? 'Matricola' : 'ODP'
            console.log('🔄 Ripristino stato', rowType, 'espanso:', this.#currentExpandedODP)
        }
        
        // Reset dello stato
        this.#shouldMaintainExpansion = false
        this.#currentExpandedODP = null
        this.#savedScrollPosition = null
    }

    async pickComponent() {
        const quest = picked ? `Vuoi prelevare ${component}?` : `Vuoi annullare Prelievo di ${component} ?`
        const conf = await Swal.fire({title: quest, showCloseButton: true, showConfirmButton: true,})
        if (!conf.isConfirmed) return
        
        // Salva lo stato dell'ODP espanso prima dell'aggiornamento
        this.#saveExpandedODPState()
        
        let a = await putData('sequenceController.php', {
            mode: picked ? 'pickComponent' : 'unPickComponent',
            moid: moid,
            qty: qty,
            serial: serial,
            rtgstep: rtgstep,
            component: component
        })
        console.log('Aggiornamento dati da preleva componente')
        let b = await this.init(this.BUnitSelected, this.WCSelected, 1) // Aggiornamento dati con tasto preleva componente
        console.log('fastRefresh: 1')
        
        return a;
    }

    createTable() {
        // Salva lo stato delle righe espanse prima di ricreare la tabella
        const wasExpanded = new Set(this.#expandedRows)
        
        this.elements.tableRows.innerHTML = ''
        this.#expandedRows.clear()
        
        for (const datum of this.initialData) {
            this.elements.tableRows.insertAdjacentElement('beforeend', this.createRow(datum))
            const uniqueId = 'id' + datum.MOId + datum.RtgStep + datum.Serial
            // Calcola il colspan dinamicamente: 9 colonne base + 1 se c'è una matricola
            const hasSerial = datum.Serial.substring(0, 3) === 'SN_'
            const colspan = hasSerial ? 9 : 8
            this.elements.tableRows.insertAdjacentHTML('beforeend', `<tr class=""><td class="p-0 ps-2" colspan="${colspan}"><div class="hidden" id="S${uniqueId}"></div></td></tr>`)
            
            // Se questa riga era espansa, riespandila
            if (wasExpanded.has(uniqueId)) {
                const expandTD = document.querySelector('#Z' + uniqueId)
                if (expandTD) {
                    // Simula un click per riaprire la sezione
                    setTimeout(() => {
                        expandTD.click()
                    }, 100)
                }
            }
        }
        
        // Aggiorna conteggio righe
        this.updateRowCount()
        
        // Setup scroll to top
        this.setupScrollToTop()
        
        // Se dobbiamo mantenere l'espansione di un ODP specifico, ripristinalo
        if (this.#shouldMaintainExpansion && this.#currentExpandedODP) {
            setTimeout(async () => {
                await this.#restoreExpandedODPState()
            }, 200) // Aspetta che la tabella sia completamente renderizzata
        }
    }
    
    updateRowCount() {
        // Calcola ODP prelevati (Producible = '1' e Serial = '0')
        const pickedODP = this.initialData.filter(item => 
            item.Producible === '1' && item.Serial === '0'
        )
        
        // Calcola pezzi in WIP (somma delle qta degli ODP prelevati)
        const wipPieces = pickedODP.reduce((sum, item) => {
            return sum + (parseInt(item.Qty) || 0)
        }, 0)
        
        // Calcola pezzi producibili (ODP non prelevati, senza mancanti, fase precedente chiusa)
        const allODP = this.initialData.filter(item => item.Serial === '0')
        console.log('Tutti gli ODP:', allODP.length)
        
        const produciblePieces = this.initialData.filter(item => {
            // Log specifico per l'ODP di esempio
            if (item.MONo === '25/60437') {
                console.log('🔍 ANALISI ODP 25/60437:')
                console.log('  - Serial:', item.Serial)
                console.log('  - Producible:', item.Producible)
                console.log('  - HasMissingItems:', item.HasMissingItems)
                console.log('  - PreviousStep_MOStatus:', item.PreviousStep_MOStatus)
                console.log('  - Qty:', item.Qty)
                console.log('  - Tutti i campi:', item)
            }
            
            // Deve essere un ODP (Serial = '0')
            if (item.Serial !== '0') {
                if (item.MONo === '25/60437') console.log('❌ 25/60437 - Escluso: Non è ODP')
                console.log('Escluso - Non è ODP:', item.MONo, 'Serial:', item.Serial)
                return false
            }
            
            // Non deve essere già prelevato
            if (item.Producible == '1') {
                if (item.MONo === '25/60437') console.log('❌ 25/60437 - Escluso: Già prelevato')
                console.log('Escluso - Già prelevato:', item.MONo, 'Producible:', item.Producible)
                return false
            }
            
            // Non deve avere componenti mancanti
            if (item.HasMissingItems == '1') {
                if (item.MONo === '25/60437') console.log('❌ 25/60437 - Escluso: Ha componenti mancanti')
                console.log('Escluso - Ha componenti mancanti:', item.MONo, 'HasMissingItems:', item.HasMissingItems)
                return false
            }
            
            // La fase precedente deve essere chiusa (PreviousStep_MOStatus = 20578306)
            // Se PreviousStep_MOStatus è undefined o null, consideralo come chiuso
            // Se PreviousStep_MOStatus è 20578306, la fase è chiusa (producibile)
            // Se PreviousStep_MOStatus è diverso da 20578306, la fase non è chiusa (non producibile)
            if (item.PreviousStep_MOStatus && item.PreviousStep_MOStatus != 20578306) {
                if (item.MONo === '25/60437') console.log('❌ 25/60437 - Escluso: Fase precedente non chiusa (Status:', item.PreviousStep_MOStatus, ')')
                console.log('Escluso - Fase precedente non chiusa:', item.MONo, 'Status:', item.PreviousStep_MOStatus)
                return false
            }
            
            if (item.MONo === '25/60437') console.log('✅ 25/60437 - Fase precedente OK (Status:', item.PreviousStep_MOStatus, ')')
            
            if (item.MONo === '25/60437') console.log('✅ 25/60437 - INCLUSO: ODP producibile!')
            console.log('✅ ODP producibile:', item.MONo, 'Qty:', item.Qty, 'Producible:', item.Producible, 'HasMissingItems:', item.HasMissingItems, 'PreviousStep_MOStatus:', item.PreviousStep_MOStatus)
            return true
        }).reduce((sum, item) => {
            return sum + (parseInt(item.Qty) || 0)
        }, 0)
        
        // Aggiorna i conteggi nel DOM
        const pickedCountElement = document.getElementById('pickedCount')
        const wipCountElement = document.getElementById('wipCount')
        const producibleCountElement = document.getElementById('producibleCount')
        
        if (pickedCountElement) {
            pickedCountElement.textContent = pickedODP.length
        }
        if (wipCountElement) {
            wipCountElement.textContent = wipPieces
        }
        if (producibleCountElement) {
            producibleCountElement.textContent = produciblePieces
        }
    }
    
    setupScrollToTop() {
        const scrollToTopBtn = document.getElementById('scrollToTop')
        const scrollToBottomBtn = document.getElementById('scrollToBottom')
        if (!scrollToTopBtn || !scrollToBottomBtn) return
        
        const tableContainer = document.querySelector('.table-responsive')
        if (!tableContainer) return
        
        // Funzione per aggiornare la visibilità dei pulsanti
        const updateScrollButtons = () => {
            const scrollTop = tableContainer.scrollTop
            const scrollHeight = tableContainer.scrollHeight
            const clientHeight = tableContainer.clientHeight
            const maxScroll = scrollHeight - clientHeight
            
            // Se la tabella non ha scroll, nascondi entrambi i pulsanti
            if (maxScroll <= 0) {
                scrollToTopBtn.style.display = 'none'
                scrollToBottomBtn.style.display = 'none'
                return
            }
            
            // Mostra/nascondi pulsante "Torna in cima"
            if (scrollTop > 300) {
                scrollToTopBtn.style.display = 'block'
            } else {
                scrollToTopBtn.style.display = 'none'
            }
            
            // Mostra/nascondi pulsante "Vai alla fine"
            if (scrollTop < maxScroll - 300) {
                scrollToBottomBtn.style.display = 'block'
            } else {
                scrollToBottomBtn.style.display = 'none'
            }
        }
        
        // Listener per lo scroll
        tableContainer.addEventListener('scroll', updateScrollButtons)
        
        // Click per tornare in cima
        scrollToTopBtn.addEventListener('click', () => {
            tableContainer.scrollTo({ top: 0, behavior: 'smooth' })
        })
        
        // Click per andare alla fine
        scrollToBottomBtn.addEventListener('click', () => {
            tableContainer.scrollTo({ 
                top: tableContainer.scrollHeight, 
                behavior: 'smooth' 
            })
        })
        
        // Inizializza la visibilità dei pulsanti
        updateScrollButtons()
    }

    async openPhaseProgress(value = 'prova') {
        document.getElementById("framePopUp").src = `../Avanzamento%20Fasi/index.php?inpt=${value}&popup=1`;
        //e.preventDefault();
        document.getElementById('popup-container').style.display = 'block';
    }

    async openLocations() {
        const ROOT = getRoot()
        document.getElementById("framePopUp").src = `${ROOT}/main/magazzino/ubicazioni/index.php?popup=1`;
        document.getElementById('popup-container').style.display = 'block';
        document.getElementById('close-popup').style.display = 'block';
    }

    async askPrintPassword() {
        // Password: IT2021@
        const controllo = await Swal.fire({
            title: 'Richiesta conferma dal responsabile',
            text: `Inserisci la password`,
            icon: 'question',
            customClass: 'swal-medium',
            showCloseButton: true,
            showConfirmButton: true,
            showCancelButton: true,
            focusConfirm: true,
            input: 'password',
            inputValidator: (value) => {
                if (value === 'IT2021@') {
                    return false
                }
                return 'password errata'
            },
        })
        return !!(controllo.isConfirmed && controllo.value === 'IT2021@');

    }

    async preleva(serial = '', generated, moNo = '') {
        console.log('serial', serial, 'generated', generated, 'moNo', moNo)
        const data = this.initialData.find(el => el.Serial === serial)
        // Crea HTML con un div all'interno del quale mostrare le opzioni disponibili con 2 pulsanti (Stampa etichetta e Genera missione) 
        let HTML = `<div class="d-grid justify-content-center align-items-center">
                        <button id="pickMission" type="button" class="btn btn-dark my-2 fs-5 ${generated == '1' ? 'hidden' : ''}">Genera missione + stampa etichette</button>
                        <button id="printLabel" type="button" class="btn btn-dark my-2 fs-5">Stampa etichette</button>
                    </div>`

        // Esegue una swal con HTML per chiedere se si vuole generare la missione nel magazzino Modula o si vuole stampare l'etichetta.
        const {isConfirmed} = await Swal.fire({
            title: generated == '1' ? 'Missione già generata, è possibile solo ristampare le etichette.' : `Cosa si desidera fare?`,
            html: HTML,
            icon: 'question',
            showCancelButton: true,
            showConfirmButton: false,
            cancelButtonText: 'Esci',
            customClass: 'swal-medium',
            // Se click su printLabel allora stampa etichetta, se click su pickMission allora genera missione + stampa etichetta
            didOpen: () => {
                document.getElementById('pickMission').addEventListener('click', () => {
                    Swal.close()
                    if (serial == '' || serial == '0') {
                        this.missionModulaByOdp(moNo, generated, data)
                    } else {
                        // Altrimenti esegue this.missionModula(serial, generated, data)
                        this.missionModula(serial, generated, data)
                    }
                    // Funzione stampa etichetta Magazizno Modula
                    this.printModulaLabel(serial)
                })
                document.getElementById('printLabel').addEventListener('click', () => {
                    Swal.close()
                    // Funzione stampa etichetta Magazizno Modula
                    this.printModulaLabel(serial)
                })
            },
        })
    }

    async printModulaLabel(serial) {
        const {printSuccess, printMsg} = await putData('sequenceController.php', {
            mode: 'printlabelmiss',
            serial: serial
        })
        Swal.fire({icon: printSuccess ? 'success' : 'error', title: printMsg})
    }

    async missionModula(serial, generated, data) {
        const {success, msg} = await putData('sequenceController.php', {
            mode: 'pick',
            serial: serial,
            generated: generated,
            labelData: data
        })
        Swal.fire({icon: success ? 'success' : 'error', title: msg})
        if (success) {
            const els = this.initialData.filter(({Serial}) => {
                return Serial === serial
            })
            els?.forEach((el) => {
                el.ModulaMissionGenerated = '1'
            })
            await this.init(this.BUnitSelected, this.WCSelected, 1) // Aggiornamento dati con missione Modula
        }
    }


    async printLabel(serial) {

        const print = await Swal.fire({
            title: `Vuoi stampare ?`,
            icon: `question`,
            showCancelButton: true,
            cancelButtonText: 'Annulla',
            confirmButtonText: 'Stampa',
            confirmButtonColor: 'rgba(54,148,206,0.98)',
            cancelButtonColor: 'gray',
            didOpen: () => {
                let printerNo = {
                    'cottura': 2
                    , 'lavaggio': 2
                    , 'forni': 4
                    , 'steel': 1
                    , 'conto lavoro': 1
                }
                Swal.getInput().value = printerNo[this.elements.BUnitSelect.value.toLowerCase()]
            },
            input: 'select',
            inputValue: window.localStorage.getItem('printer') ?? 1,
            inputOptions: {
                1: 'Steel',
                2: 'Cottura',
                3: 'Logistica',
                4: 'Forni'
            },
            inputValidator: (value) => {
                return [1, 2, 3, 4].includes(value)
            },
            iconHtml: '<i class="bi bi-printer-fill"></i>',
        })

        if (!print.isConfirmed) return

        window.localStorage.setItem('printer', print.value)

        const results = await putData('sequenceController.php', {mode: 'print', serial: serial, printer: print.value}) // Riga da copiare per stampa bindelli
        const icon = (a) => {
            return a ? '<i style="color: green" class="bi bi-check-lg"></i>' : '<i style="color: darkred" class="bi bi-x-lg"></i>'
        }
        let html = `<table class="table table-sm">
                    <thead><tr><th>Seriale</th><th>Codice</th><th>Modello</th><th>Descrizione</th><th>In stampa</th><th>Log inserito</th></tr></thead>
                    <tbody>`
        results?.forEach(({serial, item, model, description, printed, log}) => {
            html += `<tr><td>${serial}</td><td>${item}</td><td>${model}</td><td>${description}</td><td>${icon(printed)}</td><td>${icon(log)}</td></tr>`
        })
        html += `</tbody></table>`
        await Swal.fire({title: 'Risultati operazione', width: 1200, html: html, showConfirmButton: true})

        const els = this.initialData.filter(({Serial}) => {
            return results.map(el => el.serial).includes(Serial)
        })
        els?.forEach((el) => {
            el.Printed = '1'
        })
        await this.init(this.BUnitSelected, this.WCSelected, 1) // Aggiornamento dati con stampa bindello
    }

    async prelevaODP(moid, rtgStep, WC) {

        // Se cdl è piegatura (piegatrici e pannellatura)
        if (WC.substring(2, 4) === '02') {

            const codes = []

            const getHtml = () => {
                let html = `<div style="height: 50vh"><table class="table" >
                          <thead>
                            <tr>
                                <th>Odp</th>
                                <th>Codice</th>
                                <th>Descrizione</th>
                            </tr>
                         </thead>
                          <tbody>`
                codes.forEach(({MONo, Item, ItemDescription}) => {
                    //html+=`<tr><td>${el.item}</td><td>${el.serial}</td><td>${el.description}</td></tr>`
                    html += `<tr><td>${MONo}</td><td>${Item}</td><td>${ItemDescription}</td></tr>`
                })
                html += `</tbody>
                      </table></div>`
                return html
            }

            const invet = Swal.mixin({

                input: 'text',
                width: 700,
                inputAttributes: {
                    autofocus: true
                },
                html: getHtml(),
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Annulla',
                showDenyButton: true,
                denyButtonText: 'Conferma',
                denyButtonColor: '#4b4b4a',
                reverseButtons: true,
                // focus su getinput
                didOpen: () => {
                    Swal.getInput().focus()
                    Swal.getInput().select()
                },
                inputValidator: async (value) => {
                    const odp = await this.getODPInfo(value);

                    if (odp[0] === undefined) {
                        errorSound();
                        Swal.getDenyButton().disabled = !codes.length;
                        // svuota input e ritorna errore
                        Swal.getInput().value = '';
                        return 'Odp non trovato';
                    } else if (odp[0].IsCurrentWC == 0) {
                        codes.push(odp[0]);
                        Swal.getInput().value = '';
                        warningSound();
                        cuteToast({
                            type: 'info',
                            title: 'Attenzione: Odp non presente in questa lista',
                            message: '',
                            timer: 3000
                        })
                    } else {
                        codes.push(odp[0]);
                        Swal.getInput().value = '';
                        successSound();
                    }
                },
                preConfirm: () => {
                    invet.update({html: getHtml(), title: `Odp da prelevare (${codes.length})`});
                    Swal.getInput().focus()
                    Swal.getInput().select()
                    return false;
                }
            });

            const modalLoc = await Swal.fire({
                title: 'Inserisci ubicazione di destinazione (Facoltativa)',
                input: 'text',
                inputAttributes: {
                    autocapitalize: 'on'
                },
                showCancelButton: true,
                confirmButtonText: 'Prosegui',
                showLoaderOnConfirm: true,
                inputValidator: async (val) => {
                    const data = await getData('\\MAGOPANEL\\src\\api\\inputCheck.php', {'input': val})
                    if (data.InputType === 'Location' || val === '') {
                        return false
                    } else {
                        errorSound()
                        return 'Inserisci un ubicazione valida'
                    }
                },
                preConfirm: async (input) => {
                    if (input === '') return {input: ''}
                    return await getData('\\MAGOPANEL\\src\\api\\inputCheck.php', {'input': input})
                },
                backdrop: true,
                allowOutsideClick: () => !Swal.isLoading()
            })

            if (!modalLoc.isConfirmed) return
            const result = await invet.fire({
                title: `ODP da prelevare`,
            })
            if (!codes.length && result.isDenied) {
                errorSound()
                await Swal.fire('Errore!', `Seleziona almeno un codice`, `error`)
                return
            }
            if (result.isDenied) {
                // Aggiornamento ubicazioni
                const codesAll = codes.map(el => {
                    return {
                        item: el.Item,
                        monoShort: el.MONo.replaceAll('/', ''),
                        location: modalLoc.value.input,
                        rtgStep: el.RtgStep
                    }
                })
                const results = await this.updateAllOdpLocation(codesAll)
                await Promise.all(codes?.map(async (el) => {
                    console.log('Prelievo odp MOId:', el.MOId, ' RtgStep:', el.RtgStep);
                    await putData('sequenceController.php', {mode: 'pickOdp', moid: el.MOId, rtgStep: el.RtgStep});
                    return el;
                }));

                console.log('Aggiornamento dati con funzione prelievo multiplo odp');
                console.log('fastRefresh: 1');
            }
            // Se gli odp sono stati trasferiti sul cdl CT020201 (Pannellatrice P4) allora crea anche la playlist attraverso putData passando mode: "playlist", WC: "CT020201"
            if (modalLoc.value.input === 'CT020201') {
                // Attesa di 3 secondi per permettere al server di aggiornare i dati delle ubicazioni
                await new Promise(r => setTimeout(r, 3000));
                const res = await putData('sequenceController.php', {mode: 'playlist', wc: WC})
                // toast con messaggio di successo o errore res.msg res.success (true/false)
                await Swal.fire({
                    title: res.success ? 'Playlist creata' : res.msg,
                    toast: true,
                    icon: res.success ? 'success' : 'error',
                    position: 'top-right',
                    showConfirmButton: false,
                    timer: 4000,
                })
            }
            await this.init(this.elements.BUnitSelect.value.replaceAll(' ', ''), this.WCSelected, 1) // Aggiornamento dati con funzione prelievo multiplo odp 
        }
        // Se cdl NON è piegatura 
        else {
            const modalLoc = await Swal.fire({
                title: 'Inserisci ubicazione di destinazione (Facoltativa)',
                input: 'text',
                inputAttributes: {
                    autocapitalize: 'on'
                },
                showCancelButton: true,
                confirmButtonText: 'Prosegui',
                showLoaderOnConfirm: true,
                inputValidator: async (val) => {
                    const data = await getData('\\MAGOPANEL\\src\\api\\inputCheck.php', {'input': val})
                    if (data.InputType === 'Location' || val === '') {
                        return false
                    } else {
                        return 'Inserisci un ubicazione valida'
                    }
                },
                preConfirm: async (input) => {
                    if (input === '') return {input: ''}
                    return await getData('\\MAGOPANEL\\src\\api\\inputCheck.php', {'input': input})
                },
                backdrop: true,
                allowOutsideClick: () => !Swal.isLoading()
            })
            if (modalLoc.isConfirmed) {
                const {item, mono_Short} = await this.getMoNofromMoId(moid)
                const a = await this.updateOdpLocation(item, mono_Short, modalLoc.value.input)

                //funzione prelievo
                const res = await putData('sequenceController.php', {mode: 'pickOdp', moid: moid, rtgStep: rtgStep})
                if (res) {
                    const els = this.initialData.filter(({MOId, RtgStep}) => {
                        return (MOId === moid && RtgStep === rtgStep)
                    })
                    els?.forEach(el => {
                        el.Producible = '1'
                    })
                    await this.init(this.elements.BUnitSelect.value.replaceAll(' ', ''), this.WCSelected, 1) // Aggiornamento dati con tasto preleva singolo odp
                    console.log('fastRefresh: 1')
                    res ? successSound() : errorSound()
                    Swal.fire({
                        icon: res ? 'success' : 'error',
                        title: res ? `Prelievo ${item} eseguito` : 'C\'è stato un errore'
                    })
                }

            }
        }
    }

    async getMoNofromMoId(moid) {
        return await getData('sequenceController.php', {mode: 'item', moid: moid})
    }

    async updateOdpLocation(item, monoShort, newLoc = '') {
        const res = await postData('sequenceController.php', {
            mode: 'updateOdpLocation',
            item: item,
            monoShort: monoShort,
            location: newLoc
        })
        return res
    }

    async updateAllOdpLocation(odps, location) {
        const res = await postData('sequenceController.php', {
            mode: 'updateAllOdpLocation',
            odps: odps,
            location: location
        })
        return res
    }

    async getODPInfo(MONo = '') {
        const res = await getData('sequenceController.php', {mode: 'getODPInfo', MONo: MONo, WC: this.WCSelected})
        return res
    }

    async annullaPrelievo(moid, rtgStep) {
        const confirm = await Swal.fire({
            title: `Vuoi annullare il prelievo ODP ?`,
            icon: `question`,
            showCancelButton: true,
            cancelButtonText: 'Esci',
            confirmButtonText: 'Conferma',
            confirmButtonColor: 'rgba(54,148,206,0.98)',
            cancelButtonColor: 'gray'
        })
        if (!confirm.isConfirmed) return
        //funzione prelievo
        const res = await putData('sequenceController.php', {mode: 'unPickOdp', moid: moid, rtgStep: rtgStep})
        if (res) {
            const els = this.initialData.filter(({MOId, RtgStep}) => {
                return (MOId === moid && RtgStep === rtgStep)
            })
            els?.forEach(el => {
                el.Producible = '0'
            })
        }
        console.log('Aggiornamento dati con tasto annulla prelievo')
        let b = await this.init(this.BUnitSelected, this.WCSelected, 1) // Aggiornamento dati con tasto annulla prelievo
        console.log('fastRefresh: 1')
        res ? successSound() : errorSound()
        Swal.fire({
            icon: res ? 'success' : 'error',
            title: res ? 'Prelievo annullato correttamente' : 'C\'è stato un errore'
        })

    }

    async prepareCL() {
        const packLimit = 20
        const html = `<div class="d-grid m-auto my-3 w-50">   
                         <h3 class="mx-auto text-center">Numero colli preparati per generare etichette</h3>
                         <input class=" mx-auto text-center" type="number" id="packQuantity" value="1" min="1" max="${packLimit}">
                     </div>
                              <div>
                              <div class="w-100 d-flex ">
                                     <button class="btn btn-outline-dark inc-dec-btn text-center " id="pickedQtyMinus"><i class="bi bi-dash-lg"></i></button>
                                     <button class="btn btn-outline-dark inc-dec-btn text-center " id="pickedQtyPlus"><i class="bi bi-plus-lg"></i></button>
                              </div>
                             </div>`
        const result = await Swal.fire({
            showCancelButton: true,
            confirmButtonText: 'Stampa',
            cancelButtonText: 'Annulla',
            allowOutsideClick: false,
            reverseButtons: true,
            didOpen: () => {
                const father = Swal.getContainer(), qtyInput = father.querySelector('#packQuantity')
                father.querySelector('#pickedQtyPlus').addEventListener('click', () => {
                    if (qtyInput.value * 1 + 1 > packLimit) return
                    qtyInput.value++
                })
                father.querySelector('#pickedQtyMinus').addEventListener('click', () => {
                    if (qtyInput.value - 1 <= 0) return
                    qtyInput.value = (Math.round((qtyInput.value - 1 + Number.EPSILON) * 100) / 100)
                })
                qtyInput.addEventListener('input', (e) => {
                    const value = e.target.value
                    if (value === '') return
                    if (value > packLimit) e.target.value = packLimit
                    if (value < 0) e.target.value = 1
                })
                qtyInput.addEventListener('focusout', (e) => {
                    const value = e.target.value
                    if (value > packLimit) e.target.value = packLimit
                    if (value <= 0 || value === '') e.target.value = 1
                })
            },
            html: html,
            preConfirm: () => {
                const value = document.querySelector('#packQuantity').value
                //controlli
                if (value === '' || value > packLimit || value <= 0) {
                    return false;
                }
                return value

            }

        })
        if (!result.isConfirmed) return false
        return result.value


    }

    async reload(value = 20000) {
        return;
        console.log('Aggiornamento dati da funzione reload')
        setTimeout(async () => {
            await this.init(this.BUnitSelected, this.WCSelected, 1)
        }, value) // Se Unit = conto lavoro allora aggiornamento automatico con esecuzione SP: MD_SP_ListeDiPrelievo
        document.getElementById("barcode").focus();
    }

}

console.log('DOM fully loaded and parsed');
new Sequence()
document.getElementById("barcode").focus();


document.addEventListener("keydown", function (event) {
    if (event.keyCode === 13) { // 13 è il codice ASCII per il tasto "invio"
        ricercaBarcode();
    }
});

document.getElementById("barcode").addEventListener("input", function () {
    const barcodeValue = this.value;
    console.log("Barcode letto:", barcodeValue);
    document.getElementById("barcode").value = barcodeValue;
});

document.addEventListener("keyup", function (event) {
    if (event.keyCode !== 13 && !event.shiftKey) {
        // Seleziona l'elemento "barcode"
        const barcodeElement = document.getElementById("barcode");
        // Imposta il valore del campo "barcode"
        barcodeElement.value = document.getElementById("barcode").value + event.key
    }
});


function ricercaBarcode(MONo = 'XX') {
    document.getElementById("barcode").focus();
    let barcode = document.getElementById("barcode").value;
    document.getElementById("barcode").value = "";
    barcode = MONo === 'XX' ? barcode : MONo
    if (barcode == '') {
        return;
    }
    console.log(barcode)
    const tableRows = document.querySelectorAll("#tableRows tr");

    for (let i = 0; i < tableRows.length; i++) {
        const rowData = tableRows[i].querySelectorAll("td");
        for (let j = 0; j < rowData.length; j++) {
            const cellData = rowData[j].textContent;
            if (cellData.includes(barcode)) {
                tableRows[i].classList.add("highlighted"); // Aggiungi la classe "highlighted" alla riga
                setTimeout(() => { // Imposta un timer per rimuovere la classe dopo 2 secondi
                    tableRows[i].classList.remove("highlighted");
                }, 3000);
                tableRows[i - 3 < 0 ? 0 : i - 3].scrollIntoView();

                return;
            }
        }
    }
    alert("Nessun risultato trovato");
    document.getElementById("barcode").focus();
}

            