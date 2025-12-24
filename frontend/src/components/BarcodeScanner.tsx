import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  open,
  onClose,
  onScan,
  title = 'Scan Barcode'
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const codeReader = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    if (open && cameraReady) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [open, cameraReady]);

  const startScanning = () => {
    setScanning(true);
    setError('');
    
    const scanFromVideo = () => {
      if (webcamRef.current && webcamRef.current.video) {
        const video = webcamRef.current.video;
        
        codeReader.current.decodeFromVideoDevice(null, video, (result, err) => {
          if (result) {
            const barcode = result.getText();
            console.log('Scanned barcode:', barcode);
            onScan(barcode);
            stopScanning();
            onClose();
          }
          
          if (err && !(err.name === 'NotFoundException')) {
            console.error('Barcode scan error:', err);
            setError('Error scanning barcode. Please try again.');
          }
        });
      }
    };

    // Start scanning after a short delay to ensure video is ready
    setTimeout(scanFromVideo, 500);
  };

  const stopScanning = () => {
    setScanning(false);
    codeReader.current.reset();
  };

  const handleCameraReady = () => {
    setCameraReady(true);
    setError('');
  };

  const handleCameraError = (error: any) => {
    console.error('Camera error:', error);
    setError('Unable to access camera. Please check permissions and try again.');
    setCameraReady(false);
  };

  const toggleCamera = () => {
    setFacingMode(facingMode === 'user' ? 'environment' : 'user');
    setCameraReady(false);
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: facingMode
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      sx={{ '& .MuiDialog-paper': { minHeight: '600px' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraIcon />
          {title}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          <Paper 
            sx={{ 
              width: '100%', 
              height: '400px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              bgcolor: 'black'
            }}
          >
            {open && (
              <Webcam
                ref={webcamRef}
                audio={false}
                videoConstraints={videoConstraints}
                onUserMedia={handleCameraReady}
                onUserMediaError={handleCameraError}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            )}
            
            {/* Scanning overlay */}
            {scanning && cameraReady && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}
              >
                <Box
                  sx={{
                    width: '250px',
                    height: '150px',
                    border: '2px solid #00ff00',
                    borderRadius: 1,
                    position: 'relative',
                    boxShadow: '0 0 20px #00ff00'
                  }}
                >
                  {/* Scanning line */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: '#00ff00',
                      boxShadow: '0 0 10px #00ff00'
                    }}
                  />
                </Box>
              </Box>
            )}

            {!cameraReady && !error && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress color="primary" />
                <Typography color="white">Starting camera...</Typography>
              </Box>
            )}
          </Paper>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={toggleCamera}
              startIcon={facingMode === 'user' ? <FlashOnIcon /> : <FlashOffIcon />}
            >
              {facingMode === 'user' ? 'Back Camera' : 'Front Camera'}
            </Button>
            
            {cameraReady && !scanning && (
              <Button
                variant="contained"
                onClick={startScanning}
                startIcon={<CameraIcon />}
              >
                Start Scanning
              </Button>
            )}
            
            {scanning && (
              <Button
                variant="outlined"
                onClick={stopScanning}
                color="secondary"
              >
                Stop Scanning
              </Button>
            )}
          </Box>

          <Typography variant="body2" color="textSecondary" textAlign="center">
            Position the barcode within the green frame and wait for it to be scanned automatically.
            Make sure the barcode is well-lit and clearly visible.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>

    </Dialog>
  );
};

export default BarcodeScanner;
