const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const StorageConfig = require('./storage.config');

// Singleton per la configurazione di storage
let storageInstance = null;

class FileService {
    constructor() {
        this._initializeStorage();
    }

    /**
     * Inizializza il sistema di storage
     * @private
     */
    async _initializeStorage() {
        if (!storageInstance) {
            storageInstance = new StorageConfig(config);
            await storageInstance.initialize();
        }
        
        this.storage = storageInstance;
        this.baseUploadPath = this.storage.getBasePath();
    }

    /**
     * Sanitizza il nome del file per filesystem e database
     * @private
     */
    _sanitizeFileName(fileName) {
        // Estrai estensione
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        
        // Sostituisci caratteri problematici per filesystem Windows/Linux
        let sanitized = nameWithoutExt
            .replace(/[<>:"|?*\x00-\x1F]/g, '') // Caratteri non validi per Windows
            .replace(/[^\w\s\-_.àèéìòùÀÈÉÌÒÙ]/g, '') // Mantieni solo caratteri sicuri inclusi accenti italiani comuni
            .replace(/\s+/g, '_') // Sostituisci spazi con underscore
            .replace(/\.+/g, '.') // Rimuovi punti multipli
            .replace(/_{2,}/g, '_') // Rimuovi underscore multipli
            .replace(/^[._]|[._]$/g, '') // Rimuovi . e _ iniziali e finali
            .substring(0, 200); // Limita lunghezza per evitare problemi con path troppo lunghi
        
        // Se il nome è vuoto dopo la sanitizzazione, usa un default
        if (!sanitized) {
            sanitized = 'file';
        }
        
        return sanitized + ext;
    }

    /**
     * Trova un file gestendo problemi di encoding SMB
     * @private
     */
    async _findFileWithEncodingIssues(directory, targetFileName) {
        try {
            const files = await fs.readdir(directory);
            
            // Prima prova match esatto
            if (files.includes(targetFileName)) {
                return targetFileName;
            }
            
            // Se il nome contiene caratteri non-ASCII, prova match approssimativo
            if (/[^\x00-\x7F]/.test(targetFileName)) {
                console.log(`Target file contains non-ASCII chars: ${targetFileName}`);
                
                // Rimuovi l'estensione per il confronto
                const targetExt = path.extname(targetFileName).toLowerCase();
                const targetBase = path.basename(targetFileName, targetExt);
                
                // Crea pattern per match approssimativo
                // Sostituisci caratteri non-ASCII con .? per regex
                const pattern = targetBase
                    .split('')
                    .map(char => {
                        if (/[^\x00-\x7F]/.test(char)) {
                            return '.?'; // Match qualsiasi carattere singolo o doppio
                        }
                        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape caratteri speciali regex
                    })
                    .join('');
                
                const regex = new RegExp(`^${pattern}${targetExt.replace('.', '\\.')}$`, 'i');
                console.log(`Using pattern: ${regex}`);
                
                // Cerca file che matcha il pattern
                for (const file of files) {
                    if (regex.test(file)) {
                        console.log(`Found matching file: ${file}`);
                        // Verifica ulteriore: lunghezza simile (tolleranza di 2 caratteri)
                        if (Math.abs(file.length - targetFileName.length) <= 2) {
                            return file;
                        }
                    }
                }
                
                // Se non trovato con regex, prova con confronto più loose
                // Cerca file che contiene le parti ASCII del nome
                const asciiParts = targetBase.match(/[\x00-\x7F]+/g) || [];
                console.log('ASCII parts:', asciiParts);
                
                if (asciiParts.length > 0) {
                    for (const file of files) {
                        const fileBase = path.basename(file, path.extname(file));
                        // Verifica che tutte le parti ASCII siano presenti
                        if (asciiParts.every(part => fileBase.includes(part)) && 
                            file.toLowerCase().endsWith(targetExt)) {
                            console.log(`Found file by ASCII parts: ${file}`);
                            return file;
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error in _findFileWithEncodingIssues:', error);
            return null;
        }
    }

    /**
     * Salva un file caricato
     * @param {Object} file - File caricato da multer
     * @param {number} projectId - ID del progetto (opzionale)
     * @param {number} taskId - ID del task (opzionale)
     * @param {number} notificationId - ID della notifica (opzionale)
     * @param {string} itemCode - Codice articolo (opzionale)
     * @param {number} companyId - ID dell'azienda (opzionale)
     * @returns {Promise<Object>} - Informazioni sul file salvato
     */
    async saveFile(file, projectId = null, taskId = 0, notificationId = null, itemCode = null, companyId = null) {
        try {
            console.log('====== START SAVEFILE DEBUG ======');
            console.log('saveFile called with params:', {
                projectId,
                taskId,
                notificationId,
                itemCode,
                companyId
            });
            
            console.log('File object details:', {
                originalname: file.originalname,
                filename: file.filename,
                path: file.path,
                mimetype: file.mimetype,
                size: file.size,
                destination: file.destination,
                encoding: file.encoding
            });

            // Verifica che il file temporaneo esista
            const tempFileExists = await fs.pathExists(file.path);
            console.log('Temp file exists:', tempFileExists);
            
            if (!tempFileExists) {
                throw new Error(`Temp file does not exist at path: ${file.path}`);
            }

            // Verifica la dimensione del file temporaneo
            const tempStats = await fs.stat(file.path);
            console.log('Temp file size:', tempStats.size, 'bytes');
            
            if (tempStats.size === 0) {
                throw new Error('Temp file is empty (0 bytes)');
            }

            projectId = isNaN(parseInt(projectId)) ? 0 : parseInt(projectId);
            taskId = isNaN(parseInt(taskId)) ? 0 : parseInt(taskId);
            companyId = isNaN(parseInt(companyId)) ? null : parseInt(companyId);

            // Determina il percorso della directory
            let uploadDir;

            // NUOVA STRUTTURA PER ITEMCODE E FUTURI TIPI:
            // /Companies/{companyId}/{documentType}/{documentId}/
            if (typeof itemCode === 'string' && itemCode.trim() !== '') {
                if (!companyId) {
                    throw new Error('CompanyId è necessario per salvare allegati di ItemCode');
                }
                
                // Usiamo il metodo ensureCompanyDocDir per creare la directory appropriata
                uploadDir = await this.storage.ensureCompanyDocDir(companyId, 'itemCode', itemCode.trim());
                console.log('Using company-based itemCode directory:', uploadDir);
            } 
            // Mantieni la vecchia struttura per progetti e notifiche
            else if (notificationId) {
                uploadDir = path.join('notifications', notificationId.toString());
                console.log('Using notification directory:', uploadDir);
            } else if (projectId > 0) {
                if (taskId > 0) {
                    uploadDir = path.join('projects', projectId.toString(), 'tasks', taskId.toString());
                    console.log('Using task directory:', uploadDir);
                } else {
                    uploadDir = path.join('projects', projectId.toString());
                    console.log('Using project directory:', uploadDir);
                }
            } else {
                throw new Error('Errore in fileService.js - saveFile: variabili mancanti: projectId : ' + projectId + 
                               ', taskId : ' + taskId + ', notificationId : ' + notificationId + ', itemCode : ' + itemCode);
            }
            
            // Genera timestamp e hash con nome sanitizzato
            const timestamp = Date.now();
            const fileHash = crypto.randomBytes(8).toString('hex');
            const ext = path.extname(file.originalname);
            const sanitizedBaseName = this._sanitizeFileName(path.basename(file.originalname, ext));
            const fileName = `${timestamp}-${fileHash}-${sanitizedBaseName}${ext}`;
            const filePath = path.join(uploadDir, fileName);
            
            console.log('Original filename:', file.originalname);
            console.log('Sanitized filename:', fileName);
            console.log('Relative filePath:', filePath);
            
            // Percorso completo per il filesystem
            const fullPath = path.join(this.baseUploadPath, uploadDir);
            const fullFilePath = path.join(fullPath, fileName);
            
            console.log('Full directory path:', fullPath);
            console.log('Full file path:', fullFilePath);
            
            // Assicurati che la directory esista
            await fs.ensureDir(fullPath);
            console.log('Directory ensured');
            
            // Ottieni la dimensione del file PRIMA di spostarlo
            const stats = await fs.stat(file.path);
            const fileSizeKB = Math.round(stats.size / 1024);
            
            console.log('File size before move:', stats.size, 'bytes (', fileSizeKB, 'KB)');
            
            // Sposta il file
            // Se è una VM remota montata o locale, usa il metodo standard
            if (this.storage.getStorageType() === 'local' || 
                config.storage.remoteType === 'mounted') {
                
                console.log('Using local/mounted storage method');
                console.log('Moving file from:', file.path);
                console.log('Moving file to:', fullFilePath);
                
                try {
                    // Usa copy + delete invece di move per maggiore affidabilità
                    await fs.copy(file.path, fullFilePath, { overwrite: true });
                    console.log('File copied successfully');
                    
                    // Verifica che il file di destinazione esista
                    const destExists = await fs.pathExists(fullFilePath);
                    if (!destExists) {
                        throw new Error('Destination file does not exist after copy');
                    }
                    
                    // Verifica la dimensione del file di destinazione
                    const destStats = await fs.stat(fullFilePath);
                    console.log('Destination file size:', destStats.size, 'bytes');
                    
                    if (destStats.size !== stats.size) {
                        throw new Error(`File size mismatch after copy. Source: ${stats.size}, Dest: ${destStats.size}`);
                    }
                    
                    // Solo dopo aver verificato che la copia sia andata a buon fine, elimina il file temporaneo
                    await fs.unlink(file.path);
                    console.log('Temp file deleted');
                    
                } catch (copyError) {
                    console.error('Error during file copy/move:', copyError);
                    // Se la copia fallisce, prova con il metodo move
                    console.log('Falling back to fs.move method');
                    await fs.move(file.path, fullFilePath, { overwrite: true });
                }
                
            } else {
                // Altrimenti, leggi il file temp e caricalo tramite il servizio di storage
                console.log('Using remote storage method');
                const fileData = await fs.readFile(file.path);
                console.log('File data read, size:', fileData.length);
                
                await this.storage.createFile(path.join(uploadDir, fileName), fileData);
                console.log('File created in remote storage');
                
                // Elimina il file temporaneo
                await fs.unlink(file.path);
                console.log('Temp file deleted');
            }
            
            // Verifica finale che il file sia stato salvato correttamente
            if (this.storage.getStorageType() === 'local' || config.storage.remoteType === 'mounted') {
                const finalExists = await fs.pathExists(fullFilePath);
                if (!finalExists) {
                    throw new Error('File does not exist after save operation');
                }
                
                const finalStats = await fs.stat(fullFilePath);
                console.log('Final file verification - exists:', finalExists, ', size:', finalStats.size);
            }
            
            // Costruisci il percorso relativo per il database
            let dbPath = filePath;
            
            // Normalizza i separatori di percorso per il database
            dbPath = dbPath.replace(/\\/g, '/');
            
            console.log('Database path:', dbPath);
            console.log('====== END SAVEFILE DEBUG ======');
            
            return {
                originalName: file.originalname,
                fileName: fileName,
                filePath: dbPath,
                fileType: file.mimetype,
                fileSizeKB: fileSizeKB,
                storageType: this.storage.getStorageType()
            };
        } catch (error) {
            console.error('====== SAVEFILE ERROR ======');
            console.error('Error saving file:', error);
            console.error('Error stack:', error.stack);
            console.error('==========================');
            
            // Prova a eliminare il file temporaneo in caso di errore
            if (file && file.path) {
                try {
                    await fs.unlink(file.path);
                    console.log('Temp file deleted after error');
                } catch (unlinkError) {
                    console.error('Error deleting temp file:', unlinkError);
                }
            }
            
            throw new Error(`Error saving file: ${error.message}`);
        }
    }

    /**
     * Elimina un file
     * @param {string} filePath - Percorso relativo del file
     * @returns {Promise<boolean>} - True se l'eliminazione è riuscita
     */
    async deleteFile(filePath) {
        try {
            console.log('Deleting file:', filePath);
            
            // Sanitizza il percorso per prevenire path traversal
            const normalizedPath = path.normalize(filePath);
            if (normalizedPath.includes('..')) {
                throw new Error('Invalid file path');
            }
            
            await this.storage.deleteFile(filePath);
            console.log('File deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new Error(`Error deleting file: ${error.message}`);
        }
    }

    /**
     * Crea uno stream di lettura per un file
     * @param {string} filePath - Percorso relativo del file
     * @returns {ReadStream} - Stream di lettura
     */
    async getFileStream(filePath) {
        try {
            console.log('Creating read stream for file:', filePath);
            
            // Sanitizza il percorso per prevenire path traversal
            const normalizedPath = path.normalize(filePath);
            if (normalizedPath.includes('..')) {
                throw new Error('Invalid file path');
            }
            
            // Se è storage locale o montato
            if (this.storage.getStorageType() === 'local' || config.storage.remoteType === 'mounted') {
                const fullPath = path.join(this.baseUploadPath, filePath);
                let exists = false;
                let actualFilePath = fullPath;
                
                console.log('Checking file at path:', fullPath);
                
                // Prima prova il percorso normale
                try {
                    exists = await fs.pathExists(fullPath);
                    console.log('File exists:', exists);
                } catch (e) {
                    console.log('Error checking path:', e.message);
                }
                
                // Se non esiste e potrebbe avere problemi di encoding
                if (!exists) {
                    const directory = path.dirname(fullPath);
                    const fileName = path.basename(fullPath);
                    
                    // Controlla se la directory esiste
                    const dirExists = await fs.pathExists(directory);
                    console.log('Directory exists:', dirExists);
                    
                    if (dirExists && /[^\x00-\x7F]/.test(fileName)) {
                        // Prova a trovare il file con encoding issues
                        const actualFileName = await this._findFileWithEncodingIssues(directory, fileName);
                        
                        if (actualFileName) {
                            actualFilePath = path.join(directory, actualFileName);
                            exists = true;
                            console.log('File found with different encoding:', actualFileName);
                        }
                    }
                }
                
                if (!exists) {
                    throw new Error(`File not found at path: ${fullPath}`);
                }
                
                const stats = await fs.stat(actualFilePath);
                console.log('File size for streaming:', stats.size, 'bytes');
                
                const stream = fs.createReadStream(actualFilePath);
                console.log('Read stream created successfully');
                return stream;
            }
            
            // Per storage remoto non-mounted
            const stream = this.storage.createReadStream(filePath);
            console.log('Read stream created successfully');
            return stream;
            
        } catch (error) {
            console.error('Error creating read stream:', error);
            throw new Error(`Error reading file: ${error.message}`);
        }
    }

    /**
     * Ottiene il tipo di storage attualmente utilizzato
     * @returns {string} - 'local' o 'remote'
     */
    getStorageType() {
        return this.storage.getStorageType();
    }

    /**
     * Ottiene informazioni su un file
     * @param {string} filePath - Percorso relativo del file
     * @returns {Promise<Object>} - Informazioni sul file
     */
    async getFileInfo(filePath) {
        try {
            // Sanitizza il percorso
            const normalizedPath = path.normalize(filePath);
            if (normalizedPath.includes('..')) {
                throw new Error('Invalid file path');
            }

            const fullPath = path.join(this.baseUploadPath, filePath);
            const stats = await fs.stat(fullPath);

            return {
                size: stats.size,
                sizeKB: Math.round(stats.size / 1024),
                sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            throw new Error(`Error getting file info: ${error.message}`);
        }
    }
}

module.exports = FileService;