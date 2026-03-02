#!/usr/bin/env python3
"""Generate simple PNG icons for the PWA using Pillow or pure bytes fallback."""
import os, struct, zlib, base64

def create_png(size, bg_color=(15,23,42), box_color=(99,102,241)):
    """Create a minimal PNG with a colored background and a box icon."""
    w = h = size
    # pixels: dark bg with a centered rounded box
    pixels = []
    cx, cy = w//2, h//2
    b = int(size * 0.28)  # box half-size
    for y in range(h):
        row = []
        for x in range(w):
            # Is inside the box area?
            if (cx-b) < x < (cx+b) and (cy-b) < y < (cy+b):
                # Inner highlight
                row.extend(list(box_color) + [255])
            else:
                row.extend(list(bg_color) + [255])
        pixels.append(bytes(row))

    def png_chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    raw = b''
    for row in pixels:
        raw += b'\x00' + row

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    idat = zlib.compress(raw)

    png = (b'\x89PNG\r\n\x1a\n'
           + png_chunk(b'IHDR', ihdr)
           + png_chunk(b'IDAT', idat)
           + png_chunk(b'IEND', b''))
    return png

# Create icons directory
os.makedirs('icons', exist_ok=True)

for size in [192, 512]:
    data = create_png(size)
    with open(f'icons/icon-{size}.png', 'wb') as f:
        f.write(data)
    print(f'Created icons/icon-{size}.png ({size}x{size})')

print('Done!')
