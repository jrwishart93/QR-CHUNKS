import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Copy, QrCode, Scan, Trash2 } from 'lucide-react';
import GlassCard from './components/GlassCard';
import QRScanner from './components/QRScanner';
import QRViewer from './components/QRViewer';
import { QRChunk, TransferState } from './types';
import { chunkText, DEFAULT_CHUNK_SIZE, reassembleChunks } from './utils/qrUtils';

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
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen">
      <header className="mb-8 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white mb-3">
          <QrCode size={28} />
        </motion.div>
        <h1 className="text-3xl font-bold">QR Chunks</h1>
        <p className="text-slate-500 dark:text-slate-400">Offline large-text transfer between devices</p>
      </header>

      <main className="space-y-5">
        <GlassCard>
          <div className="flex justify-between mb-2 items-center">
            <h2 className="font-semibold">Sender Mode</h2>
            <span className="text-xs text-slate-400 font-mono">{inputText.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-56 bg-transparent outline-none resize-none"
            placeholder="Paste text to split into QR-safe chunks"
          />
          <div className="flex items-center gap-3 mt-3">
            <label className="text-sm">Chunk size</label>
            <input type="range" min={800} max={1000} value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} className="flex-1" />
            <span className="w-14 text-right text-sm font-mono">{chunkSize}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button onClick={generate} disabled={!inputText} className="col-span-2 bg-indigo-600 text-white py-3 rounded-2xl disabled:opacity-50">
              Generate QR Codes
            </button>
            <button onClick={clearAll} className="bg-slate-300/70 dark:bg-slate-700 py-3 rounded-2xl flex items-center justify-center">
              <Trash2 size={18} />
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Receiver Mode (optional)</h2>
            <button onClick={() => setIsScanning(true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white flex items-center gap-2">
              <Scan size={16} /> Scan
            </button>
          </div>
          {!transfer ? (
            <p className="text-sm text-slate-500">No chunks scanned yet. Start scanning to reconstruct text offline.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">Set <span className="font-mono">{transfer.id}</span> • {receivedCount}/{transfer.total} parts</p>
              {isComplete ? (
                <>
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center gap-2"><CheckCircle2 size={18} />Reconstruction complete</div>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{reconstructed}</pre>
                  <button onClick={copyRebuilt} className="w-full py-3 rounded-xl bg-indigo-600 text-white flex items-center justify-center gap-2"><Copy size={16} />Copy text</button>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 text-sm flex items-center gap-2"><AlertCircle size={16} />Continue scanning remaining chunks in any order.</div>
              )}
            </div>
          )}
          {copyNotice && <p className="text-center text-sm mt-2">{copyNotice}</p>}
        </GlassCard>
      </main>

      {chunks.length > 0 && <QRViewer chunks={chunks} onClose={() => setChunks([])} />}
      {isScanning && <QRScanner onChunkScanned={onChunkScanned} onClose={() => setIsScanning(false)} />}
    </div>
  );
}
