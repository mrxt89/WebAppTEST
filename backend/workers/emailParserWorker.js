// Backend/workers/emailParserWorker.js
const { parentPort } = require('worker_threads');
const fs = require('fs').promises;
const { simpleParser } = require('mailparser');

parentPort.on('message', async ({ filePath, options }) => {
    try {
        const stats = await fs.stat(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        // Limiti per il worker
        const MAX_SIZE_MB = 50;
        
        if (fileSizeMB > MAX_SIZE_MB) {
            parentPort.postMessage({
                error: `File too large: ${fileSizeMB.toFixed(2)}MB`
            });
            return;
        }
        
        // Leggi il file
        const emailData = await fs.readFile(filePath);
        
        // Parsa con timeout
        const parsed = await Promise.race([
            simpleParser(emailData, {
                skipHtmlToText: fileSizeMB > 10, // Skip HTML conversion for large files
                skipTextContent: false,
                skipImageLinks: true,
                streamAttachments: true // Non caricare allegati in memoria
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Parsing timeout')), 60000) // 60 secondi
            )
        ]);
        
        // Prepara risposta ottimizzata
        const response = {
            from: parsed.from?.text || '',
            to: parsed.to?.text || '',
            cc: parsed.cc?.text || '',
            subject: parsed.subject || '',
            date: parsed.date || new Date(),
            textBody: (parsed.text || '').substring(0, 500000), // Limita a 500KB
            htmlBody: fileSizeMB > 10 ? '' : (parsed.html || '').substring(0, 1000000), // 1MB limit
            attachments: (parsed.attachments || []).map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size
            })),
            fileSizeMB: fileSizeMB
        };
        
        parentPort.postMessage({ data: response });
        
    } catch (error) {
        parentPort.postMessage({ 
            error: error.message 
        });
    }
});