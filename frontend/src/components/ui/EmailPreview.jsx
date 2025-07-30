import React, { useState, useEffect } from "react";
import { Mail, FileText, Paperclip, Download, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { config } from "../../config";

const EmailPreview = ({ file, onDownload }) => {
  const [emailData, setEmailData] = useState(null);
  const [emailInfo, setEmailInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Funzione helper per gestire i campi vuoti
  const getFieldValue = (value, defaultValue = "-") => {
    if (!value) return defaultValue;
    if (typeof value === "string" && value.trim() === "") return defaultValue;
    return value;
  };

  // Formatta la dimensione del file
  const formatFileSize = (mb) => {
    if (!mb) return "N/D";
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  // Prima carica solo le info base (veloce)
  useEffect(() => {
    const fetchEmailInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${config.API_BASE_URL}/email-info/${file.AttachmentID}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (!response.ok) {
          // Se email-info non esiste, prova con email-preview direttamente
          await fetchEmailPreview();
          return;
        }

        const info = await response.json();
        setEmailInfo(info);

        // Se il file è piccolo, carica automaticamente la preview
        if (info.fileSizeMB < 5 && info.canPreview !== false) {
          await fetchEmailPreview();
        }
      } catch (err) {
        console.error("Error loading email info:", err);
        // Prova con il metodo legacy
        await fetchEmailPreview();
      } finally {
        setLoading(false);
      }
    };

    fetchEmailInfo();
  }, [file.AttachmentID]);

  const fetchEmailPreview = async () => {
    try {
      setLoadingPreview(true);
      setError(null);

      // Imposta timeout client-side
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minuti

      const response = await fetch(
        `${config.API_BASE_URL}/email-preview/${file.AttachmentID}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 413) {
          setError(`Email troppo grande (${errorData.fileSizeMB?.toFixed(2)}MB). Massimo consentito: ${errorData.maxSizeMB || 100}MB`);
        } else if (response.status === 504) {
          setError("Il server ha impiegato troppo tempo per processare l'email. Il file potrebbe essere troppo grande o complesso.");
        } else {
          setError(errorData.message || "Impossibile caricare l'anteprima dell'email");
        }
        return;
      }

      const data = await response.json();

      // Normalizza i dati dell'email
      setEmailData({
        from: getFieldValue(data.from),
        to: getFieldValue(data.to),
        cc: getFieldValue(data.cc),
        subject: getFieldValue(data.subject, "(Nessun oggetto)"),
        date: data.date || new Date().toISOString(),
        htmlBody: data.htmlBody,
        textBody: getFieldValue(data.textBody, "(Nessun contenuto)"),
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        fileSizeMB: data.fileSizeMB,
        warning: data.warning,
        isLargeFile: data.isLargeFile,
        processingMethod: data.processingMethod,
      });
      
      setShowFullPreview(true);
    } catch (err) {
      console.error("Error loading email preview:", err);
      
      if (err.name === 'AbortError') {
        setError("Timeout: l'email è troppo grande o complessa da processare. Prova a scaricare il file.");
      } else {
        setError(err.message || "Errore nel caricamento dell'anteprima");
      }
    } finally {
      setLoadingPreview(false);
      setLoading(false);
    }
  };

  // Gestione download allegati email
  const handleAttachmentDownload = (attachment) => {
    // Implementa il download dell'allegato se necessario
    console.log("Download attachment:", attachment);
  };

  if (loading && !emailInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento informazioni email...</p>
        </div>
      </div>
    );
  }

  // Mostra info base se disponibili e non è ancora caricata la preview
  if (emailInfo && !showFullPreview && !loadingPreview) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex items-center mb-4">
          <Mail className="w-6 h-6 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Informazioni Email</h2>
        </div>

        <Card className="p-4 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">File:</span>
              <span className="text-sm font-medium">{emailInfo.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dimensione:</span>
              <span className={`text-sm font-medium ${emailInfo.fileSizeMB > 10 ? 'text-orange-600' : ''}`}>
                {formatFileSize(emailInfo.fileSizeMB)}
              </span>
            </div>
            {emailInfo.from && (
              <div className="flex justify-between">
                <span className="text-gray-500">Da:</span>
                <span className="text-sm">{emailInfo.from}</span>
              </div>
            )}
            {emailInfo.subject && (
              <div className="flex justify-between">
                <span className="text-gray-500">Oggetto:</span>
                <span className="text-sm truncate">{emailInfo.subject}</span>
              </div>
            )}
            {emailInfo.date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Data:</span>
                <span className="text-sm">{new Date(emailInfo.date).toLocaleString()}</span>
              </div>
            )}
          </div>
        </Card>

        {emailInfo.fileSizeMB > 5 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Questa email è grande ({formatFileSize(emailInfo.fileSizeMB)}). 
              Il caricamento dell'anteprima potrebbe richiedere tempo o non essere disponibile.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {emailInfo.canPreview !== false && (
            <Button 
              onClick={fetchEmailPreview} 
              disabled={loadingPreview}
              className="flex-1"
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : (
                "Carica Anteprima Completa"
              )}
            </Button>
          )}
          <Button variant="outline" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Scarica Email
          </Button>
        </div>
      </div>
    );
  }

  if (loadingPreview) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Elaborazione email in corso...</p>
          <p className="text-sm text-gray-500 mt-2">
            Questo potrebbe richiedere alcuni secondi per file grandi
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Mail className="w-16 h-16 text-gray-400 mb-4" />
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Scarica Email
          </Button>
        </div>
      </div>
    );
  }

  if (!emailData) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Avviso per file grandi */}
      {emailData.warning && (
        <Alert className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{emailData.warning}</AlertDescription>
        </Alert>
      )}

      {/* Header email */}
      <Card className="p-4 m-4 mb-2">
        <div className="space-y-2">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <span className="text-gray-500">Da:</span>
            <span
              className={`font-medium ${emailData.from === "-" ? "text-gray-400 italic" : ""}`}
            >
              {emailData.from}
            </span>

            <span className="text-gray-500">A:</span>
            <span
              className={emailData.to === "-" ? "text-gray-400 italic" : ""}
            >
              {emailData.to}
            </span>

            {emailData.cc !== "-" && (
              <>
                <span className="text-gray-500">CC:</span>
                <span>{emailData.cc}</span>
              </>
            )}

            <span className="text-gray-500">Data:</span>
            <span>{new Date(emailData.date).toLocaleString()}</span>
          </div>

          <div className="mt-2 pt-2 border-t">
            <span className="text-gray-500">Oggetto:</span>
            <h3
              className={`text-lg font-medium mt-1 ${emailData.subject === "(Nessun oggetto)" ? "text-gray-400 italic" : ""}`}
            >
              {emailData.subject}
            </h3>
          </div>

          {emailData.fileSizeMB && (
            <div className="text-xs text-gray-500 pt-1">
              Dimensione: {formatFileSize(emailData.fileSizeMB)}
              {emailData.processingMethod && ` • Processato con: ${emailData.processingMethod}`}
            </div>
          )}
        </div>
      </Card>

      {/* Corpo email */}
      <ScrollArea className="flex-1 px-4">
        {emailData.htmlBody ? (
          <div
            dangerouslySetInnerHTML={{ __html: emailData.htmlBody }}
            className="prose max-w-none"
          />
        ) : (
          <pre
            className={`whitespace-pre-wrap font-sans ${emailData.textBody === "(Nessun contenuto)" ? "text-gray-400 italic" : "text-gray-600"}`}
          >
            {emailData.textBody}
          </pre>
        )}
      </ScrollArea>

      {/* Allegati email */}
      {emailData.attachments.length > 0 && (
        <Card className="m-4 mt-2 p-4">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Paperclip className="w-4 h-4 mr-1" />
            Allegati ({emailData.attachments.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {emailData.attachments.map((attachment, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleAttachmentDownload(attachment)}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span className="truncate max-w-[200px]">
                  {attachment.filename}
                </span>
                {attachment.size && (
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(attachment.size / 1024 / 1024)})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmailPreview;