/**
 * Debug VoiceFlowPanel wheel: open § server, measure @ncdai wheel DOM + overflow ancestors.
 * Requires: pnpm dev on http://127.0.0.1:3000 and `pnpm exec playwright install chromium` once.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), ".cursor");
const shot = path.join(outDir, "playwright-voice-wheel.png");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("aside pre", { timeout: 30000 });
  // Third server button = § = Voice / Samus column
  await page.locator("aside").first().locator("pre").nth(2).click();
  await page.waitForTimeout(800);
  await page.waitForSelector("[data-rwp]", { timeout: 30000 });

  const report = await page.evaluate(() => {
    function overflowChain(el) {
      const chain = [];
      let p = el;
      while (p && p !== document.documentElement) {
        const s = getComputedStyle(p);
        const ox = s.overflowX;
        const oy = s.overflowY;
        if (ox !== "visible" || oy !== "visible") {
          chain.push({
            tag: p.tagName,
            className: (p.className && String(p.className).slice(0, 80)) || "",
            overflowX: ox,
            overflowY: oy,
          });
        }
        p = p.parentElement;
      }
      return chain;
    }

    const rwp = document.querySelector("[data-rwp]");
    if (!rwp) return { error: "no [data-rwp]" };
    const options = [...rwp.querySelectorAll("[data-rwp-option]")];
    const visible = options.filter((li) => li.style.visibility !== "hidden");
    const highlight = rwp.querySelector("[data-rwp-highlight-wrapper]");
    const rect = rwp.getBoundingClientRect();
    return {
      optionLiCount: options.length,
      nonHiddenOptions: visible.length,
      pickerClientHeight: rect.height,
      pickerClientWidth: rect.width,
      overflowAncestors: overflowChain(rwp),
      highlightExists: !!highlight,
    };
  });

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: shot, fullPage: true });

  console.log(JSON.stringify({ base: BASE, screenshot: shot, report }, null, 2));
} catch (e) {
  console.error(String(e));
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: path.join(outDir, "playwright-voice-error.png"), fullPage: true });
  } catch {
    /* ignore */
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
