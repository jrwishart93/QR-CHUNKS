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
  const [useCleanPayload, setUseCleanPayload] = useState(false);
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
    <div className="relative min-h-screen overflow-hidden px-3 py-5 text-slate-100 sm:px-5 sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb absolute -left-20 top-12 h-56 w-56 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="orb absolute right-10 top-8 h-44 w-44 rounded-full bg-blue-500/25 blur-3xl [animation-delay:-2s]" />
        <div className="orb absolute -right-16 bottom-6 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl [animation-delay:-4s]" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <motion.header {...fadeUp} transition={{ duration: 0.5 }} className="mb-6 text-center sm:mb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3.8, ease: 'easeInOut' }}
            className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-indigo-300/35 bg-indigo-500/30 px-4 py-3 text-white shadow-lg shadow-indigo-500/40 neon-ring"
          >
            <QrCode size={22} />
            <Sparkles size={17} className="text-sky-200" />
          </motion.div>
          <h1 className="bg-gradient-to-r from-indigo-200 via-sky-100 to-violet-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">QR Chunks</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300 sm:text-base">Offline large-text transfer between devices with a dark neon glass interface.</p>
        </motion.header>

        <main className="space-y-4 sm:space-y-5">
          <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.45 }}>
            <GlassCard>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-100">Sender Mode</h2>
                <span className="rounded-full border border-indigo-300/25 bg-slate-900/60 px-3 py-1 text-xs font-mono text-slate-300">{inputText.length.toLocaleString()} chars</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="h-44 w-full resize-none rounded-2xl border border-indigo-300/20 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400/50 sm:h-56 sm:text-base"
                placeholder="Paste text to split into QR-safe chunks"
              />
              <div className="mt-4 flex items-center gap-3">
                <label className="text-sm text-slate-300">Chunk size</label>
                <input type="range" min={800} max={1000} value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} className="flex-1 accent-indigo-400" />
                <span className="w-14 text-right text-sm font-mono text-slate-200">{chunkSize}</span>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={useCleanPayload}
                  onChange={(e) => setUseCleanPayload(e.target.checked)}
                  className="h-4 w-4 rounded border-indigo-300/35 bg-slate-950/50 accent-indigo-400"
                />
                Clean QR payload (encode only the raw chunk text)
              </label>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button onClick={generate} disabled={!inputText} className="sm:col-span-2 rounded-2xl border border-indigo-300/35 bg-gradient-to-r from-indigo-500 to-blue-500 py-3 text-white shadow-lg shadow-indigo-600/35 transition active:scale-[0.99] disabled:opacity-50">
                  Generate QR Codes
                </button>
                <button onClick={clearAll} className="flex items-center justify-center rounded-2xl border border-slate-500/40 bg-slate-800/70 py-3 text-slate-200 transition active:scale-[0.99]">
                  <Trash2 size={18} />
                </button>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.45 }}>
            <GlassCard>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-100">Receiver Mode (optional)</h2>
                <button onClick={() => setIsScanning(true)} className="flex items-center gap-2 rounded-xl border border-sky-300/35 bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-white shadow-lg shadow-sky-500/30 transition active:scale-[0.99]">
                  <Scan size={16} /> Scan
                </button>
              </div>
              {!transfer ? (
                <p className="text-sm text-slate-300">No chunks scanned yet. Start scanning to reconstruct text offline.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-200">Set <span className="font-mono">{transfer.id}</span> • {receivedCount}/{transfer.total} parts</p>
                  {isComplete ? (
                    <>
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-3 text-emerald-200"><CheckCircle2 size={18} />Reconstruction complete</div>
                      <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-indigo-300/20 bg-slate-950/60 p-3 text-xs text-slate-100">{reconstructed}</pre>
                      <button onClick={copyRebuilt} className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-300/35 bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-white shadow-lg shadow-indigo-600/35 transition active:scale-[0.99]"><Copy size={16} />Copy text</button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-sm text-amber-200"><AlertCircle size={16} />Continue scanning remaining chunks in any order.</div>
                  )}
                </div>
              )}
              {copyNotice && <p className="mt-2 text-center text-sm text-slate-300">{copyNotice}</p>}
            </GlassCard>
          </motion.div>
        </main>
      </div>

      {chunks.length > 0 && <QRViewer chunks={chunks} useCleanPayload={useCleanPayload} onClose={() => setChunks([])} />}
      {isScanning && <QRScanner onChunkScanned={onChunkScanned} onClose={() => setIsScanning(false)} />}
    </div>
  );
}
