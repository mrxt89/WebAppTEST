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
        console.log('saveFile called with params:', {
            projectId,
            taskId,
            notificationId,
            itemCode,
            companyId
        });

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
        } else if (projectId > 0) {
            if (taskId > 0) {
                uploadDir = path.join('projects', projectId.toString(), 'tasks', taskId.toString());
            } else {
                uploadDir = path.join('projects', projectId.toString());
            }
        } else {
            throw new Error('Errore in fileService.js - saveFile: variabili mancanti: projectId : ' + projectId + 
                           ', taskId : ' + taskId + ', notificationId : ' + notificationId + ', itemCode : ' + itemCode);
        }
        
        // Genera timestamp e hash
        const timestamp = Date.now();
        const fileHash = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const fileName = `${timestamp}-${fileHash}${ext}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Percorso completo per il filesystem
        const fullPath = path.join(this.baseUploadPath, uploadDir);
        
        // Assicurati che la directory esista
        await fs.ensureDir(fullPath);
        
        // Ottieni la dimensione del file PRIMA di spostarlo
        const stats = await fs.stat(file.path);
        const fileSizeKB = Math.round(stats.size / 1024);
        
        // Sposta il file
        // Se è una VM remota montata o locale, usa il metodo standard
        if (this.storage.getStorageType() === 'local' || 
            config.storage.remoteType === 'mounted') {
            await fs.move(file.path, path.join(fullPath, fileName));
        } else {
            // Altrimenti, leggi il file temp e caricalo tramite il servizio di storage
            const fileData = await fs.readFile(file.path);
            await this.storage.createFile(path.join(uploadDir, fileName), fileData);
            // Elimina il file temporaneo
            await fs.unlink(file.path);
        }
        
        // Costruisci il percorso relativo per il database
        let dbPath = filePath;
        
        // Normalizza i separatori di percorso per il database
        dbPath = dbPath.replace(/\\/g, '/');
        
        return {
            originalName: file.originalname,
            fileName: fileName,
            filePath: dbPath,
            fileType: file.mimetype,
            fileSizeKB: fileSizeKB,
            storageType: this.storage.getStorageType()
        };
    } catch (error) {
        console.error('Error saving file:', error);
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
            await this.storage.deleteFile(filePath);
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
            return this.storage.createReadStream(filePath);
        } catch (error) {
            console.error('Error reading file:', error);
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
}

module.exports = FileService;