/**
 * Test offramp modal on live Framer site.
 * Run: node thyquidity/test_offramp.js
 * Requires: npm install playwright
 *
 * PAGE=/hcp   - test specific page (default: /)
 * INJECT=1    - test with local scripts instead of deployed
 * HEADED=1    - show browser (for debugging)
 * ALL_LINKS=1 - test every external link on the page
 * CANCEL_RETRY=1 - click link, Cancel, click same link again (modal must reappear)
 * HEADED=1     - show browser (for debugging - run and watch what happens)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITE = "https://broad-flows-954001.framer.app/";
const INJECT = process.env.INJECT === "1";
const HEADED = process.env.HEADED === "1";
const PAGE = process.env.PAGE || "/";
const ALL_LINKS = process.env.ALL_LINKS === "1";
const CANCEL_RETRY = process.env.CANCEL_RETRY === "1";

async function run() {
  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[thyq]")) console.log("  [console]", text);
  });

  const url = SITE.replace(/\/$/, "") + (PAGE.startsWith("/") ? PAGE : "/" + PAGE);
  console.log("1. Navigating to", url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });

  if (INJECT) {
    console.log("2. Injecting local scripts...");
    for (const name of ["link_intercept_1a.js", "link_intercept_1b.js", "link_intercept_1c.js", "link_intercept_2.js"]) {
      const code = fs.readFileSync(path.join(__dirname, name), "utf8");
      const inner = code.replace(/^<script>\s*|\s*<\/script>$/g, "").trim();
      await page.addScriptTag({ content: inner });
    }
    await page.waitForTimeout(300);
  }

  console.log(INJECT ? "3" : "2", ". Checking window._thyq...");
  const thyqCheck = await page.evaluate(() => ({
    hasThyq: !!window._thyq,
    hasShow: !!(window._thyq && window._thyq.show),
    hasConfirm: typeof window.thyquidityConfirmOfframp,
    hasCancel: typeof window.thyquidityCancelOfframp,
  }));
  if (!thyqCheck.hasThyq) {
    console.error("FAIL: window._thyq not found. Scripts may not be loaded in Framer Custom Code.");
    await browser.close();
    process.exit(1);
  }
  if (!thyqCheck.hasShow) {
    console.error("FAIL: window._thyq.show missing. Check link_intercept_1a + 1b load order.");
    await browser.close();
    process.exit(1);
  }
  console.log("   OK: window._thyq exists, show:", thyqCheck.hasShow, "confirm:", thyqCheck.hasConfirm, "cancel:", thyqCheck.hasCancel);

  const step = INJECT ? 4 : 3;
  console.log(step + ". Looking for external links...");
  const links = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href]').forEach((a) => {
      try {
        const h = a.getAttribute("href") || a.href;
        if (!h || h.startsWith("#") || h.startsWith("javascript:")) return;
        const url = new URL(h, location.origin);
        if (url.origin !== location.origin) out.push({ href: url.href, text: (a.textContent || "").slice(0, 40).trim() });
      } catch (_) {}
    });
    return out;
  });

  if (!links.length) {
    console.error("FAIL: No external links found on page");
    await browser.close();
    process.exit(1);
  }
  const linksToTest = CANCEL_RETRY ? [links[0]] : ALL_LINKS ? links : [links[0]];
  console.log("   Found", links.length, "external links. Testing", linksToTest.length, "link(s)");
  if (CANCEL_RETRY) console.log("   Mode: Cancel then click again");

  let anyFailed = false;
  for (let i = 0; i < linksToTest.length; i++) {
    const targetHref = linksToTest[i].href;
    if (linksToTest.length > 1) console.log("\n--- Link", i + 1 + "/" + linksToTest.length + ":", targetHref, "---");

    console.log((step + 1) + ". Clicking external link...");
    const clicked = await page.evaluate((href) => {
      const anchors = document.querySelectorAll('a[href]');
      for (const a of anchors) {
        try {
          const u = new URL(a.href);
          if (u.href === href) { a.click(); return true; }
        } catch (_) {}
      }
      return false;
    }, targetHref);
    if (!clicked) {
      console.error("FAIL: Could not click link:", targetHref);
      anyFailed = true;
      continue;
    }

    await page.waitForTimeout(800);

    console.log((step + 2) + ". Checking for modal...");
    const modalFound = await page.evaluate(() => {
      const m = document.querySelector("[data-offramp-modal], #thyq-offramp-fallback");
      if (!m) return false;
      if (m.tagName === "DIALOG" && m.open) return true;
      return getComputedStyle(m).display !== "none";
    });

    if (!modalFound) {
      console.error("FAIL: Modal did not appear for link:", targetHref);
      const diag = await page.evaluate(() => ({
        hasOfframpModal: !!document.querySelector("[data-offramp-modal]"),
        hasFallback: !!document.getElementById("thyq-offramp-fallback"),
        pendingUrl: sessionStorage.getItem("thyquidity_pending_offramp_url"),
        handlers: { confirm: typeof window.thyquidityConfirmOfframp, cancel: typeof window.thyquidityCancelOfframp },
      }));
      console.error("   Diagnostic:", JSON.stringify(diag, null, 2));
      anyFailed = true;
      if (!ALL_LINKS) {
        if (HEADED) await page.waitForTimeout(5000);
        await browser.close();
        process.exit(1);
      }
      continue;
    }
    console.log("   OK: Modal visible");

    console.log((step + 3) + ". Closing modal (Cancel)...");
    const closed = await page.evaluate(() => {
      const btn = document.querySelector("[data-thyquidity-cancel]") || document.querySelector("[data-thyq-fb-cancel]") || document.querySelector("[data-framer-name='Cancel']") || document.querySelector("[aria-label='Close']") || Array.from(document.querySelectorAll("button, a")).find((el) => /cancel|close/i.test((el.textContent || el.getAttribute("aria-label") || "")));
      if (btn) { btn.click(); return true; }
      if (window.thyquidityCancelOfframp) { window.thyquidityCancelOfframp(); return true; }
      return false;
    });
    if (!closed) {
      console.error("FAIL: Could not close modal");
      anyFailed = true;
    }
    await page.waitForTimeout(400);

    if (CANCEL_RETRY && !anyFailed) {
      console.log((step + 4) + ". Clicking same link again...");
      const clickedAgain = await page.evaluate((href) => {
        const anchors = document.querySelectorAll("a[href]");
        for (const a of anchors) {
          try {
            const u = new URL(a.href);
            if (u.href === href) { a.click(); return true; }
          } catch (_) {}
        }
        return false;
      }, targetHref);
      if (!clickedAgain) {
        console.error("FAIL: Could not click link again:", targetHref);
        anyFailed = true;
      } else {
        await page.waitForTimeout(800);
        console.log((step + 5) + ". Checking modal reappeared...");
        const modalReappeared = await page.evaluate(() => {
          const m = document.querySelector("[data-offramp-modal], #thyq-offramp-fallback");
          if (!m) return false;
          if (m.tagName === "DIALOG" && m.open) return true;
          return getComputedStyle(m).display !== "none";
        });
        if (!modalReappeared) {
          console.error("FAIL: Modal did not reappear after Cancel");
          anyFailed = true;
        } else {
          console.log("   OK: Modal reappeared after Cancel");
          const closed2 = await page.evaluate(() => {
            const btn = document.querySelector("[data-thyquidity-cancel]") || document.querySelector("[data-thyq-fb-cancel]") || document.querySelector("[data-framer-name='Cancel']");
            if (btn) { btn.click(); return true; }
            if (window.thyquidityCancelOfframp) { window.thyquidityCancelOfframp(); return true; }
            return false;
          });
          if (!closed2) {
            console.error("FAIL: Could not close modal second time");
            anyFailed = true;
          }
          await page.waitForTimeout(400);
        }
      }
    }
  }

  if (anyFailed) {
    console.error("\nSome tests failed.");
    await browser.close();
    process.exit(1);
  }
  console.log("\nAll tests passed.");
  if (HEADED) {
    console.log("(Browser will close in 3s...)");
    await page.waitForTimeout(3000);
  }
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
