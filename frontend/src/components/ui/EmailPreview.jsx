import React, { useState, useEffect } from 'react';
import { Mail, FileText, Paperclip, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { config } from '../../config';

const EmailPreview = ({ file, onDownload }) => {
  const [emailData, setEmailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Funzione helper per gestire i campi vuoti
  const getFieldValue = (value, defaultValue = '-') => {
    if (!value) return defaultValue;
    if (typeof value === 'string' && value.trim() === '') return defaultValue;
    return value;
  };

  useEffect(() => {
    const fetchEmailContent = async () => {
      try {
        const response = await fetch(
          `${config.API_BASE_URL}/email-preview/${file.AttachmentID}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to load email');
        const data = await response.json();
        
        // Normalizza i dati dell'email
        setEmailData({
          from: getFieldValue(data.from),
          to: getFieldValue(data.to),
          cc: getFieldValue(data.cc),
          subject: getFieldValue(data.subject, '(Nessun oggetto)'),
          date: data.date || new Date().toISOString(),
          htmlBody: data.htmlBody,
          textBody: getFieldValue(data.textBody, '(Nessun contenuto)'),
          attachments: Array.isArray(data.attachments) ? data.attachments : []
        });
      } catch (err) {
        console.error('Error loading email:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmailContent();
  }, [file.AttachmentID]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Mail className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">Impossibile caricare l'anteprima dell'email</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Scarica Email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header email */}
      <Card className="p-4 mb-4">
        <div className="space-y-2">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <span className="text-gray-500">Da:</span>
            <span className={`font-medium ${emailData.from === '-' ? 'text-gray-400 italic' : ''}`}>
              {emailData.from}
            </span>
            
            <span className="text-gray-500">A:</span>
            <span className={emailData.to === '-' ? 'text-gray-400 italic' : ''}>
              {emailData.to}
            </span>
            
            {emailData.cc !== '-' && (
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
            <h3 className={`text-lg font-medium mt-1 ${emailData.subject === '(Nessun oggetto)' ? 'text-gray-400 italic' : ''}`}>
              {emailData.subject}
            </h3>
          </div>
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
          <pre className={`whitespace-pre-wrap font-sans ${emailData.textBody === '(Nessun contenuto)' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
            {emailData.textBody}
          </pre>
        )}
      </ScrollArea>

      {/* Allegati email */}
      {emailData.attachments.length > 0 && (
        <Card className="mt-4 p-4">
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
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmailPreview;