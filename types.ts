/**
 * QR Payload Format:
 * QRSET:<unique-id>
 * PART:<current>/<total>
 * DATA:<chunk-text>
 */

export interface QRChunk {
  setId: string;
  part: number;
  total: number;
  data: string;
}

export interface TransferState {
  id: string;
  chunks: Record<number, string>;
  total: number;
}
