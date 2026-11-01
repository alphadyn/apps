const BLOCK_SIZE = 512;
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function writeText(header, offset, length, value) {
  const bytes = encoder.encode(value);
  if (bytes.length > length) throw new Error(`A folder path is too long to archive: ${value}`);
  header.set(bytes, offset);
}

function writeOctal(header, offset, length, value) {
  const text = Math.floor(value).toString(8).padStart(length - 1, '0');
  if (text.length > length - 1) throw new Error('A file is too large for the TAR archive format.');
  writeText(header, offset, length - 1, text);
  header[offset + length - 1] = 0;
}

function splitTarPath(path) {
  const bytes = encoder.encode(path);
  if (bytes.length <= 100) return { name: path, prefix: '' };
  const parts = path.split('/');
  for (let index = parts.length - 1; index > 0; index -= 1) {
    const prefix = parts.slice(0, index).join('/');
    const name = parts.slice(index).join('/');
    if (encoder.encode(prefix).length <= 155 && encoder.encode(name).length <= 100) {
      return { name, prefix };
    }
  }
  throw new Error(`A folder path is too long to archive: ${path}`);
}

function normalizeArchivePath(path) {
  if (typeof path !== 'string' || !path || path.includes('\0')) {
    throw new Error('The encrypted folder contains an invalid file path.');
  }
  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error('The encrypted folder contains an absolute file path.');
  }
  const parts = normalized.split('/').filter((part) => part && part !== '.');
  if (!parts.length || parts.some((part) => part === '..')) {
    throw new Error('The encrypted folder contains an unsafe file path.');
  }
  return parts.join('/');
}

function tarHeader(path, size, modified) {
  const { name, prefix } = splitTarPath(path);
  const header = new Uint8Array(BLOCK_SIZE);
  writeText(header, 0, 100, name);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, modified / 1000);
  header.fill(0x20, 148, 156);
  header[156] = 0x30;
  writeText(header, 257, 6, 'ustar\0');
  writeText(header, 263, 2, '00');
  writeText(header, 265, 32, 'user');
  writeText(header, 297, 32, 'group');
  writeText(header, 345, 155, prefix);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeOctal(header, 148, 8, checksum);
  return header;
}

async function readStream(stream, limit = MAX_ARCHIVE_BYTES) {
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error('The folder archive is larger than the 1 GB processing limit.');
    }
    chunks.push(value);
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function createTarGzip(files) {
  if (!('CompressionStream' in window)) {
    throw new Error('This browser does not support gzip compression. Try a current version of Chrome, Edge, or Safari.');
  }
  if (!files.length) throw new Error('Choose a folder that contains at least one file.');
  const entries = [];
  let totalSize = 0;
  let tarSize = BLOCK_SIZE * 2;
  for (const file of files) {
    const path = normalizeArchivePath(file.webkitRelativePath || file.name);
    totalSize += file.size;
    if (totalSize > MAX_ARCHIVE_BYTES) {
      throw new Error('The selected folder is larger than the 1 GB processing limit.');
    }
    tarSize += BLOCK_SIZE + Math.ceil(file.size / BLOCK_SIZE) * BLOCK_SIZE;
    if (tarSize > MAX_ARCHIVE_BYTES) {
      throw new Error('The TAR archive is larger than the 1 GB processing limit.');
    }
    entries.push({ path, bytes: new Uint8Array(await file.arrayBuffer()), modified: file.lastModified || Date.now() });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const parts = [];
  for (const entry of entries) {
    parts.push(tarHeader(entry.path, entry.bytes.length, entry.modified), entry.bytes);
    const padding = (BLOCK_SIZE - (entry.bytes.length % BLOCK_SIZE)) % BLOCK_SIZE;
    if (padding) parts.push(new Uint8Array(padding));
  }
  parts.push(new Uint8Array(BLOCK_SIZE * 2));
  const tar = new Blob(parts, { type: 'application/x-tar' });
  return readStream(tar.stream().pipeThrough(new CompressionStream('gzip')));
}

function readOctal(header, offset, length) {
  const value = decoder.decode(header.subarray(offset, offset + length)).replace(/\0.*$/, '').trim();
  if (!value) return 0;
  if (!/^[0-7]+$/.test(value)) throw new Error('The encrypted folder contains an invalid TAR header.');
  return Number.parseInt(value, 8);
}

function readTarString(header, offset, length) {
  const bytes = header.subarray(offset, offset + length);
  const end = bytes.indexOf(0);
  return decoder.decode(end < 0 ? bytes : bytes.subarray(0, end));
}

function verifyTarChecksum(header) {
  const expected = readOctal(header, 148, 8);
  let actual = 0;
  for (let index = 0; index < header.length; index += 1) {
    actual += index >= 148 && index < 156 ? 0x20 : header[index];
  }
  if (actual !== expected) throw new Error('The encrypted folder contains a corrupt TAR header.');
}

export async function extractTarGzip(bytes) {
  if (!('DecompressionStream' in window)) {
    throw new Error('This browser does not support gzip decompression. Try a current version of Chrome, Edge, or Safari.');
  }
  const decompressed = await readStream(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
  const files = [];
  let offset = 0;
  let terminated = false;
  while (offset + BLOCK_SIZE <= decompressed.length) {
    const header = decompressed.subarray(offset, offset + BLOCK_SIZE);
    if (header.every((byte) => byte === 0)) {
      const next = decompressed.subarray(offset + BLOCK_SIZE, offset + BLOCK_SIZE * 2);
      if (next.length !== BLOCK_SIZE || !next.every((byte) => byte === 0)) {
        throw new Error('The encrypted folder is missing a complete TAR end marker.');
      }
      terminated = true;
      break;
    }
    verifyTarChecksum(header);
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const path = normalizeArchivePath(prefix ? `${prefix}/${name}` : name);
    const size = readOctal(header, 124, 12);
    const type = header[156];
    if (type !== 0 && type !== 0x30) {
      throw new Error('The encrypted folder contains an unsupported TAR entry type.');
    }
    const dataStart = offset + BLOCK_SIZE;
    const dataEnd = dataStart + size;
    if (dataEnd > decompressed.length) throw new Error('The encrypted folder archive is incomplete.');
    files.push({ path, bytes: decompressed.slice(dataStart, dataEnd) });
    offset = dataStart + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
  }
  if (!terminated) throw new Error('The encrypted folder is missing a TAR end marker.');
  if (!files.length) throw new Error('The decrypted folder archive contains no files.');
  return files;
}

export function archiveMagicMatches(bytes) {
  return bytes.length >= 8
    && bytes[0] === 0x56 && bytes[1] === 0x4c && bytes[2] === 0x54 && bytes[3] === 0x41
    && bytes[4] === 0x52 && bytes[5] === 0x30 && bytes[6] === 0x30 && bytes[7] === 0x31;
}

export const ARCHIVE_MAGIC = new Uint8Array([0x56, 0x4c, 0x54, 0x41, 0x52, 0x30, 0x30, 0x31]);
