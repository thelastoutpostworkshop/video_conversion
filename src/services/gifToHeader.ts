const GIF_SIGNATURE_87A = "GIF87a";
const GIF_SIGNATURE_89A = "GIF89a";
const BYTES_PER_LINE = 16;

export interface GifHeaderMetadata {
  width: number;
  height: number;
  bitsPerPixel: number;
  frameCount: number;
}

export interface GifToHeaderOptions {
  arrayName?: string;
  displayName?: string;
}

const decodeAscii = (data: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...data.slice(start, start + length));

const readUint16LE = (data: Uint8Array, offset: number) =>
  data[offset] | (data[offset + 1] << 8);

const readGifSubBlocks = (data: Uint8Array, startOffset: number) => {
  let offset = startOffset;
  while (offset < data.length) {
    const blockLength = data[offset];
    offset += 1;
    if (blockLength === 0) {
      return offset;
    }
    offset += blockLength;
  }
  throw new Error("GIF data ended while parsing data sub-blocks.");
};

export const sanitizeCIdentifier = (value: string) => {
  const trimmed = value.trim() || "output";
  let normalized = "";

  for (const character of trimmed) {
    if (/[A-Za-z0-9_]/.test(character)) {
      normalized += character;
    } else {
      normalized += "_";
    }
  }

  if (!/^[A-Za-z_]/.test(normalized)) {
    normalized = `_${normalized}`;
  }

  return normalized || "output";
};

export const parseGifMetadata = (data: Uint8Array): GifHeaderMetadata => {
  if (data.byteLength < 13) {
    throw new Error("GIF data is too small to contain a valid header.");
  }

  const signature = decodeAscii(data, 0, 6);
  if (signature !== GIF_SIGNATURE_87A && signature !== GIF_SIGNATURE_89A) {
    throw new Error("Generated output is not a valid GIF file.");
  }

  const width = readUint16LE(data, 6);
  const height = readUint16LE(data, 8);
  const packed = data[10];
  const bitsPerPixel = (packed & 0x07) + 1;

  let offset = 13;
  if ((packed & 0x80) !== 0) {
    offset += 3 * (1 << bitsPerPixel);
  }

  let frameCount = 0;

  while (offset < data.length) {
    const introducer = data[offset];
    offset += 1;

    if (introducer === 0x3b) {
      break;
    }

    if (introducer === 0x21) {
      if (offset >= data.length) {
        throw new Error("GIF data ended while parsing an extension block.");
      }
      offset += 1;
      offset = readGifSubBlocks(data, offset);
      continue;
    }

    if (introducer !== 0x2c) {
      throw new Error("GIF data is malformed and cannot be exported as a header.");
    }

    frameCount += 1;

    if (offset + 9 > data.length) {
      throw new Error("GIF data ended while parsing an image descriptor.");
    }

    offset += 8;
    const imagePacked = data[offset];
    offset += 1;

    if ((imagePacked & 0x80) !== 0) {
      const localBitsPerPixel = (imagePacked & 0x07) + 1;
      offset += 3 * (1 << localBitsPerPixel);
    }

    if (offset >= data.length) {
      throw new Error("GIF data ended before the image data stream.");
    }

    offset += 1;
    offset = readGifSubBlocks(data, offset);
  }

  if (frameCount < 1) {
    throw new Error("GIF data does not contain any image frames.");
  }

  return {
    width,
    height,
    bitsPerPixel,
    frameCount,
  };
};

const buildHexLines = (data: Uint8Array) => {
  const lines: string[] = [];
  for (let offset = 0; offset < data.length; offset += BYTES_PER_LINE) {
    const chunk = data.slice(offset, offset + BYTES_PER_LINE);
    const values = Array.from(chunk, (byte, index) => {
      const isLastByte = offset + index === data.length - 1;
      const rendered = `0x${byte.toString(16).padStart(2, "0")}`;
      return isLastByte ? rendered : `${rendered},`;
    });
    lines.push(`\t${values.join(" ")}`);
  }
  return lines;
};

export const convertGifToHeader = (
  data: Uint8Array,
  options: GifToHeaderOptions = {}
) => {
  const metadata = parseGifMetadata(data);
  const displayName = (options.displayName?.trim() || "output").trim();
  const arrayName = sanitizeCIdentifier(options.arrayName ?? displayName);
  const frameLabel = metadata.frameCount === 1 ? "frame" : "frames";

  return [
    "//",
    `// ${displayName}`,
    `// Data size = ${data.byteLength} bytes`,
    "//",
    `// GIF, Compression=LZW, Size: ${metadata.width} x ${metadata.height}, ${metadata.bitsPerPixel}-Bpp`,
    `// ${metadata.frameCount} ${frameLabel}`,
    "//",
    "// for non-Arduino builds...",
    "#ifndef PROGMEM",
    "#define PROGMEM",
    "#endif",
    `const uint8_t ${arrayName}[] PROGMEM = {`,
    ...buildHexLines(data),
    "};",
  ].join("\n");
};
