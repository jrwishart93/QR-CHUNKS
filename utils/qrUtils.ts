import { QRChunk } from '../types';

export const DEFAULT_CHUNK_SIZE = 900;
export const MIN_CHUNK_SIZE = 800;
export const MAX_CHUNK_SIZE = 1000;

export function generateSetId(): string {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

export function splitIntoChunks(text: string, chunkSize = DEFAULT_CHUNK_SIZE): string[] {
  const safeChunkSize = Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, chunkSize));
  const symbols = Array.from(text);
  if (!symbols.length) return [];

  const chunks: string[] = [];
  for (let i = 0; i < symbols.length; i += safeChunkSize) {
    chunks.push(symbols.slice(i, i + safeChunkSize).join(''));
  }
  return chunks;
}

export function formatQRPayload(chunk: QRChunk): string {
  return `QRSET:${chunk.setId}\nPART:${chunk.part}/${chunk.total}\nDATA:${chunk.data}`;
}

export function parseQRPayload(payload: string): QRChunk {
  const lines = payload.split('\n');
  if (lines.length < 3) {
    throw new Error('Invalid payload: expected 3 lines.');
  }

  const [setLine, partLine, ...dataLines] = lines;
  if (!setLine.startsWith('QRSET:') || !partLine.startsWith('PART:')) {
    throw new Error('Invalid payload metadata headers.');
  }

  const setId = setLine.slice(6).trim();
  const partValue = partLine.slice(5).trim();
  const [partRaw, totalRaw] = partValue.split('/');
  const part = Number(partRaw);
  const total = Number(totalRaw);
  const dataPrefix = 'DATA:';
  const firstDataLine = dataLines.shift();

  if (!firstDataLine?.startsWith(dataPrefix)) {
    throw new Error('Invalid payload data header.');
  }

  const data = `${firstDataLine.slice(dataPrefix.length)}${dataLines.length ? `\n${dataLines.join('\n')}` : ''}`;

  if (!setId || !Number.isInteger(part) || !Number.isInteger(total) || part < 1 || total < 1 || part > total) {
    throw new Error('Invalid payload values.');
  }

  return { setId, part, total, data };
}

export function chunkText(text: string, chunkSize = DEFAULT_CHUNK_SIZE): QRChunk[] {
  const setId = generateSetId();
  const chunks = splitIntoChunks(text, chunkSize);
  const total = chunks.length;

  return chunks.map((data, index) => ({
    setId,
    part: index + 1,
    total,
    data,
  }));
}

export function reassembleChunks(parts: Record<number, string>, total: number): string {
  return Array.from({ length: total }, (_, i) => {
    const value = parts[i + 1];
    if (value === undefined) {
      throw new Error(`Missing part ${i + 1}`);
    }
    return value;
  }).join('');
}
