import React, { useState } from 'react';
import { 
    BookOpen, 
    Calculator, 
    Settings, 
    Lightbulb, 
    AlertCircle, 
    CheckCircle, 
    Info,
    ArrowRight,
    Code,
    Database,
    Zap
} from 'lucide-react';

// ========================================
// COMPONENTE WIKI PER SISTEMA DATI NOTI
// ========================================

const KnownDataWiki = () => {
    const [activeSection, setActiveSection] = useState('overview');

    const sections = [
        { id: 'overview', title: 'Panoramica', icon: BookOpen },
        { id: 'how-it-works', title: 'Come Funziona', icon: Settings },
        { id: 'examples', title: 'Esempi Pratici', icon: Calculator },
        { id: 'configuration', title: 'Configurazione', icon: Database },
        { id: 'best-practices', title: 'Best Practices', icon: Lightbulb },
        { id: 'troubleshooting', title: 'Risoluzione Problemi', icon: AlertCircle }
    ];

    const renderOverview = () => (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <BookOpen className="h-6 w-6" />
                    Cos'è il Sistema "Dati Noti"?
                </h2>
                <p className="text-blue-800 text-lg leading-relaxed">
                    Il sistema "Dati Noti" è una funzionalità avanzata che permette di calcolare automaticamente 
                    i costi dei materiali e delle operazioni utilizzando <strong>parametri predefiniti</strong> e 
                    <strong>formule personalizzate</strong>, invece di utilizzare solo i costi fissi memorizzati nel database.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Vantaggi Principali
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Calcoli automatici basati su formule reali</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Parametri aggiornabili senza modificare il codice</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Matching intelligente per codici simili</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Test delle formule prima dell'utilizzo</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        Quando Usarlo
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>Materiali con costi variabili (es. per peso, lunghezza)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>Operazioni con costi complessi</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>Quando i costi standard non sono sufficienti</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>Per standardizzare i calcoli aziendali</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Importante
                </h3>
                <p className="text-yellow-800">
                    Il sistema "Dati Noti" ha <strong>priorità inferiore</strong> rispetto ai costi standard. 
                    Se un articolo ha già un <code className="bg-yellow-100 px-1 rounded">UnitCost</code> definito, 
                    quello verrà utilizzato al posto dei "dati noti".
                </p>
            </div>
        </div>
    );

    const renderHowItWorks = () => (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    Come Funziona il Sistema
                </h2>

                <div className="space-y-8">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            1
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Configurazione Parametri
                            </h3>
                            <p className="text-gray-700 mb-3">
                                Definisci i parametri specifici per ogni materiale o operazione (es. €/kg, kg/mt, €/mm).
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <code className="text-sm text-gray-800">
                                    TUBO: €/kg = 6, kg/mt = 3<br/>
                                    SALDATURA: €/mm = 0.015
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            2
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Creazione Formule
                            </h3>
                            <p className="text-gray-700 mb-3">
                                Crea formule matematiche che utilizzano i parametri e i valori dalla BOM (L, QTA).
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <code className="text-sm text-gray-800">
                                    TUBO: €/kg * kg/mt * L * QTA<br/>
                                    SALDATURA: €/mm * L * QTA
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            3
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Regole di Matching
                            </h3>
                            <p className="text-gray-700 mb-3">
                                Definisci come associare i "dati noti" agli articoli della BOM (esatto, contiene, tag).
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <code className="text-sm text-gray-800">
                                    EXACT: "TUBO" → match esatto<br/>
                                    CONTAINS: "TUBO" → match in "TUBO IN ACCIAIO"<br/>
                                    TAG: "TUBO" → match per parola chiave
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            4
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Calcolo Automatico
                            </h3>
                            <p className="text-gray-700 mb-3">
                                Durante la costificazione BOM, il sistema cerca i "dati noti" e calcola automaticamente i costi.
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <code className="text-sm text-gray-800">
                                    1. Cerca match per articolo/operazione<br/>
                                    2. Applica formula con parametri<br/>
                                    3. Sostituisce L e QTA dalla BOM<br/>
                                    4. Calcola costo finale
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Logica di Priorità
                </h3>
                <div className="space-y-2 text-green-800">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">1.</span>
                        <span>Se esiste <code className="bg-green-100 px-1 rounded">UnitCost</code> → usa quello</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">2.</span>
                        <span>Se <code className="bg-green-100 px-1 rounded">UnitCost = 0</code> → cerca "dati noti"</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">3.</span>
                        <span>Se trova "dati noti" → calcola con formula</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">4.</span>
                        <span>Se non trova "dati noti" → usa <code className="bg-green-100 px-1 rounded">UnitCost = 0</code></span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderExamples = () => (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Calculator className="h-6 w-6" />
                    Esempi Pratici
                </h2>

                {/* Esempio TUBO */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Esempio 1: TUBO</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-3">Configurazione</h4>
                            <div className="space-y-2 text-sm">
                                <div><strong>Codice:</strong> TUBO</div>
                                <div><strong>Tipo:</strong> MATERIAL</div>
                                <div><strong>Parametri:</strong></div>
                                <ul className="ml-4 space-y-1">
                                    <li>€/kg = 6</li>
                                    <li>kg/mt = 3</li>
                                </ul>
                                <div><strong>Formula:</strong></div>
                                <code className="block bg-blue-100 p-2 rounded mt-1">
                                    €/kg * kg/mt * L * QTA
                                </code>
                            </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-3">Calcolo</h4>
                            <div className="space-y-2 text-sm">
                                <div><strong>Dati BOM:</strong></div>
                                <ul className="ml-4 space-y-1">
                                    <li>L = 650 (lunghezza in mm)</li>
                                    <li>QTA = 0.75 (quantità)</li>
                                </ul>
                                <div><strong>Calcolo:</strong></div>
                                <code className="block bg-green-100 p-2 rounded mt-1">
                                    6 * 3 * 650 * 0.75 = 8,775€
                                </code>
                                <div className="text-lg font-bold text-green-800 mt-2">
                                    Risultato: 8,775€
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Esempio SALDATURA */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Esempio 2: SALDATURA</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-3">Configurazione</h4>
                            <div className="space-y-2 text-sm">
                                <div><strong>Codice:</strong> SALDATURA</div>
                                <div><strong>Tipo:</strong> OPERATION</div>
                                <div><strong>Parametri:</strong></div>
                                <ul className="ml-4 space-y-1">
                                    <li>€/mm = 0.015</li>
                                </ul>
                                <div><strong>Formula:</strong></div>
                                <code className="block bg-blue-100 p-2 rounded mt-1">
                                    €/mm * L * QTA
                                </code>
                            </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-3">Calcolo</h4>
                            <div className="space-y-2 text-sm">
                                <div><strong>Dati BOM:</strong></div>
                                <ul className="ml-4 space-y-1">
                                    <li>L = 650 (lunghezza in mm)</li>
                                    <li>QTA = 1 (quantità)</li>
                                </ul>
                                <div><strong>Calcolo:</strong></div>
                                <code className="block bg-green-100 p-2 rounded mt-1">
                                    0.015 * 650 * 1 = 9.75€
                                </code>
                                <div className="text-lg font-bold text-green-800 mt-2">
                                    Risultato: 9.75€
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Esempio BARRA */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Esempio 3: BARRA</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-3">Configurazione</h4>
                            <div className="space-y-2 text-sm">
                                <div><strong>Codice:</strong> BARRA</div>
                                <div><strong>Tipo:</strong> MATERIAL</div>
                                <div><strong>Parametri:</strong></div>
                                <ul className="ml-4 space-y-1">
                                    <li>€/kg = 4</li>
                                    <li>kg/mt = 1.2</li>
                                </ul>
                                <div><strong>Formula:</strong></div>
                                <code className="block bg-blue-100 p-2 rounded mt-1">
                                    €/kg * kg/mt * L * QTA
                                </code>
                            </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-3">Calcolo</h4>
                            <div className="space-y-2 text-sm">
                                <div><strong>Dati BOM:</strong></div>
                                <ul className="ml-4 space-y-1">
                                    <li>L = 650 (lunghezza in mm)</li>
                                    <li>QTA = 1.5 (quantità)</li>
                                </ul>
                                <div><strong>Calcolo:</strong></div>
                                <code className="block bg-green-100 p-2 rounded mt-1">
                                    4 * 1.2 * 650 * 1.5 = 4,680€
                                </code>
                                <div className="text-lg font-bold text-green-800 mt-2">
                                    Risultato: 4,680€
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderConfiguration = () => (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Database className="h-6 w-6" />
                    Configurazione del Sistema
                </h2>

                <div className="space-y-8">
                    {/* Parametri */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Parametri</h3>
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-gray-700 mb-3">
                                I parametri sono i valori numerici utilizzati nelle formule (es. €/kg, kg/mt, €/mm).
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Campi Obbligatori:</h4>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• <strong>Codice Articolo:</strong> Identificativo univoco</li>
                                        <li>• <strong>Tipo Dato:</strong> MATERIAL o OPERATION</li>
                                        <li>• <strong>Nome Parametro:</strong> es. "€/kg", "kg/mt"</li>
                                        <li>• <strong>Valore Parametro:</strong> Valore numerico</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Campi Opzionali:</h4>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• <strong>Descrizione:</strong> Descrizione del parametro</li>
                                        <li>• <strong>Unità di Misura:</strong> es. "€", "kg", "mt"</li>
                                        <li>• <strong>Stato:</strong> Attivo/Non Attivo</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formule */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Formule</h3>
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-gray-700 mb-3">
                                Le formule definiscono come calcolare il costo utilizzando i parametri e i valori dalla BOM.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Operatori Supportati:</h4>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• <strong>+</strong> Addizione</li>
                                        <li>• <strong>-</strong> Sottrazione</li>
                                        <li>• <strong>*</strong> Moltiplicazione</li>
                                        <li>• <strong>/</strong> Divisione</li>
                                        <li>• <strong>( )</strong> Parentesi</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Variabili BOM:</h4>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• <strong>L:</strong> Lunghezza (sempre dalla BOM)</li>
                                        <li>• <strong>QTA:</strong> Quantità (sempre dalla BOM)</li>
                                        <li>• <strong>Parametri:</strong> Valori configurati</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Regole di Matching */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Regole di Matching</h3>
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-gray-700 mb-3">
                                Le regole di matching definiscono come associare i "dati noti" agli articoli della BOM.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">EXACT</h4>
                                    <p className="text-sm text-gray-700">
                                        Match esatto del codice articolo. Esempio: "TUBO" matcha solo "TUBO".
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">CONTAINS</h4>
                                    <p className="text-sm text-gray-700">
                                        Match se il codice contiene il valore. Esempio: "TUBO" matcha "TUBO IN ACCIAIO".
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">TAG</h4>
                                    <p className="text-sm text-gray-700">
                                        Match per parola chiave. Esempio: "TUBO" matcha "TUBO IN ACCIAIO SPESSORE 2MM".
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBestPractices = () => (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Lightbulb className="h-6 w-6" />
                    Best Practices
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">✅ Cosa Fare</h3>
                        
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">Nomenclatura Consistente</h4>
                            <p className="text-sm text-green-800">
                                Usa nomi parametri standardizzati come "€/kg", "kg/mt", "€/mm" per facilitare la manutenzione.
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">Test delle Formule</h4>
                            <p className="text-sm text-green-800">
                                Testa sempre le formule con valori reali prima di utilizzarle in produzione.
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">Documentazione</h4>
                            <p className="text-sm text-green-800">
                                Documenta sempre il significato dei parametri e delle formule per facilitare la manutenzione.
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">Priorità delle Regole</h4>
                            <p className="text-sm text-green-800">
                                Imposta priorità alte per regole specifiche e basse per regole generiche.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">❌ Cosa Evitare</h3>
                        
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold text-red-900 mb-2">Formule Complesse</h4>
                            <p className="text-sm text-red-800">
                                Evita formule troppo complesse. Usa solo operazioni base: +, -, *, /, ().
                            </p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold text-red-900 mb-2">Parametri Duplicati</h4>
                            <p className="text-sm text-red-800">
                                Non creare parametri duplicati con nomi diversi per lo stesso concetto.
                            </p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold text-red-900 mb-2">Regole Conflittuali</h4>
                            <p className="text-sm text-red-800">
                                Evita regole di matching che potrebbero creare conflitti o ambiguità.
                            </p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold text-red-900 mb-2">Valori Non Testati</h4>
                            <p className="text-sm text-red-800">
                                Non utilizzare parametri o formule senza averli testati con dati reali.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Suggerimenti per l'Organizzazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800">
                    <div>
                        <h4 className="font-semibold mb-2">Per Materiali:</h4>
                        <ul className="text-sm space-y-1">
                            <li>• Raggruppa per famiglia (es. TUBI, BARRE, LAMIERE)</li>
                            <li>• Usa parametri standard (€/kg, kg/mt, €/m²)</li>
                            <li>• Definisci formule semplici e chiare</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Per Operazioni:</h4>
                        <ul className="text-sm space-y-1">
                            <li>• Raggruppa per tipo (es. SALDATURA, TAGLIO, PUNZONATURA)</li>
                            <li>• Usa parametri specifici (€/mm, €/foro, €/taglio)</li>
                            <li>• Considera tempi di setup e lavorazione</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTroubleshooting = () => (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <AlertCircle className="h-6 w-6" />
                    Risoluzione Problemi
                </h2>

                <div className="space-y-6">
                    {/* Problema 1 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            ❌ Il sistema non usa i "dati noti"
                        </h3>
                        <div className="space-y-2 text-gray-700">
                            <p><strong>Possibili cause:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>L'articolo ha già un <code className="bg-gray-100 px-1 rounded">UnitCost</code> &gt; 0</li>
                                <li>I "dati noti" non sono configurati correttamente</li>
                                <li>Le regole di matching non trovano corrispondenze</li>
                                <li>Il parametro <code className="bg-gray-100 px-1 rounded">@UseKnownData</code> è disattivato</li>
                            </ul>
                            <p><strong>Soluzioni:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Verifica che <code className="bg-gray-100 px-1 rounded">UnitCost = 0</code> per l'articolo</li>
                                <li>Controlla la configurazione dei parametri e delle formule</li>
                                <li>Testa le regole di matching con il tool di test</li>
                                <li>Assicurati che <code className="bg-gray-100 px-1 rounded">@UseKnownData = 1</code></li>
                            </ul>
                        </div>
                    </div>

                    {/* Problema 2 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            ❌ Il calcolo restituisce 0
                        </h3>
                        <div className="space-y-2 text-gray-700">
                            <p><strong>Possibili cause:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>La formula contiene errori di sintassi</li>
                                <li>I parametri non sono definiti correttamente</li>
                                <li>I valori L o QTA dalla BOM sono 0 o NULL</li>
                                <li>La funzione di valutazione matematica ha errori</li>
                            </ul>
                            <p><strong>Soluzioni:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Usa il tool di test per verificare la formula</li>
                                <li>Controlla che tutti i parametri siano definiti</li>
                                <li>Verifica i valori L e QTA nella BOM</li>
                                <li>Testa la formula con valori semplici</li>
                            </ul>
                        </div>
                    </div>

                    {/* Problema 3 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            ❌ Il matching non funziona
                        </h3>
                        <div className="space-y-2 text-gray-700">
                            <p><strong>Possibili cause:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Le regole di matching non sono configurate</li>
                                <li>Il tipo di matching non è appropriato</li>
                                <li>La priorità delle regole è sbagliata</li>
                                <li>Le regole sono disattivate</li>
                            </ul>
                            <p><strong>Soluzioni:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Crea regole di matching appropriate</li>
                                <li>Usa EXACT per match precisi, CONTAINS per match parziali</li>
                                <li>Imposta priorità alte per regole specifiche</li>
                                <li>Verifica che le regole siano attive</li>
                            </ul>
                        </div>
                    </div>

                    {/* Problema 4 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            ❌ Errori di sintassi nelle formule
                        </h3>
                        <div className="space-y-2 text-gray-700">
                            <p><strong>Possibili cause:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Caratteri non supportati nella formula</li>
                                <li>Parentesi non bilanciate</li>
                                <li>Operatori non validi</li>
                                <li>Nomi parametri sbagliati</li>
                            </ul>
                            <p><strong>Soluzioni:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Usa solo operatori supportati: +, -, *, /, ( )</li>
                                <li>Bilancia tutte le parentesi</li>
                                <li>Verifica i nomi dei parametri</li>
                                <li>Testa la formula con il tool di test</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Tool di Debug
                </h3>
                <div className="text-yellow-800">
                    <p className="mb-3">
                        Utilizza il tool di test integrato per verificare i calcoli prima di utilizzarli in produzione:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Test Calcolo:</strong> Verifica che la formula funzioni correttamente</li>
                        <li><strong>Debug Mode:</strong> Attiva il debug nella costificazione BOM per vedere i dettagli</li>
                        <li><strong>Log di Audit:</strong> Controlla i log per identificare problemi</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return renderOverview();
            case 'how-it-works':
                return renderHowItWorks();
            case 'examples':
                return renderExamples();
            case 'configuration':
                return renderConfiguration();
            case 'best-practices':
                return renderBestPractices();
            case 'troubleshooting':
                return renderTroubleshooting();
            default:
                return renderOverview();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Wiki Sistema "Dati Noti"
                    </h1>
                    <p className="text-gray-600">
                        Guida completa per l'utilizzo e la configurazione del sistema di calcolo automatico dei costi
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="lg:w-64 flex-shrink-0">
                        <nav className="bg-white rounded-lg shadow-sm p-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Indice</h2>
                            <ul className="space-y-2">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <li key={section.id}>
                                            <button
                                                onClick={() => setActiveSection(section.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                                    activeSection === section.id
                                                        ? 'bg-blue-100 text-blue-900 font-medium'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {section.title}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnownDataWiki;
