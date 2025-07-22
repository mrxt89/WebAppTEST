// Backend/routes/smbLinkRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const sql = require('mssql');
const config = require('../config');
const path = require('path');

// Configurazione del percorso SMB base dalla tua configurazione
// Il percorso deve essere nel formato \\server\share o //server/share
const SMB_BASE_PATH_CONFIG = process.env.SMB_PATH || 
                      config.storage.smb?.path || 
                      '\\\\192.168.42.121\\crite';

// Normalizza il percorso SMB per assicurarsi che sia nel formato corretto
const SMB_BASE_PATH = SMB_BASE_PATH_CONFIG.startsWith('//') 
    ? SMB_BASE_PATH_CONFIG.replace(/\//g, '\\')
    : SMB_BASE_PATH_CONFIG;

// Sottocartella specifica per la webapp
const WEBAPP_SUBFOLDER = 'GestDoc2\\WebApp';

/**
 * Genera un link SMB diretto per aprire il file
 * In development: genera link file:// per il percorso mappato su host
 * In production: genera link file:// per il percorso SMB
 */
router.post('/generate-smb-link', authenticateToken, async (req, res) => {
    try {
        const { attachmentId, filePath: requestFilePath } = req.body;
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        const isDevelopment = process.env.NODE_ENV === 'development';
        const storageType = process.env.STORAGE_TYPE || config.storage.type;

        let filePath = requestFilePath;

        // Se viene passato un attachmentId, verifica i permessi
        if (attachmentId) {
            let pool = await sql.connect(config.database);
            const result = await pool.request()
                .input('AttachmentID', sql.Int, attachmentId)
                .input('CompanyId', sql.Int, companyId)
                .query(`
                    SELECT 
                        a.FilePath,
                        a.FileName,
                        a.CompanyId,
                        a.IsPublic
                    FROM MA_ItemAttachments a
                    WHERE a.AttachmentID = @AttachmentID
                        AND a.IsVisible = 1
                        AND (
                            a.CompanyId = @CompanyId 
                            OR a.IsPublic = 1
                            OR EXISTS (
                                SELECT 1 FROM MA_ItemAttachmentSharing s 
                                WHERE s.AttachmentID = a.AttachmentID 
                                AND s.TargetCompanyId = @CompanyId
                            )
                        )
                `);

            if (!result.recordset[0]) {
                return res.status(403).json({ 
                    success: 0, 
                    message: 'Accesso negato al file' 
                });
            }

            filePath = result.recordset[0].FilePath;
        }

        if (!filePath) {
            return res.status(400).json({ 
                success: 0, 
                message: 'Percorso file mancante' 
            });
        }

        // Converti il percorso da Unix a Windows
        const windowsPath = filePath.replace(/\//g, '\\');
        
        // Genera il link in base all'ambiente
        let fileLink;
        let smbLink;
        
        if (isDevelopment) {
            // In development, usa il percorso mappato sull'host
            // Dal docker-compose.yml vediamo che C:/TestShare/GestDoc2/WebApp è mappato a /usr/src/app/uploads
            const hostBasePath = 'C:\\TestShare\\GestDoc2\\WebApp';
            
            // Assicurati che windowsPath usi solo backslash
            const cleanWindowsPath = windowsPath.replace(/\//g, '\\');
            const fullHostPath = path.join(hostBasePath, cleanWindowsPath);
            
            // Normalizza il percorso per Windows (tutti backslash)
            const normalizedPath = fullHostPath.replace(/\//g, '\\');
            
            // Genera link file:// per Windows con forward slash
            fileLink = `file:///${normalizedPath.replace(/\\/g, '/')}`;
            smbLink = normalizedPath; // Percorso Windows per copia
            
            console.log('Development mode - Host path:', normalizedPath);
            console.log('Development mode - File link:', fileLink);
        } else {
            // In produzione, genera il link SMB completo
            // SMB_BASE_PATH dovrebbe essere nel formato \\server\share
            let cleanSmbBasePath = SMB_BASE_PATH;
            
            // Se SMB_BASE_PATH inizia con //, convertilo in \\
            if (cleanSmbBasePath.startsWith('//')) {
                cleanSmbBasePath = cleanSmbBasePath.replace(/\//g, '\\');
            }
            
            // Assicurati che tutti i separatori siano backslash
            const cleanWindowsPath = windowsPath.replace(/\//g, '\\');
            
            // Costruisci il percorso SMB completo
            if (cleanWindowsPath.includes('GestDoc2\\WebApp')) {
                smbLink = path.join(cleanSmbBasePath, cleanWindowsPath);
            } else {
                smbLink = path.join(cleanSmbBasePath, WEBAPP_SUBFOLDER, cleanWindowsPath);
            }
            
            // Normalizza tutti i separatori a backslash per Windows
            smbLink = smbLink.replace(/\//g, '\\');
            
            // Per il link file://, usa il formato UNC corretto
            // file://server/share/path con forward slash
            const uncPath = smbLink.replace(/\\/g, '/');
            
            // Rimuovi eventuali slash iniziali extra
            const cleanUncPath = uncPath.replace(/^\/+/, '');
            
            // Genera il link file:// corretto per UNC
            fileLink = `file://${cleanUncPath}`;
            
            console.log('Production mode - SMB path:', smbLink);
            console.log('Production mode - File link:', fileLink);
        }

        // Risposta con tutti i dati necessari
        res.json({
            success: 1,
            smbPath: smbLink,
            fileLink: fileLink,
            fileName: path.basename(filePath),
            isDevelopment: isDevelopment,
            // Fallback HTTP per debug o se file:// non funziona
            httpFallback: isDevelopment ? `${config.server.apiBaseUrl}/uploads/${filePath}` : null
        });

    } catch (error) {
        console.error('Error generating SMB link:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nella generazione del link' 
        });
    }
});

/**
 * Verifica se un file è bloccato per modifica
 */
router.get('/check-file-lock/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const companyId = req.user.CompanyId;

        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .query(`
                SELECT TOP 1
                    l.LockedBy,
                    l.LockedAt,
                    u.firstName + ' ' + u.lastName as LockedByName
                FROM MA_AttachmentLocks l
                JOIN AR_Users u ON l.LockedBy = u.userId
                WHERE l.AttachmentID = @AttachmentID
                    AND l.ReleasedAt IS NULL
                    AND DATEDIFF(MINUTE, l.LockedAt, GETDATE()) < 30
                ORDER BY l.LockedAt DESC
            `);

        if (result.recordset[0]) {
            res.json({
                success: 1,
                isLocked: true,
                lockedBy: result.recordset[0].LockedByName,
                lockedAt: result.recordset[0].LockedAt
            });
        } else {
            res.json({
                success: 1,
                isLocked: false
            });
        }

    } catch (error) {
        console.error('Error checking file lock:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nel controllo del blocco file' 
        });
    }
});

/**
 * Blocca un file per modifica
 */
router.post('/lock-file/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;

        let pool = await sql.connect(config.database);
        
        // Prima rilascia eventuali lock precedenti dell'utente
        await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                UPDATE MA_AttachmentLocks 
                SET ReleasedAt = GETDATE()
                WHERE LockedBy = @UserID AND ReleasedAt IS NULL
            `);

        // Crea nuovo lock
        await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserID', sql.Int, userId)
            .query(`
                INSERT INTO MA_AttachmentLocks (AttachmentID, LockedBy, LockedAt)
                VALUES (@AttachmentID, @UserID, GETDATE())
            `);

        res.json({
            success: 1,
            message: 'File bloccato per modifica'
        });

    } catch (error) {
        console.error('Error locking file:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nel blocco del file' 
        });
    }
});

/**
 * Rilascia il blocco di un file
 */
router.post('/unlock-file/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;

        let pool = await sql.connect(config.database);
        await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserID', sql.Int, userId)
            .query(`
                UPDATE MA_AttachmentLocks 
                SET ReleasedAt = GETDATE()
                WHERE AttachmentID = @AttachmentID 
                    AND LockedBy = @UserID 
                    AND ReleasedAt IS NULL
            `);

        res.json({
            success: 1,
            message: 'Blocco file rilasciato'
        });

    } catch (error) {
        console.error('Error unlocking file:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nel rilascio del blocco' 
        });
    }
});

module.exports = router;