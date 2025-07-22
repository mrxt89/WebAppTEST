// Frontend/src/components/AttachmentListWithDirectOpen.jsx
import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    ExternalLink,
    Trash2,
    Edit3,
    Lock,
    Unlock,
    AlertTriangle,
    CheckCircle,
    Info
} from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { config } from '../config';
import { swal } from '../lib/common';
import axiosInstance from '../lib/axios';

const AttachmentListWithDirectOpen = ({ 
    attachments, 
    onDelete, 
    onDownload, 
    onUpdate,
    canModify = () => true 
}) => {
    const [openMethod, setOpenMethod] = useState('direct');
    const [showSetupGuide, setShowSetupGuide] = useState(false);
    const [lockedFiles, setLockedFiles] = useState({});
    const [isCheckingLocks, setIsCheckingLocks] = useState(false);

    useEffect(() => {
        // Controlla se l'utente ha già configurato l'apertura diretta
        const hasSetup = localStorage.getItem('direct-open-setup');
        if (!hasSetup) {
            setShowSetupGuide(true);
        }

        // Controlla i lock dei file
        checkFileLocks();
    }, [attachments]);

    const checkFileLocks = async () => {
        if (!attachments || attachments.length === 0) return;
        
        setIsCheckingLocks(true);
        const locks = {};
        
        for (const attachment of attachments) {
            try {
                const response = await axiosInstance.get(
                    `/check-file-lock/${attachment.AttachmentID}`
                );
                
                if (response.data.isLocked) {
                    locks[attachment.AttachmentID] = response.data;
                }
            } catch (error) {
                console.error('Error checking lock:', error);
            }
        }
        
        setLockedFiles(locks);
        setIsCheckingLocks(false);
    };

    const handleDirectOpen = async (attachment) => {
        try {
            // Controlla se il file è bloccato
            const lock = lockedFiles[attachment.AttachmentID];
            if (lock && lock.isLocked) {
                const result = await swal.fire({
                    title: 'File in uso',
                    text: `Questo file è attualmente in modifica da ${lock.lockedBy}. Vuoi aprirlo in sola lettura?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Apri in sola lettura',
                    cancelButtonText: 'Annulla'
                });
                
                if (!result.isConfirmed) return;
            }

            // Genera il link SMB
            const response = await axiosInstance.post(
                '/generate-smb-link',
                {
                    attachmentId: attachment.AttachmentID,
                    filePath: attachment.FilePath
                }
            );

            if (response.data.success) {
                const { smbPath, fileLink } = response.data;
                
                // Prova prima con il protocol handler personalizzato
                if (openMethod === 'custom-protocol') {
                    window.location.href = `myapp://open/${encodeURIComponent(smbPath)}`;
                } else {
                    // Usa il link file:// standard
                    const link = document.createElement('a');
                    link.href = fileLink;
                    link.target = '_blank';
                    link.click();
                    
                    // Se non è bloccato, bloccalo per questo utente
                    if (!lock || !lock.isLocked) {
                        await lockFile(attachment.AttachmentID);
                    }
                }
                
                // Mostra istruzioni se è la prima volta
                if (!localStorage.getItem('direct-open-used')) {
                    setTimeout(() => {
                        swal.fire({
                            title: 'Apertura file',
                            html: `
                                <p>Il file dovrebbe aprirsi nell'applicazione predefinita.</p>
                                <p class="mt-2"><strong>Se non si apre:</strong></p>
                                <ol class="text-left mt-2">
                                    <li>Installa l'estensione "Local Explorer" in Chrome</li>
                                    <li>Oppure copia questo percorso: <code>${smbPath}</code></li>
                                    <li>E incollalo in Esplora Risorse</li>
                                </ol>
                            `,
                            icon: 'info'
                        });
                    }, 1000);
                    
                    localStorage.setItem('direct-open-used', 'true');
                }
            }
        } catch (error) {
            console.error('Error opening file:', error);
            swal.fire('Errore', 'Impossibile aprire il file', 'error');
        }
    };

    const lockFile = async (attachmentId) => {
        try {
            await axiosInstance.post(`/lock-file/${attachmentId}`, {});
            
            // Aggiorna lo stato locale
            await checkFileLocks();
        } catch (error) {
            console.error('Error locking file:', error);
        }
    };

    const unlockFile = async (attachmentId) => {
        try {
            await axiosInstance.post(`/unlock-file/${attachmentId}`, {});
            
            // Aggiorna lo stato locale
            await checkFileLocks();
            
            swal.fire('Successo', 'File sbloccato', 'success');
        } catch (error) {
            console.error('Error unlocking file:', error);
            swal.fire('Errore', 'Impossibile sbloccare il file', 'error');
        }
    };

    const SetupGuide = () => (
        <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
                <div className="mt-2">
                    <h4 className="font-semibold">Prima configurazione - Apertura diretta file</h4>
                    <p className="mt-2">Per aprire i file direttamente dal server:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Installa l'estensione "Local Explorer" dal Chrome Web Store</li>
                        <li>Configura l'estensione per permettere i link file://</li>
                        <li>I file si apriranno direttamente nelle applicazioni (AutoCAD, Office, etc.)</li>
                    </ol>
                    <div className="mt-3 flex gap-2">
                        <Button 
                            size="sm" 
                            onClick={() => {
                                window.open('https://chrome.google.com/webstore/search/local%20explorer', '_blank');
                            }}
                        >
                            Installa Estensione
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                                localStorage.setItem('direct-open-setup', 'true');
                                setShowSetupGuide(false);
                            }}
                        >
                            Ho già configurato
                        </Button>
                    </div>
                </div>
            </AlertDescription>
        </Alert>
    );

    return (
        <div className="space-y-4">
            {showSetupGuide && <SetupGuide />}
            
            <div className="space-y-2">
                {attachments.map((attachment) => {
                    const isLocked = lockedFiles[attachment.AttachmentID];
                    const canEdit = canModify(attachment);
                    
                    return (
                        <div 
                            key={attachment.AttachmentID} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <FileText className="h-5 w-5 text-gray-500" />
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{attachment.FileName}</p>
                                    <p className="text-xs text-gray-500">
                                        {(attachment.FileSizeKB / 1024).toFixed(2)} MB
                                        {isLocked && (
                                            <span className="ml-2 text-orange-600">
                                                <Lock className="inline h-3 w-3 mr-1" />
                                                In uso da {isLocked.lockedBy}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {/* Pulsante Apri (principale) */}
                                <Button
                                    size="sm"
                                    onClick={() => handleDirectOpen(attachment)}
                                    title="Apri file direttamente"
                                >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Apri
                                </Button>
                                
                                {/* Pulsante Download (secondario) */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onDownload(attachment.AttachmentID, attachment.FileName)}
                                    title="Scarica copia locale"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                
                                {/* Sblocca file se bloccato dall'utente corrente */}
                                {isLocked && canEdit && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => unlockFile(attachment.AttachmentID)}
                                        title="Sblocca file"
                                    >
                                        <Unlock className="h-4 w-4" />
                                    </Button>
                                )}
                                
                                {/* Modifica metadati */}
                                {canEdit && onUpdate && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onUpdate(attachment)}
                                        title="Modifica descrizione"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                )}
                                
                                {/* Elimina */}
                                {canEdit && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onDelete(attachment.AttachmentID)}
                                        title="Elimina file"
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {attachments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nessun allegato presente</p>
                </div>
            )}
        </div>
    );
};

export default AttachmentListWithDirectOpen;