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

// WS5-08: `react-email` ships a preview CLI whose dependencies include socket.io. That
// stack is "installed, not reachable" only while app code imports the package root
// (`react-email`), whose runtime entry does not load it. A subpath import could change
// that, so this guard fails on any `react-email/...` specifier. See the 2026-11-25
// WS5-08 note in decisions.md.
describe("react-email entry (WS5-08)", () => {
  test("no file under src/ or scripts/ imports a react-email subpath", () => {
    const subpath = /(?:from|import|require)\s*\(?\s*['"]react-email\//;
    const offenders = filesMatching(sourceFiles(), (text) => subpath.test(text));
    assert.deepEqual(
      offenders,
      [],
      "Import from the package root ('react-email'). If a subpath is needed, re-check that no server trace pulls in socket.io and update the WS5-08 note.",
    );
  });
});

// WS5-02: dead files keep wrong facts alive (the veto rule lived in an unused file until #332)
// and keep dependencies installed (`openai` was used only by two). This guard fails when a
// source file under src/ cannot be reached from any entry point. It follows the import graph
// (static, `export … from`, side-effect, dynamic `import('…')` and `require('…')`), so a cluster
// of dead files that import each other is caught too.
describe("orphan files (WS5-02)", () => {
  // Files kept on purpose although nothing imports them. Add a reason and an owner, or delete the file.
  const ALLOWLIST = new Map<string, string>([
    ["src/app/lib/supabaseAdmin.ts", "S7: WS2-10 decides whether to delete it"],
    ["src/components/bills/StatsGrid.tsx", "documented as the metric-tile component in design-system/guidelines.md; owner kept it (WS5-02)"],
  ]);
  const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js", ".cjs"]);
  const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", ".js", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js"];
  const APP_ENTRY_NAMES = new Set([
    "page", "layout", "route", "loading", "error", "not-found", "global-error", "template",
    "default", "sitemap", "robots", "manifest", "opengraph-image", "twitter-image", "icon", "apple-icon",
  ]);
  const IMPORT_PATTERNS = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  /** Repo-relative POSIX paths of every code file under `dir`. */
  function listCode(dir: string, out: string[] = []): string[] {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) return out;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) listCode(rel, out);
      else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) out.push(rel);
    }
    return out;
  }

  function allCodeFiles(): Set<string> {
    const rootFiles = readdirSync(ROOT, { withFileTypes: true })
      .filter((e) => e.isFile() && CODE_EXTENSIONS.has(path.extname(e.name)))
      .map((e) => e.name);
    return new Set([...listCode("src"), ...listCode("scripts"), ...rootFiles]);
  }

  /** Entry points: Next special files, the proxy, tests, scripts, and root config (including instrumentation and Sentry files). */
  function isEntry(file: string): boolean {
    const base = path.posix.basename(file);
    const stem = base.slice(0, base.lastIndexOf("."));
    if (file.startsWith("src/app/") && APP_ENTRY_NAMES.has(stem)) return true;
    if (file === "src/proxy.ts" || file === "src/middleware.ts") return true;
    if (/\.test\.tsx?$/.test(file)) return true;
    if (file.startsWith("scripts/")) return true;
    return !file.includes("/");
  }

  function resolveSpecifier(from: string, spec: string, files: Set<string>): string | null {
    let base: string;
    if (spec.startsWith("@/")) base = path.posix.join("src", spec.slice(2));
    else if (spec.startsWith(".")) base = path.posix.join(path.posix.dirname(from), spec);
    else return null;
    for (const suffix of RESOLVE_SUFFIXES) {
      const candidate = path.posix.normalize(base + suffix);
      if (files.has(candidate)) return candidate;
    }
    return null;
  }

  function importsOf(file: string, files: Set<string>): string[] {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const found = new Set<string>();
    for (const pattern of IMPORT_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        const target = resolveSpecifier(file, match[1], files);
        if (target) found.add(target);
      }
    }
    return [...found];
  }

  test("every file under src/ is reachable from an entry point or is on the allowlist", () => {
    const files = allCodeFiles();
    const reachable = new Set<string>([...files].filter((f) => isEntry(f) || ALLOWLIST.has(f)));
    const stack = [...reachable];
    while (stack.length > 0) {
      const file = stack.pop() as string;
      for (const target of importsOf(file, files)) {
        if (!reachable.has(target)) {
          reachable.add(target);
          stack.push(target);
        }
      }
    }
    const orphans = [...files].filter((f) => f.startsWith("src/") && !reachable.has(f)).sort();
    assert.deepEqual(
      orphans,
      [],
      "Nothing imports these files. Delete them, or add each to ALLOWLIST in this block with a reason (WS5-02).",
    );
  });

  test("allowlist entries still exist", () => {
    const stale = [...ALLOWLIST.keys()].filter((f) => !existsSync(path.join(ROOT, f)));
    assert.deepEqual(stale, [], "Remove these from ALLOWLIST: the files are gone.");
  });
});
