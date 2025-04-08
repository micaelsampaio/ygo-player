import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";
import styled from "styled-components";

const ScannerContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
`;

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRCodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        onClose();
      },
      (error) => {
        console.warn(error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [onScan, onClose]);

  return (
    <ScannerContainer>
      <CloseButton onClick={onClose}>×</CloseButton>
      <div id="qr-reader"></div>
    </ScannerContainer>
  );
}
