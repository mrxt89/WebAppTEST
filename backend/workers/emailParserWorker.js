// Backend/workers/emailParserWorker.js
const { parentPort } = require('worker_threads');
const fs = require('fs').promises;
const { simpleParser } = require('mailparser');
const MsgReader = require('@kenjiuno/msgreader').default;

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

        // Determina il tipo di file dall'estensione
        const isMsgFile = filePath.toLowerCase().endsWith('.msg');

        // Leggi il file
        const emailData = await fs.readFile(filePath);

        let response;

        if (isMsgFile) {
            // ===== PARSING FILE .MSG (Outlook) =====
            console.log('Parsing .msg file with msgreader');

            try {
                const msgReader = new MsgReader(emailData);
                const fileData = msgReader.getFileData();

                // Estrai gli allegati e crea mappa CID → Base64
                const attachments = [];
                const cidMap = new Map();

                if (fileData.attachments && fileData.attachments.length > 0) {
                    for (const att of fileData.attachments) {
                        const attData = msgReader.getAttachment(att);
                        const content = attData && attData.content ? attData.content : null;
                        const filename = att.fileName || att.name || 'allegato';

                        attachments.push({
                            filename: filename,
                            contentType: att.mimeType || att.contentType || 'application/octet-stream',
                            size: content ? content.length : 0,
                            contentBase64: content ? content.toString('base64') : null
                        });

                        // Mappa CID per immagini embedded
                        if (content && filename.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
                            const cid = filename;
                            const mimeType = att.mimeType || 'image/png';
                            const base64 = content.toString('base64');
                            cidMap.set(cid, `data:${mimeType};base64,${base64}`);
                        }
                    }
                }

                // Converti CID → Base64 nell'HTML
                let htmlBody = fileData.bodyHtml || '';
                if (htmlBody && cidMap.size > 0) {
                    cidMap.forEach((dataUrl, cid) => {
                        // Sostituisci cid:filename
                        htmlBody = htmlBody.replace(new RegExp(`cid:${cid}`, 'gi'), dataUrl);
                        // Sostituisci anche src="filename" (caso alternativo)
                        htmlBody = htmlBody.replace(new RegExp(`src="${cid}"`, 'gi'), `src="${dataUrl}"`);
                    });
                }

                // Costruisci la risposta
                response = {
                    from: fileData.senderName || fileData.senderEmail || '',
                    to: (fileData.recipients || []).map(r => r.name || r.email).join(', ') || '',
                    cc: (fileData.cc || []).map(r => r.name || r.email).join(', ') || '',
                    subject: fileData.subject || '',
                    date: fileData.creationTime || fileData.lastModificationTime || new Date(),
                    textBody: fileData.body || '',
                    htmlBody: htmlBody,
                    attachments: attachments,
                    fileSizeMB: fileSizeMB
                };

            } catch (msgError) {
                console.error('Error parsing .msg file:', msgError);
                parentPort.postMessage({
                    error: `Errore nel parsing del file .msg: ${msgError.message}`
                });
                return;
            }

        } else {
            // ===== PARSING FILE .EML (Standard RFC822) =====
            console.log('Parsing .eml file with mailparser');

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
            response = {
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
        }

        parentPort.postMessage({ data: response });

    } catch (error) {
        parentPort.postMessage({
            error: error.message
        });
    }
});
