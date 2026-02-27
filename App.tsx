import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Copy, QrCode, Scan, Sparkles, Trash2 } from 'lucide-react';
import GlassCard from './components/GlassCard';
import QRScanner from './components/QRScanner';
import QRViewer from './components/QRViewer';
import { QRChunk, TransferState } from './types';
import { chunkText, DEFAULT_CHUNK_SIZE, reassembleChunks } from './utils/qrUtils';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);
  const [chunks, setChunks] = useState<QRChunk[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [copyNotice, setCopyNotice] = useState('');

  const receivedCount = transfer ? Object.keys(transfer.chunks).length : 0;
  const isComplete = !!transfer && receivedCount === transfer.total;
  const reconstructed = useMemo(() => {
    if (!isComplete || !transfer) return '';
    try {
      return reassembleChunks(transfer.chunks, transfer.total);
    } catch {
      return '';
    }
  }, [isComplete, transfer]);

  const generate = () => {
    if (!inputText) return;
    setChunks(chunkText(inputText, chunkSize));
  };

  const clearAll = () => {
    setInputText('');
    setChunks([]);
    setTransfer(null);
    setCopyNotice('');
  };

  const onChunkScanned = (chunk: QRChunk) => {
    if (!transfer) {
      setTransfer({ id: chunk.setId, total: chunk.total, chunks: { [chunk.part]: chunk.data } });
      return { accepted: true as const };
    }

    if (transfer.id !== chunk.setId) return { accepted: false as const, message: 'Wrong set ID. Clear transfer to start another set.' };
    if (transfer.total !== chunk.total) return { accepted: false as const, message: 'Chunk total metadata mismatch.' };
    if (chunk.part < 1 || chunk.part > chunk.total) return { accepted: false as const, message: 'Chunk index out of range.' };
    if (transfer.chunks[chunk.part] === chunk.data) return { accepted: false as const, message: `Part ${chunk.part} already captured.` };

    setTransfer({ ...transfer, chunks: { ...transfer.chunks, [chunk.part]: chunk.data } });
    return { accepted: true as const };
  };

  const copyRebuilt = async () => {
    try {
      await navigator.clipboard.writeText(reconstructed);
      setCopyNotice('Copied reconstructed text.');
      setTimeout(() => setCopyNotice(''), 2000);
    } catch {
      setCopyNotice('Clipboard unavailable. Copy manually.');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-5 sm:px-5 sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb absolute -left-16 top-16 h-52 w-52 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="orb absolute -right-14 bottom-8 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl [animation-delay:-3s]" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <motion.header {...fadeUp} transition={{ duration: 0.5 }} className="mb-6 text-center sm:mb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3.8, ease: 'easeInOut' }}
            className="mb-3 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-white shadow-lg shadow-indigo-500/40"
          >
            <QrCode size={22} />
            <Sparkles size={17} />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">QR Chunks</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">Offline large-text transfer between devices with a liquid glass interface.</p>
        </motion.header>

        <main className="space-y-4 sm:space-y-5">
          <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.45 }}>
            <GlassCard>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Sender Mode</h2>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-mono text-slate-600 dark:bg-white/10 dark:text-slate-200">{inputText.length.toLocaleString()} chars</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="h-44 w-full resize-none rounded-2xl border border-white/40 bg-white/40 p-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-slate-900/40 sm:h-56 sm:text-base"
                placeholder="Paste text to split into QR-safe chunks"
              />
              <div className="mt-4 flex items-center gap-3">
                <label className="text-sm">Chunk size</label>
                <input type="range" min={800} max={1000} value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} className="flex-1 accent-indigo-600" />
                <span className="w-14 text-right text-sm font-mono">{chunkSize}</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button onClick={generate} disabled={!inputText} className="sm:col-span-2 rounded-2xl bg-indigo-600 py-3 text-white shadow-lg shadow-indigo-500/30 transition active:scale-[0.99] disabled:opacity-50">
                  Generate QR Codes
                </button>
                <button onClick={clearAll} className="flex items-center justify-center rounded-2xl bg-slate-300/70 py-3 transition active:scale-[0.99] dark:bg-slate-700/70">
                  <Trash2 size={18} />
                </button>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.45 }}>
            <GlassCard>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Receiver Mode (optional)</h2>
                <button onClick={() => setIsScanning(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white shadow-lg shadow-emerald-500/30 transition active:scale-[0.99]">
                  <Scan size={16} /> Scan
                </button>
              </div>
              {!transfer ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No chunks scanned yet. Start scanning to reconstruct text offline.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">Set <span className="font-mono">{transfer.id}</span> • {receivedCount}/{transfer.total} parts</p>
                  {isComplete ? (
                    <>
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={18} />Reconstruction complete</div>
                      <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-100/80 p-3 text-xs dark:bg-slate-900/70">{reconstructed}</pre>
                      <button onClick={copyRebuilt} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white shadow-lg shadow-indigo-500/30 transition active:scale-[0.99]"><Copy size={16} />Copy text</button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"><AlertCircle size={16} />Continue scanning remaining chunks in any order.</div>
                  )}
                </div>
              )}
              {copyNotice && <p className="mt-2 text-center text-sm">{copyNotice}</p>}
            </GlassCard>
          </motion.div>
        </main>
      </div>

      {chunks.length > 0 && <QRViewer chunks={chunks} onClose={() => setChunks([])} />}
      {isScanning && <QRScanner onChunkScanned={onChunkScanned} onClose={() => setIsScanning(false)} />}
    </div>
  );
}
