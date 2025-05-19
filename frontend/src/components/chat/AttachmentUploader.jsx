import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Camera, X, Loader2 } from 'lucide-react';
import { swal } from '../../lib/common';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import FileDropZone from '@/components/ui/FileDropZone';

const AttachmentUploader = ({ notificationId, onAttachmentUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const { uploadNotificationAttachment } = useNotifications();

  // Cleanup della webcam quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleFileSelect = async (input) => {
    let file;
    
    // Se viene da input file standard
    if (input?.target?.files) {
      file = input.target.files[0];
    } else {
      // Se viene da drag & drop
      file = input;
    }
    
    if (!file) {
      console.warn('No file selected');
      return;
    }

    try {
      setUploading(true);
      const result = await uploadFile(file);
      
      // Reset esplicito
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

const uploadFile = async (file) => {
  try {
    setUploading(true);
    // Verifica prima come la funzione si aspetta i parametri
    // Probabilmente dovrebbe essere così:
    const result = await uploadNotificationAttachment({
      notificationId,
      file
    });
    
    // Oppure potrebbe aspettarsi i parametri separati:
    // const result = await uploadNotificationAttachment(notificationId, file);
    
    if (result && result.success) {
      onAttachmentUploaded && onAttachmentUploaded();
      swal.fire({
        title: 'Successo',
        text: 'Allegato caricato con successo',
        icon: 'success',
        timer: 1500,
        showProgressBar: true,
        showConfirmButton: false
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    swal.fire({
      title: 'Errore',
      text: 'Errore nel caricamento dell\'allegato',
      icon: 'error',
      timer: 1500,
    });
  } finally {
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      swal.fire({
        title: 'Errore',
        text: 'Impossibile accedere alla fotocamera',
        icon: 'error',
        timer: 1500,
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      try {
        setUploading(true);
        
        // Crea un file dal blob
        const file = new File([blob], `photo_${Date.now()}.jpg`, { 
          type: 'image/jpeg' 
        });
        
        // Invece di caricarlo immediatamente, emettiamo un evento
        // che sarà intercettato dal componente ChatBottomBar
        const event = new CustomEvent('captured-photo-ready', { 
          detail: { image: file } 
        });
        document.dispatchEvent(event);
        
        // Ferma la fotocamera dopo la cattura
        stopCamera();
      } catch (error) {
        console.error('Error capturing photo:', error);
        swal.fire({
          title: 'Errore',
          text: 'Errore nella cattura della foto',
          icon: 'error',
          timer: 1500,
        });
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.9);
    
  };

  return (
    <FileDropZone 
      onFileSelect={handleFileSelect} 
      disabled={uploading || cameraActive}
    >
      <div className="space-y-4">
        {cameraActive ? (
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={stopCamera}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-col items-center space-y-3">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="rounded-lg border border-gray-300 max-w-full"
                style={{ maxHeight: "50vh" }}
              />
              
              <canvas ref={canvasRef} className="hidden" />
              
              <Button
                onClick={capturePhoto}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Caricamento...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Camera className="h-4 w-4 mr-2" />
                    Scatta foto
                  </span>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,text/plain,application/zip"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
            >
              {uploading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Caricamento...
                </span>
              ) : (
                <span className="flex items-center">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Allega file
                </span>
              )}
            </Button>
            
            <Button
              onClick={startCamera}
              disabled={uploading}
              variant="outline"
            >
              <Camera className="h-4 w-4 mr-2" />
              Usa fotocamera
            </Button>
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          <p>
            Trascina i file qui o usa i pulsanti sopra per caricare allegati o scattare foto.
          </p>
          <p className="mt-1">
            Formati supportati: immagini, PDF, documenti Word, fogli Excel, ZIP e testi.
          </p>
        </div>
      </div>
    </FileDropZone>
  );
};

export default AttachmentUploader;