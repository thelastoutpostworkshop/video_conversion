export const toBlobBytes = (
  data: ArrayBuffer | Uint8Array
): Uint8Array<ArrayBuffer> => {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (data.buffer instanceof ArrayBuffer) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  // Blob does not accept shared buffers; copy only when the backing buffer is shared.
  return new Uint8Array(data);
};
