/**
 * Test HCP modal on live Framer site.
 * Run: node thyquidity/test_hcp.js
 * Requires: npm install playwright
 *
 * HCP modal should appear when user clicks a link TO /hcp (or /healthcare) from a patient page.
 * Modal should only appear once per session (after Confirm, no modal on subsequent HCP link clicks).
 *
 * FROM_PAGE=/  - test single page (default: /)
 * ALL_PAGES=1  - test HCP link from every patient page
 * DIRECT=1     - test direct navigation to /hcp (modal should appear once)
 * INJECT=1     - inject local scripts (for testing before deploy)
 * HEADED=1     - show browser (for debugging)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITE = "https://broad-flows-954001.framer.app/";
const HEADED = process.env.HEADED === "1";
const FROM_PAGE = process.env.FROM_PAGE || "/";
const ALL_PAGES = process.env.ALL_PAGES === "1";
const DIRECT = process.env.DIRECT === "1";
const INJECT = process.env.INJECT === "1";

const HCP_PATHS = ["/hcp", "/healthcare"];

// Patient pages (non-HCP) from sitemap - /pt/*, /, /terms-of-use
const PATIENT_PAGES = [
  "/",
  "/pt/how-thyquidity-works",
  "/pt/save-on-thyquidity",
  "/pt/oliva2you",
  "/pt/faqs",
  "/pt/pi",
  "/pt/isi",
  "/terms-of-use",
];

function isHcpPath(pathname) {
  const p = (pathname || "").replace(/\/$/, "") || "/";
  return HCP_PATHS.some((b) => p === b || p.indexOf(b + "/") === 0);
}

async function testHcpFromPage(page, baseUrl, patientPath, runOncePerSession, doInject) {
  const fromUrl = baseUrl + (patientPath === "/" ? "" : patientPath);
  await page.goto(fromUrl, { waitUntil: "networkidle", timeout: 15000 });

  if (doInject) {
    await page.evaluate(() => {
      delete window._thyqInited;
      delete window._thyqPart2Inited;
    });
    for (const name of ["modal_tagger.js", "link_intercept_1a.js", "link_intercept_1b.js", "link_intercept_1c.js", "link_intercept_2.js", "modal_button_handler.js"]) {
      const file = path.join(__dirname, name);
      if (fs.existsSync(file)) {
        const code = fs.readFileSync(file, "utf8");
        const inner = code.replace(/^<script>\s*|\s*<\/script>$/g, "").trim();
        await page.addScriptTag({ content: inner });
      }
    }
    await page.waitForTimeout(300);
  }

  const thyqCheck = await page.evaluate(() => ({
    hasThyq: !!window._thyq,
    hasConfirmHcp: typeof window.thyquidityConfirmHcp === "function",
  }));
  if (!thyqCheck.hasThyq || !thyqCheck.hasConfirmHcp) {
    return { ok: false, reason: "window._thyq or thyquidityConfirmHcp missing" };
  }

  const hcpLinks = await page.evaluate(() => {
    const out = [];
    const H = ["/hcp", "/healthcare"];
    document.querySelectorAll("a[href]").forEach((a) => {
      try {
        const h = a.getAttribute("href") || a.href;
        if (!h || h.startsWith("#") || h.startsWith("javascript:")) return;
        const url = new URL(h, location.origin);
        if (url.origin !== location.origin) return;
        const p = url.pathname.replace(/\/$/, "") || "/";
        if (H.some((b) => p === b || p.indexOf(b + "/") === 0)) {
          out.push({ href: url.href });
        }
      } catch (_) {}
    });
    return out;
  });

  if (!hcpLinks.length) {
    return { ok: false, reason: "No HCP links on page", skip: true };
  }
  const targetHref = hcpLinks[0].href;

  await page.evaluate(() => {
    sessionStorage.removeItem("thyquidity_hcp_visited");
    sessionStorage.removeItem("thyquidity_pending_hcp_url");
  });

  const clicked = await page.evaluate((href) => {
    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      try {
        const u = new URL(a.href);
        if (u.href === href) {
          a.click();
          return true;
        }
      } catch (_) {}
    }
    return false;
  }, targetHref);
  if (!clicked) {
    return { ok: false, reason: "Could not click HCP link" };
  }

  await page.waitForTimeout(800);

  const modalVisible = await page.evaluate(() => {
    const m = document.querySelector("[data-hcp-modal], [data-offramp-modal], #thyq-offramp-fallback");
    return !!m && getComputedStyle(m).display !== "none";
  });
  if (!modalVisible) {
    const diag = await page.evaluate(() => ({
      pendingHcp: sessionStorage.getItem("thyquidity_pending_hcp_url"),
      visited: sessionStorage.getItem("thyquidity_hcp_visited"),
    }));
    return { ok: false, reason: "HCP modal did not appear", diag };
  }

  if (runOncePerSession) {
    const confirmed = await page.evaluate(() => {
      const btn =
        document.querySelector("[data-thyquidity-confirm]") ||
        document.querySelector("[data-thyq-fb-confirm]") ||
        document.querySelector("[data-framer-name='Default']");
      if (btn) {
        btn.click();
        return true;
      }
      if (window.thyquidityConfirmHcp) {
        window.thyquidityConfirmHcp();
        return true;
      }
      return false;
    });
    if (!confirmed) return { ok: false, reason: "Could not click Confirm" };
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
  } else {
    const cancelled = await page.evaluate(() => {
      const btn =
        document.querySelector("[data-thyquidity-cancel]") ||
        document.querySelector("[data-thyq-fb-cancel]") ||
        document.querySelector("[data-framer-name='Cancel']");
      if (btn) {
        btn.click();
        return true;
      }
      if (window.thyquidityCancelHcp) {
        window.thyquidityCancelHcp();
        return true;
      }
      return false;
    });
    if (!cancelled) return { ok: false, reason: "Could not click Cancel" };
    await page.waitForTimeout(400);
  }

  return { ok: true, targetHref };
}

async function run() {
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[thyq]")) console.log("  [console]", text);
  });

  const baseUrl = SITE.replace(/\/$/, "");

  if (DIRECT) {
    console.log("Testing HCP modal on direct navigation to /hcp...\n");
    const hcpUrl = baseUrl + "/hcp";
    const directContext = await browser.newContext();
    const directPage = await directContext.newPage();
    directPage.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[thyq]")) console.log("  [console]", text);
    });
    await directPage.goto(hcpUrl, { waitUntil: "networkidle", timeout: 15000 });
    if (INJECT) {
      await directPage.evaluate(() => {
        delete window._thyqInited;
        sessionStorage.removeItem("thyquidity_hcp_visited");
        sessionStorage.removeItem("thyquidity_pending_hcp_url");
      });
      for (const name of ["modal_tagger.js", "link_intercept_1a.js", "link_intercept_1b.js", "link_intercept_1c.js", "link_intercept_2.js", "modal_button_handler.js"]) {
        const file = path.join(__dirname, name);
        if (fs.existsSync(file)) {
          const code = fs.readFileSync(file, "utf8");
          const inner = code.replace(/^<script>\s*|\s*<\/script>$/g, "").trim();
          await directPage.addScriptTag({ content: inner });
        }
      }
      await directPage.waitForTimeout(300);
    }
    await directPage.waitForTimeout(600);

    const modalVisible = await directPage.evaluate(() => {
      const m = document.querySelector("[data-hcp-modal], [data-offramp-modal], #thyq-offramp-fallback");
      if (!m) return false;
      if (m.tagName === "DIALOG" && m.open) return true;
      return getComputedStyle(m).display !== "none";
    });
    if (!modalVisible) {
      const diag = await directPage.evaluate(() => ({
        hasModal: !!document.querySelector("[data-hcp-modal], [data-offramp-modal], #thyq-offramp-fallback"),
        visited: sessionStorage.getItem("thyquidity_hcp_visited"),
        pending: sessionStorage.getItem("thyquidity_pending_hcp_url"),
      }));
      console.error("FAIL: HCP modal did not appear on direct navigation to /hcp.");
      console.error("   (Direct-landing modal requires deployed link_intercept_1b.js. Diagnostic:", JSON.stringify(diag) + ")");
      await directContext.close();
      await browser.close();
      process.exit(1);
    }
    console.log("   OK: Modal appeared on direct /hcp navigation");

    const cancelled = await directPage.evaluate(() => {
      const btn =
        document.querySelector("[data-thyquidity-cancel]") ||
        document.querySelector("[data-thyq-fb-cancel]") ||
        document.querySelector("[data-framer-name='Cancel']");
      if (btn) {
        btn.click();
        return true;
      }
      if (window.thyquidityCancelHcp) {
        window.thyquidityCancelHcp();
        return true;
      }
      return false;
    });
    if (!cancelled) {
      console.error("FAIL: Could not dismiss modal");
      await browser.close();
      process.exit(1);
    }
    await directPage.waitForTimeout(400);

    console.log("   OK: Dismissed modal");
    await directPage.goto(baseUrl + "/", { waitUntil: "networkidle", timeout: 10000 });
    await directPage.goto(hcpUrl, { waitUntil: "networkidle", timeout: 10000 });
    await directPage.waitForTimeout(500);

    const modalReappeared = await directPage.evaluate(() => {
      const m = document.querySelector("[data-hcp-modal], [data-offramp-modal], #thyq-offramp-fallback");
      return !!m && (m.tagName !== "DIALOG" || m.open) && getComputedStyle(m).display !== "none";
    });
    if (modalReappeared) {
      console.error("FAIL: HCP modal appeared again (should only appear once per session)");
      await directContext.close();
      await browser.close();
      process.exit(1);
    }
    console.log("   OK: Modal did not reappear on second visit");
    console.log("\nDirect navigation test passed.");
    await directContext.close();
  } else if (ALL_PAGES) {
    console.log("Testing HCP modal from every patient page...\n");
    let failed = 0;
    let skipped = 0;
    for (const patientPath of PATIENT_PAGES) {
      const label = patientPath === "/" ? "/" : patientPath;
      process.stdout.write(`  ${label} ... `);
      const result = await testHcpFromPage(page, baseUrl, patientPath, false, INJECT);
      if (result.skip) {
        console.log("SKIP (no HCP links)");
        skipped++;
      } else if (result.ok) {
        console.log("OK");
      } else {
        console.log("FAIL:", result.reason, result.diag ? JSON.stringify(result.diag) : "");
        failed++;
      }
    }
    console.log("");
    if (failed > 0) {
      console.error(`${failed} page(s) failed.`);
      await browser.close();
      process.exit(1);
    }
    if (skipped === PATIENT_PAGES.length) {
      console.error("No patient pages have HCP links.");
      await browser.close();
      process.exit(1);
    }
    console.log("All patient pages with HCP links passed.");
  } else {
    const fromPath = FROM_PAGE.startsWith("/") ? FROM_PAGE : "/" + FROM_PAGE;
    const fromUrl = baseUrl + (fromPath === "/" ? "" : fromPath);
    console.log("1. Navigating to", fromUrl);
    console.log("2-5. Clicking HCP link, verifying modal, clicking Confirm...");
    const result = await testHcpFromPage(page, baseUrl, fromPath, true, INJECT);
    if (!result.ok && result.skip) {
      console.error("FAIL: No links to /hcp or /healthcare found on page");
      await browser.close();
      process.exit(1);
    }
    if (!result.ok) {
      console.error("FAIL:", result.reason, result.diag ? JSON.stringify(result.diag, null, 2) : "");
      await browser.close();
      process.exit(1);
    }
    const afterConfirm = page.url();
    if (!isHcpPath(new URL(afterConfirm).pathname)) {
      console.error("FAIL: Did not navigate to HCP. URL:", afterConfirm);
      await browser.close();
      process.exit(1);
    }
    console.log("   OK: Navigated to", afterConfirm);

    const fromUrlForRetry = baseUrl + (FROM_PAGE.startsWith("/") && FROM_PAGE !== "/" ? FROM_PAGE : FROM_PAGE === "/" ? "" : "/" + FROM_PAGE);
    console.log("7. Navigating back to patient page...");
    await page.goto(fromUrlForRetry, { waitUntil: "networkidle", timeout: 10000 });

    console.log("8. Clicking HCP link again (modal should NOT appear - once per session)...");
    const clickedAgain = await page.evaluate((href) => {
      const anchors = document.querySelectorAll("a[href]");
      for (const a of anchors) {
        try {
          const u = new URL(a.href);
          if (u.href === href) {
            a.click();
            return true;
          }
        } catch (_) {}
      }
      return false;
    }, result.targetHref);
    if (!clickedAgain) {
      console.error("FAIL: Could not click HCP link again");
      await browser.close();
      process.exit(1);
    }
    await page.waitForTimeout(600);

    const modalReappeared = await page.evaluate(() => {
      const m = document.querySelector("[data-hcp-modal], [data-offramp-modal], #thyq-offramp-fallback");
      return !!m && getComputedStyle(m).display !== "none";
    });
    if (modalReappeared) {
      console.error("FAIL: HCP modal appeared again (should only appear once per session)");
      await browser.close();
      process.exit(1);
    }
    console.log("   OK: Modal did not appear (once per session working)");

    await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
    const finalUrl = page.url();
    if (!isHcpPath(new URL(finalUrl).pathname)) {
      console.error("FAIL: Did not navigate to HCP on second click. URL:", finalUrl);
      await browser.close();
      process.exit(1);
    }
    console.log("   OK: Navigated directly to HCP without modal");

    console.log("\nAll HCP tests passed.");
  }

  if (HEADED) {
    console.log("(Browser will close in 2s...)");
    await page.waitForTimeout(2000);
  }
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
