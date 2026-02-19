import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, RefreshCw, User, Car, FileText, Ban, Layers } from 'lucide-react';
import { loadModels, processImage, type BlurOptions } from './aiService';


function App() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Initializing AI Core...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // Blur Options State
  const [options, setOptions] = useState<BlurOptions>({
    faces: true,
    body: false,
    licensePlate: false,
    sensitiveText: false,
    strength: 20
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Models on Mount
  useEffect(() => {
    const init = async () => {
      const success = await loadModels((msg) => setLoadingMsg(msg));
      if (success) {
        setModelsLoaded(true);
        setLoadingMsg('');
      } else {
        setLoadingMsg('Error loading AI models. Please refresh.');
      }
    };
    init();
  }, []);

  // Handle Image Drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setOriginalImage(img);
        // Initially just draw the original image
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          ctx?.drawImage(img, 0, 0);
        }
      };
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  // Process the Image
  const handleProcess = async () => {
    if (!originalImage || !canvasRef.current) return;

    setIsProcessing(true);
    // Use setTimeout to allow UI to update to "Processing" state
    setTimeout(async () => {
      if (canvasRef.current && originalImage) {
        await processImage(originalImage, canvasRef.current, options);
      }
      setIsProcessing(false);
    }, 100);
  };

  // Reset to Original
  const handleReset = () => {
    if (originalImage && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.drawImage(originalImage, 0, 0);
    }
  };

  // Download Result
  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'erased-image.png';
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  // Helper for toggle
  const toggleOption = (key: keyof BlurOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="app-container">
      {/* Loading Overlay */}
      {(!modelsLoaded || isProcessing) && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{!modelsLoaded ? loadingMsg : 'AI Processing Image...'}</p>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <h1 className="title">AI Eraser <Ban size={40} style={{ marginLeft: 10, verticalAlign: 'middle' }} /></h1>
        <p className="subtitle">Securely blur sensitive information locally in your browser.</p>
      </header>

      {/* Main Content */}
      <main style={{ display: 'grid', gridTemplateColumns: originalImage ? '3fr 1fr' : '1fr', gap: '2rem' }}>

        {/* Left: Canvas / Dropzone */}
        <div className="canvas-wrapper">
          {!originalImage ? (
            <div {...getRootProps()} className={`dropzone-container ${isDragActive ? 'dragging' : ''}`}>
              <input {...getInputProps()} />
              <Upload className="dropzone-icon" />
              <p className="dropzone-text">Drag & Drop Image Here</p>
              <p className="dropzone-subtext">Supports JPG, PNG based formats</p>
            </div>
          ) : (
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }} />
          )}
        </div>

        {/* Right: Controls (only visible if image loaded) */}
        {originalImage && (
          <div className="controls-panel">
            <h3 className="control-label">Detection Settings</h3>

            <div className="control-group">
              <div onClick={() => toggleOption('faces')} className="checkbox-wrapper">
                <input type="checkbox" checked={options.faces} readOnly style={{ display: 'none' }} />
                <div className="checkbox-custom"><User size={12} className="checkbox-icon" /></div>
                <span>Blur Faces</span>
              </div>

              <div onClick={() => toggleOption('body')} className="checkbox-wrapper">
                <input type="checkbox" checked={options.body} readOnly style={{ display: 'none' }} />
                <div className="checkbox-custom"><User size={12} className="checkbox-icon" /></div>
                <span>Blur Body / Parts</span>
              </div>

              <div onClick={() => toggleOption('licensePlate')} className="checkbox-wrapper">
                <input type="checkbox" checked={options.licensePlate} readOnly style={{ display: 'none' }} />
                <div className="checkbox-custom"><Car size={12} className="checkbox-icon" /></div>
                <span>License Plates</span>
              </div>

              <div onClick={() => toggleOption('sensitiveText')} className="checkbox-wrapper">
                <input type="checkbox" checked={options.sensitiveText} readOnly style={{ display: 'none' }} />
                <div className="checkbox-custom"><FileText size={12} className="checkbox-icon" /></div>
                <span>Private Text</span>
              </div>
            </div>

            <h3 className="control-label" style={{ marginTop: '1rem' }}>Blur Strength</h3>
            <input
              type="range"
              min="5" max="50"
              value={options.strength}
              onChange={(e) => setOptions({ ...options, strength: parseInt(e.target.value) })}
              className="w-full"
              style={{ accentColor: 'var(--primary)' }}
            />

            <div className="actions-row" style={{ marginTop: 'auto' }}>
              <button className="btn btn-primary" onClick={handleProcess} style={{ flex: 1 }}>
                <Layers size={18} /> Apply Blur
              </button>
            </div>
            <div className="actions-row">
              <button className="btn btn-secondary" onClick={handleReset} style={{ flex: 1 }}>
                <RefreshCw size={18} /> Reset
              </button>
              <button className="btn btn-secondary" onClick={handleDownload} style={{ flex: 1 }}>
                <Download size={18} /> Save
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
