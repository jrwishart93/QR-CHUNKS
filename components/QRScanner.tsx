import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { QRChunk } from '../types';
import { parseQRPayload } from '../utils/qrUtils';

interface ScanResult {
  accepted: boolean;
  message?: string;
}

interface QRScannerProps {
  onChunkScanned: (chunk: QRChunk) => ScanResult;
  onClose: () => void;
}

export default function QRScanner({ onChunkScanned, onClose }: QRScannerProps) {
  const containerId = 'qr-reader';
  const scannerRef = useRef<any>(null);
  const [status, setStatus] = useState('Align a QR code inside the frame.');

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mounted) return;

      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            try {
              const parsed = parseQRPayload(decodedText);
              const result = onChunkScanned(parsed);
              setStatus(result.accepted ? `Captured part ${parsed.part}/${parsed.total}.` : result.message || 'Chunk rejected.');
            } catch {
              setStatus('Not a supported QR chunk payload.');
            }
          },
          () => undefined,
        );
      } catch {
        setStatus('Camera access unavailable. Check permissions and retry.');
      }
    };

    start();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => undefined).finally(() => scanner.clear().catch(() => undefined));
      }
    };
  }, [onChunkScanned]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 p-4 text-white flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Scan QR Chunk</h2>
        <button onClick={onClose} className="p-3 rounded-full bg-white/10" aria-label="Close scanner">
          <X size={20} />
        </button>
      </div>
      <div id={containerId} className="flex-1 min-h-[340px] rounded-3xl overflow-hidden" />
      <p className="text-sm text-slate-300 text-center mt-4">{status}</p>
    </div>
  );
}
