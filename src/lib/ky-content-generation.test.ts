import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { KYBill } from "@/types/kentucky";
// Only the pure prompt builder is imported. The module creates its Anthropic client
// lazily inside generateSummary, so importing it needs no ANTHROPIC_API_KEY and makes
// no network call.
import { buildBillSummaryUserPrompt } from "./ky-content-generation";

// Synthetic bill: only the fields the prompt reads are meaningful.
const bill = {
  bill_number: "HB 9999",
  title: "AN ACT relating to synthetic test fixtures.",
  description: "Create a new section of KRS Chapter 1 to define test fixtures.",
  status: "Passed House",
  chamber: "house",
  topics: ["Government"],
  legiscan_subjects: [{ subject_id: 1, subject_name: "State Government" }],
  editor_notes: null,
} as unknown as KYBill;

describe("buildBillSummaryUserPrompt", () => {
  test("contains the title and no Status line", () => {
    const prompt = buildBillSummaryUserPrompt(bill);
    assert.ok(prompt.includes("Title: AN ACT relating to synthetic test fixtures."));
    assert.ok(!prompt.includes("Status:"));
    assert.ok(!prompt.includes("Passed House"));
  });

  test("keeps the other inputs", () => {
    const prompt = buildBillSummaryUserPrompt(bill);
    assert.ok(prompt.includes("Bill Number: HB 9999"));
    assert.ok(prompt.includes("Description: Create a new section"));
    assert.ok(prompt.includes("Chamber: Kentucky House"));
    assert.ok(prompt.includes("Topics: Government"));
    assert.ok(prompt.includes("Official LegiScan subjects: State Government"));
  });
});
