import { useMemo, useState, TouchEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { QRChunk } from '../types';
import { formatQRPayload } from '../utils/qrUtils';

interface QRViewerProps {
  chunks: QRChunk[];
  useCleanPayload: boolean;
  onClose: () => void;
}

export default function QRViewer({ chunks, useCleanPayload, onClose }: QRViewerProps) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [boostBrightness, setBoostBrightness] = useState(false);

  const activeChunk = chunks[index];
  const payload = useMemo(() => {
    if (useCleanPayload) return activeChunk.data;
    return formatQRPayload(activeChunk);
  }, [activeChunk, useCleanPayload]);

  const next = () => setIndex((i) => Math.min(i + 1, chunks.length - 1));
  const previous = () => setIndex((i) => Math.max(i - 1, 0));

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0].clientX);
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 45) {
      if (delta < 0) next();
      if (delta > 0) previous();
    }
    setTouchStartX(null);
  };

  const qrSize = Math.min(window.innerWidth - 48, 360);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 text-white backdrop-blur-xl ${boostBrightness ? 'brightness-125' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onClose} className="rounded-full border border-indigo-300/30 bg-indigo-500/15 p-3" aria-label="Close viewer">
          <X size={20} />
        </button>
        <p className="text-sm font-semibold tracking-wide text-slate-100">{index + 1} of {chunks.length}</p>
        <button
          onClick={() => setBoostBrightness((value) => !value)}
          className={`rounded-full border p-3 ${boostBrightness ? 'border-amber-300/80 bg-amber-400 text-slate-950' : 'border-indigo-300/30 bg-indigo-500/15 text-white'}`}
          aria-label="Toggle brightness boost"
        >
          <Sun size={20} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <motion.div key={index} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} className="rounded-3xl border border-indigo-300/30 bg-white p-3 shadow-[0_0_30px_rgba(99,102,241,0.3)] sm:p-4">
          <QRCodeSVG value={payload} size={qrSize} level="M" includeMargin />
        </motion.div>
        <p className="max-w-xs break-all rounded-xl border border-indigo-300/25 bg-slate-900/60 px-3 py-2 text-center font-mono text-xs text-slate-300">
          {useCleanPayload ? 'CLEAN PAYLOAD' : `${activeChunk.setId} • PART ${activeChunk.part}/${activeChunk.total}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={previous} disabled={index === 0} className="flex justify-center rounded-2xl border border-indigo-300/30 bg-indigo-500/15 py-3 text-slate-100 disabled:opacity-40">
          <ChevronLeft />
        </button>
        <button onClick={next} disabled={index === chunks.length - 1} className="flex justify-center rounded-2xl border border-indigo-300/30 bg-indigo-500/15 py-3 text-slate-100 disabled:opacity-40">
          <ChevronRight />
        </button>
      </div>
    </motion.div>
  );
}
