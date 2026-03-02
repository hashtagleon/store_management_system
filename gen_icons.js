// gen_icons.js — generate simple PNG icons without any npm packages
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function uint32BE(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n, 0);
    return b;
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (const b of buf) {
        crc ^= b;
        for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = uint32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([uint32BE(data.length), typeBuf, data, crcBuf]);
}

function makePNG(size) {
    const bg  = [15, 23, 42];
    const box = [99, 102, 241];
    const cx = size >> 1, cy = size >> 1;
    const b = Math.floor(size * 0.28);

    // Build raw pixel data
    const rows = [];
    for (let y = 0; y < size; y++) {
        const row = Buffer.alloc(1 + size * 3);
        row[0] = 0; // filter type None
        for (let x = 0; x < size; x++) {
            let col;
            const dx = x - cx, dy = y - cy;
            // Rounded box: use inner box + chamfer corners
            if (Math.abs(dx) < b && Math.abs(dy) < b) {
                // Slightly lighter top-left for 3D look
                const lit = dx < 0 && dy < 0;
                col = lit ? [130, 132, 255] : box;
            } else {
                col = bg;
            }
            const off = 1 + x * 3;
            row[off] = col[0]; row[off+1] = col[1]; row[off+2] = col[2];
        }
        rows.push(row);
    }

    const rawData = Buffer.concat(rows);
    const compressed = zlib.deflateSync(rawData, { level: 9 });

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);   // width
    ihdr.writeUInt32BE(size, 4);   // height
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // colour type = RGB
    ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
        chunk('IHDR', ihdr),
        chunk('IDAT', compressed),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [192, 512]) {
    const png = makePNG(size);
    const outPath = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`✓ Created icons/icon-${size}.png (${size}x${size}, ${png.length} bytes)`);
}
console.log('Done!');
