import { useMemo, useState, TouchEvent } from 'react';
import { X, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { QRChunk } from '../types';
import { formatQRPayload } from '../utils/qrUtils';

interface QRViewerProps {
  chunks: QRChunk[];
  onClose: () => void;
}

export default function QRViewer({ chunks, onClose }: QRViewerProps) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [boostBrightness, setBoostBrightness] = useState(false);

  const activeChunk = chunks[index];
  const payload = useMemo(() => formatQRPayload(activeChunk), [activeChunk]);

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

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950/90 text-white p-4 flex flex-col ${boostBrightness ? 'brightness-125' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between mb-6">
        <button onClick={onClose} className="p-3 rounded-full bg-white/10" aria-label="Close viewer">
          <X size={20} />
        </button>
        <p className="text-sm font-semibold tracking-wide">{index + 1} of {chunks.length}</p>
        <button
          onClick={() => setBoostBrightness((value) => !value)}
          className={`p-3 rounded-full ${boostBrightness ? 'bg-amber-400 text-slate-950' : 'bg-white/10'}`}
          aria-label="Toggle brightness boost"
        >
          <Sun size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="bg-white p-4 rounded-3xl shadow-2xl">
          <QRCodeSVG value={payload} size={Math.min(window.innerWidth - 64, 360)} level="M" includeMargin />
        </div>
        <p className="text-xs font-mono text-center text-slate-300 max-w-xs break-all">{activeChunk.setId} • PART {activeChunk.part}/{activeChunk.total}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={previous} disabled={index === 0} className="py-3 rounded-2xl bg-white/10 disabled:opacity-40 flex justify-center">
          <ChevronLeft />
        </button>
        <button onClick={next} disabled={index === chunks.length - 1} className="py-3 rounded-2xl bg-white/10 disabled:opacity-40 flex justify-center">
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
