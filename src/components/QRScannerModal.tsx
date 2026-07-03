import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (text: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-viewport";

  useEffect(() => {
    if (isOpen) {
      // Start scanner
      const html5Qrcode = new Html5Qrcode(scannerId);
      html5QrcodeRef.current = html5Qrcode;

      html5Qrcode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (qrCodeMessage) => {
            onScanSuccess(qrCodeMessage);
            handleStop();
          },
          () => {
            // Silence parsing error frames
          }
        )
        .catch((err) => {
          console.warn("Unable to start scanner:", err);
        });
    }

    return () => {
      handleStop();
    };
  }, [isOpen]);

  const handleStop = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current
        .stop()
        .then(() => {
          html5QrcodeRef.current = null;
        })
        .catch((err) => {
          console.warn("Failed to stop scanner:", err);
        });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="scanner-modal-overlay glass-panel animate-fade-in" onClick={onClose}>
      <div className="scanner-modal-card glass-element animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h3>
            <Camera size={18} className="scanner-icon-title" />
            <span>Scan Peer QR-Code</span>
          </h3>
          <button onClick={onClose} className="close-scanner-btn glass-button-round" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="scanner-viewport-wrapper">
          <div id={scannerId} className="scanner-viewport-div"></div>
          <div className="scanner-target-reticle"></div>
        </div>
        
        <span className="scanner-hint-text">Position the QR Code inside the box to connect</span>
      </div>
    </div>
  );
};
