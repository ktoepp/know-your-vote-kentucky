import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FEEDBACK.md is committed to a public repository. It must never carry the
 * contact details of people who gave feedback (WS2-05). Raw artifacts live in
 * the gitignored docs/feedback/ directory instead.
 */

const FEEDBACK_PATH = join(process.cwd(), "FEEDBACK.md");

/** Domains that may appear in FEEDBACK.md: our own, and the RFC 2606 placeholder. */
const ALLOWED_EMAIL_DOMAINS = new Set(["kyvky.com", "example.com"]);

const EMAIL_RE = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

/** US phone numbers: 502-555-0100, (502) 555-0100, 502.555.0100, +1 502 555 0100. */
const US_PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g;

export function findDisallowedEmails(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(EMAIL_RE)) {
    const domain = match[1].toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.has(domain)) found.push(match[0]);
  }
  return found;
}

export function findPhoneNumbers(text: string): string[] {
  return [...text.matchAll(US_PHONE_RE)].map((m) => m[0]);
}

/**
 * `From:` lines must hold a role descriptor only, never `Name <address>` or an
 * address. Lines inside fenced code blocks are skipped: the entry schema's
 * template line is `From: <role descriptor, ...>`, a placeholder, not data.
 * The email and phone checks still cover fenced blocks.
 */
export function findContactFromLines(text: string): number[] {
  const lineNumbers: number[] = [];
  let inFence = false;
  text.split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence && /^\s*-?\s*From:/.test(line) && /[<@]/.test(line)) lineNumbers.push(i + 1);
  });
  return lineNumbers;
}

describe("repo hygiene: FEEDBACK.md", () => {
  const feedback = readFileSync(FEEDBACK_PATH, "utf8");

  // Failure messages report counts and line numbers, never the matched values,
  // so CI logs of a public repo do not re-publish what the test caught.
  test("has no email addresses outside the allowlist", () => {
    const hits = findDisallowedEmails(feedback);
    assert.equal(hits.length, 0, `${hits.length} non-allowlisted email address(es) in FEEDBACK.md`);
  });

  test("has no US phone numbers", () => {
    const hits = findPhoneNumbers(feedback);
    assert.equal(hits.length, 0, `${hits.length} phone number(s) in FEEDBACK.md`);
  });

  test("has no From: line containing < or @", () => {
    const lines = findContactFromLines(feedback);
    assert.deepEqual(lines, [], `From: lines with contact details at line(s) ${lines.join(", ")}`);
  });
});

describe("repo hygiene detectors", () => {
  test("flag a non-allowlisted email and allow kyvky.com / example.com", () => {
    assert.equal(findDisallowedEmails("write to person@example.org").length, 1);
    assert.equal(findDisallowedEmails("katie@kyvky.com and email@example.com").length, 0);
  });

  test("flag common US phone formats but not dates or bill numbers", () => {
    assert.equal(findPhoneNumbers("call 502-555-0100").length, 1);
    assert.equal(findPhoneNumbers("call (502) 555-0100").length, 1);
    assert.equal(findPhoneNumbers("call +1 502.555.0100").length, 1);
    assert.equal(findPhoneNumbers("2026-06-23, HB904, 1,737 bills, KRS 238.538(11)").length, 0);
  });

  test("flag From: lines with an address, not role descriptors", () => {
    assert.deepEqual(findContactFromLines("- From: A <a@b.c>"), [1]);
    assert.deepEqual(findContactFromLines("- From: a reader\n- From: someone@b.c"), [2]);
    assert.deepEqual(findContactFromLines('- From: <role descriptor, e.g. "a reader">'), [1]);
    assert.deepEqual(findContactFromLines('```\n- From: <role descriptor, e.g. "a reader">\n```\n- From: A <a@b.c>'), [4]);
  });
});
