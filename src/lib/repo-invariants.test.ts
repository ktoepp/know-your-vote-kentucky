/**
 * Repo invariants: tests that read files, not behavior. Add new invariants
 * here as `describe` blocks rather than new files.
 *
 * Paths resolve from `process.cwd()`, because `npm test` runs at the repo root.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCANNED_DIRS = ["src", "scripts"] as const;
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".mjs"]);

/** Recursively lists source files under `dir`, as repo-relative POSIX paths. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    // Skip test files, so this file can never match its own needles.
    if (entry.name.endsWith(".test.ts")) continue;
    if (!SCANNED_EXTENSIONS.has(path.extname(entry.name))) continue;
    out.push(path.relative(ROOT, full).split(path.sep).join("/"));
  }
  return out;
}

/** All scanned source files. Fails loudly first if cwd is not the repo root. */
function sourceFiles(): string[] {
  for (const d of SCANNED_DIRS) {
    const full = path.join(ROOT, d);
    assert.ok(
      existsSync(full) && statSync(full).isDirectory(),
      `Expected ${d}/ under cwd ${ROOT}. Run npm test from the repo root.`,
    );
  }
  return SCANNED_DIRS.flatMap((d) => walk(path.join(ROOT, d))).sort();
}

function filesMatching(files: string[], matches: (text: string) => boolean): string[] {
  return files.filter((f) => matches(readFileSync(path.join(ROOT, f), "utf8")));
}

// The D1 owner (WS4-02 / WS4-03a) updates these allowlists in the same PR if it
// moves either call site. Needles are built at runtime so their literals never
// appear in this file.
describe("LegiScan dataset gating (D1)", () => {
  const dotFetch = "." + "fetch" + "Dataset(";
  const opRe = new RegExp("op:\\s*['\"]get" + "Dataset['\"]");

  test("only the gated dataset store calls the client's dataset fetch", () => {
    assert.deepEqual(
      filesMatching(sourceFiles(), (text) => text.includes(dotFetch)),
      ["src/lib/legiscan-dataset-store.ts"],
      "Route getDataset through fetchDatasetZipGated (D1, LegiScan terms).",
    );
  });

  test("only the LegiScan client issues the getDataset op", () => {
    assert.deepEqual(
      filesMatching(sourceFiles(), (text) => opRe.test(text)),
      ["src/lib/ky-legiscan-client.ts"],
      "Only the LegiScan client may issue getDataset (D1).",
    );
  });
});
