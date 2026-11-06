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
import { DATA_BUDGET } from "./data-budget";

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

// WS4-03a: a scheduled LegiScan job without a perRunCap key would resolve to a
// budget of 0 and fail on its first call; a key no job uses is dead config.
describe("LegiScan per-run caps match the scheduled caller tags (WS4-03a)", () => {
  // `/api/sync?source=` values that reach LegiScan, mapped to the caller tag
  // their pipeline entry point sets in src/lib/ky-sync-pipeline.ts.
  const SOURCE_TO_TAG: Record<string, string> = {
    bills: "sync-bills",
    legislators: "sync-legislators",
    votes: "sync-votes",
  };

  function vercelCronTags(): string[] {
    const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as {
      crons?: { path: string }[];
    };
    const tags: string[] = [];
    for (const cron of vercel.crons ?? []) {
      const source = new URL(cron.path, "https://example.com").searchParams.get("source");
      if (source && SOURCE_TO_TAG[source]) tags.push(SOURCE_TO_TAG[source]);
    }
    return tags;
  }

  function scriptCallerTags(): string[] {
    const re = new RegExp("with" + "LegiscanCaller\\(\\s*['\"]([a-z0-9-]+)['\"]", "g");
    const tags: string[] = [];
    for (const f of sourceFiles().filter((f) => f.startsWith("scripts/"))) {
      for (const m of readFileSync(path.join(ROOT, f), "utf8").matchAll(re)) tags.push(m[1]);
    }
    return tags;
  }

  function workflowEnvTags(): string[] {
    const dir = path.join(ROOT, ".github", "workflows");
    const re = new RegExp("^\\s*" + "LEGISCAN_" + "CALLER:\\s*['\"]?([a-z0-9-]+)", "gm");
    const tags: string[] = [];
    for (const f of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
      for (const m of readFileSync(path.join(dir, f), "utf8").matchAll(re)) tags.push(m[1]);
    }
    return tags;
  }

  const scheduled = () =>
    [...new Set([...vercelCronTags(), ...scriptCallerTags(), ...workflowEnvTags()])].sort();

  test("finds the known scheduled tags (guards the scanners themselves)", () => {
    const tags = scheduled();
    for (const t of ["sync-bills", "sync-legislators", "sync-votes", "dataset-sync", "accuracy-audit", "legislator-links"]) {
      assert.ok(tags.includes(t), `expected scheduled tag ${t}; found ${tags.join(", ")}`);
    }
  });

  test("every scheduled caller tag has a perRunCap key", () => {
    const caps = DATA_BUDGET.legiscan.perRunCap;
    const missing = scheduled().filter((t) => !Object.prototype.hasOwnProperty.call(caps, t));
    assert.deepEqual(missing, [], "Add a perRunCap key in src/lib/data-budget.ts (WS4-03a).");
  });

  test("every perRunCap key is used by a scheduled caller tag (no dead keys)", () => {
    const tags = new Set(scheduled());
    const dead = Object.keys(DATA_BUDGET.legiscan.perRunCap).filter((k) => !tags.has(k));
    assert.deepEqual(dead, [], "Remove the unused perRunCap key, or tag the job that uses it.");
  });
});
