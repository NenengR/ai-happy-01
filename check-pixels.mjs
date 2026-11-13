import * as fs from 'node:fs';
import * as zlib from 'node:zlib';

const buf = fs.readFileSync('out/entry.png');
// parse PNG chunks
let off = 8; // skip signature
let idat = Buffer.alloc(0);
while (off < buf.length) {
  const len = buf.readUInt32BE(off); off += 4;
  const type = buf.toString('ascii', off, off + 4); off += 4;
  const data = buf.subarray(off, off + len); off += len;
  off += 4; // crc
  if (type === 'IDAT') idat = Buffer.concat([idat, data]);
  if (type === 'IEND') break;
}
const raw = zlib.inflateSync(idat);
const W = 512, H = 512;
function px(x, y) {
  const base = y * (1 + W * 3) + 1 + x * 3;
  return [raw[base], raw[base + 1], raw[base + 2]];
}
const samples = [
  ['sky top', 256, 10],
  ['sun core', 400, 140],
  ['grass', 256, 480],
  ['robot body', 223, 350],
  ['kitten fur', 303, 360],
];
for (const [name, x, y] of samples) {
  console.log(`${name} (${x},${y}): RGB(${px(x, y).join(',')})`);
}
