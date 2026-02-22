import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText, DEFAULT_CHUNK_SIZE, formatQRPayload, parseQRPayload, reassembleChunks, splitIntoChunks } from '../utils/qrUtils';

test('splitIntoChunks uses conservative defaults and preserves length', () => {
  const text = 'a'.repeat(DEFAULT_CHUNK_SIZE * 2 + 12);
  const chunks = splitIntoChunks(text);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, DEFAULT_CHUNK_SIZE);
  assert.equal(chunks.join(''), text);
});

test('payload roundtrip preserves unicode and line breaks', () => {
  const data = 'Hello\nこんにちは\n🙂';
  const payload = formatQRPayload({ setId: 'SET12345', part: 1, total: 1, data });
  const parsed = parseQRPayload(payload);
  assert.deepEqual(parsed, { setId: 'SET12345', part: 1, total: 1, data });
});

test('chunk and reassemble returns original content', () => {
  const source = 'Áß🙂 line one\nline two\n'.repeat(120);
  const qrChunks = chunkText(source, 850);
  const parts: Record<number, string> = Object.fromEntries(qrChunks.map((chunk) => [chunk.part, chunk.data]));
  const rebuilt = reassembleChunks(parts, qrChunks.length);
  assert.equal(rebuilt, source);
});
