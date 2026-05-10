# Legacy npm dependencies (optional local install)

These packages used to live in the **root** `package.json` but were removed: nothing under `src/` or `scripts/` imports them today. They are kept here so one-off experiments, old scripts, or future features can still install them without bloating the main app or Vercel builds.

## What is committed vs ignored

| Location | Git |
| -------- | --- |
| This folder (`docs/legacy-npm-deps/`) — manifest + this README | Tracked |
| `optional/legacy-npm-deps/` — your local `node_modules` + lockfile | **Ignored** (see root `.gitignore`) |

## One-time setup

From the **repository root**:

```bash
mkdir -p optional/legacy-npm-deps
cp docs/legacy-npm-deps/package.json optional/legacy-npm-deps/
cd optional/legacy-npm-deps
npm install
```

Use `npx` from that directory when you need a binary (e.g. `npx puppeteer …`), or reference modules with an explicit path / small script run from that folder. They are **not** on the main app’s `NODE_PATH`; the Next.js app does not bundle this tree.

## Packages included

- `@google-cloud/storage` — GCS client (unused in current tree)
- `fast-xml-parser` — XML parsing (unused in current tree)
- `multer` — multipart uploads (unused in current tree)
- `pdf-parse` / `@types/pdf-parse` — PDF text extraction (unused in current tree)
- `puppeteer` — headless Chrome (unused in current tree)
- `three` / `@types/three` — 3D runtime (unused in current tree)
- `ts-node` — legacy TS execution (root app uses `tsx` instead)

When you add a real dependency to the main app again, prefer moving it to root `package.json` and deleting it from this manifest so there is a single source of truth.
