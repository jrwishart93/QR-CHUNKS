import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, QrCode, Scan, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import GlassCard from './components/GlassCard';
import QRViewer from './components/QRViewer';
import QRScanner from './components/QRScanner';
import { chunkText } from './utils/qrUtils';
import { QRChunk, TransferState } from './types';

type ScanResult = { accepted: true } | { accepted: false; message: string };

export default function App() {
  const [inputText, setInputText] = useState('');
  const [generatedChunks, setGeneratedChunks] = useState<QRChunk[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [reconstruction, setReconstruction] = useState<TransferState | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const reconstructionRef = useRef<TransferState | null>(null);

  // Auto-clear success message
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  useEffect(() => {
    reconstructionRef.current = reconstruction;
  }, [reconstruction]);

  const handleGenerate = () => {
    if (!inputText.trim()) return;
    const chunks = chunkText(inputText);
    setGeneratedChunks(chunks);
    setCopyError(null);
  };

  const handleScanChunk = useCallback((chunk: QRChunk): ScanResult => {
    const current = reconstructionRef.current;

    if (!current) {
      const nextState: TransferState = {
        id: chunk.setId,
        chunks: { [chunk.part]: chunk.data },
        total: chunk.total,
      };
      reconstructionRef.current = nextState;
      setReconstruction(nextState);
      return { accepted: true };
    }

    if (current.id !== chunk.setId) {
      return {
        accepted: false,
        message: `Scanned set ${chunk.setId}, but current transfer is ${current.id}. Reset to switch sets.`,
      };
    }

    if (current.total !== chunk.total) {
      return {
        accepted: false,
        message: `Chunk metadata mismatch: expected ${current.total} total parts.`,
      };
    }

    if (chunk.part < 1 || chunk.part > current.total) {
      return {
        accepted: false,
        message: `Part ${chunk.part} is outside expected range (1-${current.total}).`,
      };
    }

    const existingChunk = current.chunks[chunk.part];
    if (existingChunk === chunk.data) {
      return { accepted: false, message: `Part ${chunk.part} has already been scanned.` };
    }
    if (existingChunk !== undefined && existingChunk !== chunk.data) {
      return {
        accepted: false,
        message: `Part ${chunk.part} conflicts with previously scanned data.`,
      };
    }

    const nextState: TransferState = {
      ...current,
      chunks: { ...current.chunks, [chunk.part]: chunk.data },
    };
    reconstructionRef.current = nextState;
    setReconstruction(nextState);
    return { accepted: true };
  }, []);

  const handleScannerChunk = useCallback(
    (chunk: QRChunk): ScanResult => {
      const result = handleScanChunk(chunk);
      if (result.accepted) {
        setIsScanning(false);
      }
      return result;
    },
    [handleScanChunk]
  );

  const receivedParts = reconstruction ? Object.keys(reconstruction.chunks).length : 0;
  const isComplete =
    !!reconstruction &&
    reconstruction.total > 0 &&
    Array.from({ length: reconstruction.total }, (_, i) => reconstruction.chunks[i + 1] !== undefined).every(Boolean);
  const reconstructedText = isComplete && reconstruction
    ? Array.from({ length: reconstruction.total }, (_, i) => reconstruction.chunks[i + 1]).join('')
    : '';

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setShowSuccess(true);
    } catch {
      setShowSuccess(false);
      setCopyError('Clipboard is unavailable. Copy manually from the text box.');
    }
  };

  const handleReset = () => {
    setInputText('');
    setGeneratedChunks([]);
    setReconstruction(null);
    reconstructionRef.current = null;
    setIsScanning(false);
    setShowSuccess(false);
    setCopyError(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 min-h-screen flex flex-col">
      <header className="mb-12 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-500/20"
        >
          <QrCode size={32} />
        </motion.div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">QR Bridge</h1>
        <p className="text-slate-500 dark:text-slate-400">Secure Offline Text Transfer</p>
      </header>

      <main className="flex-1 space-y-6">
        <AnimatePresence mode="wait">
          {!reconstruction ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <GlassCard>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Info size={18} className="text-indigo-500" />
                    Paste Text to Send
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    {inputText.length.toLocaleString()} chars
                  </span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your large text block here..."
                  className="w-full h-64 bg-transparent border-none focus:ring-0 outline-none resize-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={!inputText.trim()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                  >
                    <QrCode size={20} /> Generate QR Codes
                  </button>
                  <button
                    onClick={() => setIsScanning(true)}
                    aria-label="Open QR scanner"
                    title="Open QR scanner"
                    className="px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium rounded-2xl transition-all flex items-center justify-center active:scale-[0.98]"
                  >
                    <Scan size={20} />
                  </button>
                </div>
              </GlassCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassCard className="p-4 flex items-start gap-4">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">100% Offline</h3>
                    <p className="text-xs text-slate-500">No data ever leaves your device.</p>
                  </div>
                </GlassCard>
                <GlassCard className="p-4 flex items-start gap-4">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">No Retention</h3>
                    <p className="text-xs text-slate-500">Data is cleared when you reset.</p>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reconstruct"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="relative">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-semibold">Receiving Data</h2>
                  <button 
                    onClick={handleReset}
                    aria-label="Reset transfer"
                    title="Reset transfer"
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {!isComplete ? (
                  <div className="space-y-6 py-8">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32 mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-slate-200 dark:text-slate-800"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={364.4}
                            strokeDashoffset={364.4 - (364.4 * receivedParts) / reconstruction.total}
                            className="text-indigo-500 transition-all duration-500 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-2xl font-bold">{receivedParts}</span>
                          <span className="text-xs text-slate-400">of {reconstruction.total}</span>
                        </div>
                      </div>
                      <p className="text-center text-slate-600 dark:text-slate-400">
                        Scan the next QR code to continue...
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-1">Set {reconstruction.id}</p>
                    </div>
                    <button
                      onClick={() => setIsScanning(true)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Scan size={20} /> Scan Next Chunk
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-3 mb-4">
                      <CheckCircle2 size={20} />
                      <span className="font-medium">Reconstruction Complete!</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 max-h-64 overflow-y-auto text-sm font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                      {reconstructedText}
                    </div>
                    <button
                      onClick={() => handleCopy(reconstructedText)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Copy size={20} /> Copy to Clipboard
                    </button>
                    {copyError && (
                      <p className="text-sm text-red-500 text-center">{copyError}</p>
                    )}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 text-center py-6 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
          Secure • Private • Offline
        </p>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {generatedChunks.length > 0 && (
          <QRViewer 
            chunks={generatedChunks} 
            onClose={() => setGeneratedChunks([])} 
          />
        )}
        {isScanning && (
          <QRScanner 
            onChunkScanned={handleScannerChunk}
            onClose={() => setIsScanning(false)} 
          />
        )}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 text-white rounded-full shadow-2xl z-[100] flex items-center gap-2"
          >
            <CheckCircle2 size={18} className="text-emerald-400" />
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
