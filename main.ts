import * as zlib from 'node:zlib';
import * as fs from 'node:fs';
import * as path from 'node:path';

const W = 512, H = 512;
const data = new Uint8Array(W * H * 4);

function setPixel(x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
}

function fillRect(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setPixel(x, y, r, g, b);
  }
}

function fillCircle(cx: number, cy: number, r: number, cr: number, cg: number, cb: number): void {
  const rr = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      if (dx * dx + dy2 <= rr) setPixel(x, y, cr, cg, cb);
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number): void {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(x0, y0, r, g, b);
    if (x0 === x1 && y0 === y1) break;
    let e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ---------- CRC32 ----------
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}
function crc32(buf: Buffer, start: number, end: number): number {
  let c = 0xFFFFFFFF;
  for (let i = start; i < end; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type: string, buf: Uint8Array): Buffer {
  const b = Buffer.from(buf);
  const len = b.length;
  const out = Buffer.alloc(12 + len);
  let o = 0;
  out.writeUInt32BE(len, o); o += 4;
  out.write(type, o, 'ascii'); o += 4;
  b.copy(out, o); o += len;
  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), b]);
  out.writeUInt32BE(crc32(crcData, 0, crcData.length), o);
  return out;
}

// ---------- scene ----------
function drawSky(): void {
  const horizon = 360;
  for (let y = 0; y < H; y++) {
    let r: number, g: number, b: number;
    if (y < horizon) {
      const t = (y * 256) / horizon; // 0..256
      r = 255;
      g = 130 + ((75 * t) >> 8);   // 130 -> 205
      b = 80 + ((60 * t) >> 8);    // 80  -> 140
    } else {
      r = 255; g = 205; b = 140;
    }
    const base = y * W * 4;
    for (let x = 0; x < W; x++) {
      data[base + x * 4] = r;
      data[base + x * 4 + 1] = g;
      data[base + x * 4 + 2] = b;
    }
  }
}

function drawSun(): void {
  const cx = 400, cy = 140, rBig = 85, rCore = 42;
  const rBig2 = rBig * rBig, rCore2 = rCore * rCore;
  for (let y = cy - rBig; y <= cy + rBig; y++) {
    if (y < 0 || y >= H) continue;
    const dy = y - cy;
    const dy2 = dy * dy;
    for (let x = cx - rBig; x <= cx + rBig; x++) {
      if (x < 0 || x >= W) continue;
      const dx = x - cx;
      const d2 = dx * dx + dy2;
      if (d2 <= rBig2) {
        if (d2 <= rCore2) setPixel(x, y, 255, 245, 200);
        else setPixel(x, y, 255, 215, 150);
      }
    }
  }
}

function drawGrass(): void {
  for (let x = 0; x < W; x++) {
    const d = x - 256;
    const groundY = 370 + ((60 * d * d) >> 16); // 370 (center) -> 430 (edges)
    for (let y = groundY; y < H; y++) {
      const acc = (x * 31 + y * 17) % 40;
      if (acc < 3) setPixel(x, y, 55, 150, 150); // teal accent
      else setPixel(x, y, 95, 175, 105);          // grass green
    }
  }
}

function drawHeart(cx: number, cy: number, r: number, cr: number, cg: number, cb: number): void {
  // two top lobes
  fillCircle(cx - r / 2, cy, r, cr, cg, cb);
  fillCircle(cx + r / 2, cy, r, cr, cg, cb);
  // pointed bottom: triangle narrowing to a point at cy+2r
  for (let y = cy; y <= cy + 2 * r; y++) {
    const halfW = r - (y - cy) / 2;
    fillRect(cx - halfW, y, cx + halfW, y, cr, cg, cb);
  }
}

function drawRobot(): void {
  const creamR = 245, creamG = 245, creamB = 230;
  const bodyR = 235, bodyG = 235, bodyB = 220;
  // body
  fillRect(190, 326, 256, 370, bodyR, bodyG, bodyB);
  fillRect(196, 332, 250, 340, 215, 215, 200); // belly panel
  // head
  fillCircle(223, 298, 27, creamR, creamG, creamB);
  // eyes
  fillCircle(214, 294, 4, 30, 40, 50);
  fillCircle(232, 294, 4, 30, 40, 50);
  // smile
  fillRect(216, 305, 230, 305, 60, 50, 40);
  fillRect(218, 306, 228, 306, 60, 50, 40);
  fillRect(220, 307, 226, 307, 60, 50, 40);
  fillRect(222, 308, 224, 308, 60, 50, 40);
  // cheeks
  fillCircle(206, 302, 6, 255, 140, 120);
  fillCircle(240, 302, 6, 255, 140, 120);
  // antenna
  drawLine(223, 271, 223, 258, 120, 160, 200);
  fillCircle(223, 256, 5, 255, 140, 120);
  // arm holding string
  fillRect(250, 340, 262, 368, bodyR, bodyG, bodyB);
}

function drawKitten(): void {
  const furR = 255, furG = 205, furB = 150;
  // body
  fillRect(274, 342, 332, 372, furR, furG, furB);
  // head
  fillCircle(303, 326, 20, furR, furG, furB);
  // ears
  fillRect(288, 310, 298, 322, furR, furG, furB);
  fillRect(308, 310, 318, 322, furR, furG, furB);
  // eyes
  fillCircle(297, 323, 3, 60, 50, 40);
  fillCircle(309, 323, 3, 60, 50, 40);
  // nose
  fillCircle(303, 330, 3, 255, 170, 140);
  // smile
  fillRect(300, 334, 306, 334, 60, 50, 40);
  fillRect(301, 335, 305, 335, 60, 50, 40);
  fillRect(302, 336, 304, 336, 60, 50, 40);
}

function drawBalloon(): void {
  // glow
  fillCircle(205, 244, 30, 255, 170, 150);
  fillCircle(205, 244, 22, 255, 120, 100);
  // heart
  drawHeart(205, 248, 18, 255, 90, 80);
  fillCircle(199, 242, 5, 255, 210, 200); // highlight
}

function drawString(): void {
  drawLine(210, 276, 258, 360, 150, 130, 110);
}

function drawBirds(): void {
  const birds = [[100, 120], [140, 100], [180, 135]];
  for (const b of birds) {
    drawLine(b[0] - 14, b[1], b[0], b[1] + 12, 90, 70, 60);
    drawLine(b[0] + 14, b[1], b[0], b[1] + 12, 90, 70, 60);
  }
}

function buildPNG(): Buffer {
  drawSky();
  drawSun();
  drawGrass();
  drawRobot();
  drawKitten();
  drawBalloon();
  drawString();
  drawBirds();

  const raw = new Uint8Array(H * (1 + W * 3));
  let p = 0;
  for (let y = 0; y < H; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      raw[p++] = data[i];
      raw[p++] = data[i + 1];
      raw[p++] = data[i + 2];
    }
  }
  const idat = zlib.deflateSync(raw);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'entry.png');
  const png = buildPNG();
  fs.writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}

main();
