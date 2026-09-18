import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Fungsi pembentuk berkas PNG valid murni tanpa dependency eksternal
function buatPngMurni(width, height, r, g, b) {
  // Signature PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth: 8
  ihdrData.writeUInt8(2, 9); // color type: 2 (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = buatChunk('IHDR', ihdrData);

  // Raw scanlines data
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLength;
    rawData[offset] = 0; // filter type: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;

      // Buat border dekoratif atau isi warna daun #1b4530 (RGB: 27, 69, 48)
      const border = Math.floor(width * 0.08);
      const isBorder = x < border || x >= width - border || y < border || y >= height - border;

      if (isBorder) {
        rawData[pixelOffset] = Math.min(255, r + 40);
        rawData[pixelOffset + 1] = Math.min(255, g + 40);
        rawData[pixelOffset + 2] = Math.min(255, b + 40);
      } else {
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
      }
    }
  }

  // IDAT Chunk (Compressed scanlines)
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = buatChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = buatChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function buatChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(8 + length + 4);

  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crcTarget = buffer.subarray(4, 8 + length);
  const crcValue = crc32(crcTarget);
  buffer.writeUInt32BE(crcValue, 8 + length);

  return buffer;
}

// Perhitungan CRC-32 standar PNG
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Buat ikon untuk direktori public/
const dirPublic = path.resolve('public');
if (!fs.existsSync(dirPublic)) {
  fs.mkdirSync(dirPublic, { recursive: true });
}

// Warna Token Daun SIABDES Belega (#1b4530 -> R:27, G:69, B:48)
const png192 = buatPngMurni(192, 192, 27, 69, 48);
const png512 = buatPngMurni(512, 512, 27, 69, 48);
const iconApple = buatPngMurni(180, 180, 27, 69, 48);

fs.writeFileSync(path.join(dirPublic, 'pwa-192x192.png'), png192);
fs.writeFileSync(path.join(dirPublic, 'pwa-512x512.png'), png512);
fs.writeFileSync(path.join(dirPublic, 'apple-touch-icon.png'), iconApple);
fs.writeFileSync(path.join(dirPublic, 'favicon.ico'), png192);

console.log('✅ Berhasil membuat ikon PWA (192x192, 512x512, apple-touch-icon, favicon.ico) di public/');
