# ai-happy-rebuild

Draws one happy 512x512 PNG to `MAKEFUN_OUTPUT_DIR/entry.png` (default `/output`) using only the Node 22 stdlib.

## Scene

A tiny friendly round robot and a small kitten sitting side by side on a
grassy hill at sunrise, the robot holding a glowing heart-shaped balloon on a
string. Warm coral-gold sky, big soft sun, a few simple birds, teal accents in
the grass. Big simple shapes, warm palette, clean edges. No text.

## Run

```bash
MAKEFUN_OUTPUT_DIR=/output node --experimental-strip-types main.ts
```

Output defaults to `/output/entry.png`. Set `MAKEFUN_OUTPUT_DIR` to override.

## Notes

- Node 22 stdlib only: `node:zlib` deflate, `node:fs`, `node:path`.
- Own PNG encoder (IHDR/IDAT/IEND) with node:zlib deflate.
- Seeded integer math only — no `Date`, no `Math.random`.
- Deterministic: two runs produce byte-identical PNGs.
- ~1s wall time on 1 CPU; output ~7 KiB, well under 1 MiB.

## License

MIT
