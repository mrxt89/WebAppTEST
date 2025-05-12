import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, ZoomIn, ZoomOut, Fullscreen, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

const CADViewer = ({ file, onDownload }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Impostazione della scena
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Pulizia di eventuali scene precedenti
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (rendererRef.current && rendererRef.current.domElement) {
      rendererRef.current.dispose();
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    }
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Crea una nuova scena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Aggiunta di luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controlli
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.enablePan = true;
    controls.update();
    controlsRef.current = controls;
    
    // Funzione di rendering
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Funzione di pulizia
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (renderer && renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      if (renderer) {
        renderer.dispose();
      }
      
      if (controls) {
        controls.dispose();
      }
    };
  }, []);

  // Ridimensionamento al cambio di dimensione della finestra
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Caricamento del modello
  useEffect(() => {
    if (!file || !file.previewUrl || !sceneRef.current || !cameraRef.current) return;
    
    setIsLoading(true);
    setError(null);
    setModelLoaded(false);
    
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    
    // Rimuovi modelli precedenti
    scene.children.forEach(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        if (child.type !== 'AmbientLight' && child.type !== 'DirectionalLight') {
          scene.remove(child);
        }
      }
    });
    
    // Funzioni helper
    const fitCameraToObject = (obj, offset = 1.5) => {
      const boundingBox = new THREE.Box3().setFromObject(obj);
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const cameraDistance = maxDim * offset;
      
      // Posiziona la camera
      camera.position.copy(center);
      camera.position.x += cameraDistance;
      camera.position.y += cameraDistance / 2;
      camera.position.z += cameraDistance;
      camera.lookAt(center);
      
      // Se esistono, aggiorna i controlli
      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    };
    
    const handleLoadedModel = (obj) => {
      if (obj) {
        // Se l'oggetto è un mesh, imposta un materiale di base
        if (obj instanceof THREE.Mesh && !obj.material) {
          obj.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        }
        
        // Aggiungi l'oggetto alla scena
        scene.add(obj);
        
        // Adatta la camera all'oggetto
        fitCameraToObject(obj);
        
        setIsLoading(false);
        setModelLoaded(true);
      }
    };
    
    // Ottiene l'estensione del file
    const getFileExtension = (filename) => {
      if (!filename) return '';
      
      if (filename.includes('.')) {
        const parts = filename.split('.');
        // Gestisci estensioni doppie come .prt.1
        if (parts.length > 2 && !isNaN(parts[parts.length - 1])) {
          return '.' + parts[parts.length - 2].toLowerCase();
        }
        return '.' + parts[parts.length - 1].toLowerCase();
      }
      return '';
    };
    
    const extension = getFileExtension(file.FileName);
    
    // In base all'estensione, carica il file con il loader appropriato
    try {
      if (extension === '.stl') {
        const loader = new STLLoader();
        loader.load(
          file.previewUrl,
          (geometry) => {
            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const mesh = new THREE.Mesh(geometry, material);
            handleLoadedModel(mesh);
          },
          (xhr) => {
            // Progress callback
            console.log(`${(xhr.loaded / xhr.total * 100)}% loaded`);
          },
          (error) => {
            console.error('Error loading STL:', error);
            setError('Errore nel caricamento del file STL');
            setIsLoading(false);
          }
        );
      } else if (extension === '.obj') {
        const loader = new OBJLoader();
        loader.load(
          file.previewUrl,
          handleLoadedModel,
          (xhr) => {
            // Progress callback
            console.log(`${(xhr.loaded / xhr.total * 100)}% loaded`);
          },
          (error) => {
            console.error('Error loading OBJ:', error);
            setError('Errore nel caricamento del file OBJ');
            setIsLoading(false);
          }
        );
      } else if (extension === '.gltf' || extension === '.glb') {
        const loader = new GLTFLoader();
        
        // Configurare DRACOLoader per decompressione efficiente
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        loader.setDRACOLoader(dracoLoader);
        
        loader.load(
          file.previewUrl,
          (gltf) => {
            handleLoadedModel(gltf.scene);
          },
          (xhr) => {
            // Progress callback
            console.log(`${(xhr.loaded / xhr.total * 100)}% loaded`);
          },
          (error) => {
            console.error('Error loading GLTF/GLB:', error);
            setError('Errore nel caricamento del file GLTF/GLB');
            setIsLoading(false);
          }
        );
      } else if (extension === '.fbx') {
        const loader = new FBXLoader();
        loader.load(
          file.previewUrl,
          handleLoadedModel,
          (xhr) => {
            // Progress callback
            console.log(`${(xhr.loaded / xhr.total * 100)}% loaded`);
          },
          (error) => {
            console.error('Error loading FBX:', error);
            setError('Errore nel caricamento del file FBX');
            setIsLoading(false);
          }
        );
      } else if (extension === '.ply') {
        const loader = new PLYLoader();
        loader.load(
          file.previewUrl,
          (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const mesh = new THREE.Mesh(geometry, material);
            handleLoadedModel(mesh);
          },
          (xhr) => {
            // Progress callback
            console.log(`${(xhr.loaded / xhr.total * 100)}% loaded`);
          },
          (error) => {
            console.error('Error loading PLY:', error);
            setError('Errore nel caricamento del file PLY');
            setIsLoading(false);
          }
        );
      } else if (extension === '.dae') {
        const loader = new ColladaLoader();
        loader.load(
          file.previewUrl,
          (collada) => {
            handleLoadedModel(collada.scene);
          },
          (xhr) => {
            // Progress callback
            console.log(`${(xhr.loaded / xhr.total * 100)}% loaded`);
          },
          (error) => {
            console.error('Error loading DAE:', error);
            setError('Errore nel caricamento del file DAE');
            setIsLoading(false);
          }
        );
      } else {
        setError(`Formato non supportato per la visualizzazione: ${extension}`);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error loading model:', err);
      setError(`Errore nel caricamento del modello: ${err.message}`);
      setIsLoading(false);
    }
    
    return () => {
      // Cleanup specifico per i loaders
    };
  }, [file]);

  // Azioni per i controlli
  const handleReset = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(10, 10, 10);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      const zoomSpeed = 0.1;
      cameraRef.current.position.multiplyScalar(1 - zoomSpeed);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      const zoomSpeed = 0.1;
      cameraRef.current.position.multiplyScalar(1 + zoomSpeed);
      controlsRef.current.update();
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    }
  };

  if (isLoading && !error) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento modello 3D in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full p-6">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>

        <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-gray-400">
              <path d="M2 9V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"></path>
              <path d="M2 13h10"></path>
              <path d="M5 13l3-3"></path>
              <path d="M5 13l3 3"></path>
            </svg>
            <p className="text-gray-600 mb-4">Impossibile visualizzare questo tipo di file CAD nel browser.</p>
            <Button onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Scarica il File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-2 p-2 bg-gray-100">
        <Button variant="outline" size="sm" onClick={handleReset} title="Reimposta vista">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom avanti">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom indietro">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleFullscreen} title="Schermo intero">
          <Fullscreen className="h-4 w-4" />
        </Button>
      </div>
      
      <div 
        ref={containerRef} 
        className="flex-1 bg-gray-50 rounded-lg" 
        style={{ minHeight: '400px' }}
      />
      
      {!modelLoaded && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-600">Impossibile visualizzare questo tipo di file</p>
        </div>
      )}
    </div>
  );
};

export default CADViewer;