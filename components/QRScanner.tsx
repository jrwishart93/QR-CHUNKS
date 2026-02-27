import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, X } from 'lucide-react';
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 text-white backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-sky-100"><ScanLine size={18} />Scan QR Chunk</h2>
        <button onClick={onClose} className="rounded-full border border-indigo-300/30 bg-indigo-500/15 p-3" aria-label="Close scanner">
          <X size={20} />
        </button>
      </div>
      <div id={containerId} className="min-h-[340px] flex-1 overflow-hidden rounded-3xl border border-indigo-300/25 shadow-[0_0_30px_rgba(99,102,241,0.25)]" />
      <p className="mt-4 text-center text-sm text-slate-300">{status}</p>
    </motion.div>
  );
}
