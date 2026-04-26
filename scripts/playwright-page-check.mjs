import { chromium } from "playwright";
import path from "path";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("aside pre", { timeout: 15000 });

  const title = await page.title();
  const hasAside = await page.locator("aside pre").count();
  const hasMain = await page.locator("main").count();

  console.log("PASS: Page loaded");
  console.log("Title:", title);
  console.log("Aside pre count:", hasAside);
  console.log("Main count:", hasMain);
  console.log("Console errors:", errors.length ? errors.join("\n") : "none");

  await page.screenshot({ path: path.join(".cursor", "playwright-page-check.png"), fullPage: true });
} catch (e) {
  console.error("FAIL:", String(e));
  if (errors.length) console.error("Errors:", errors.join("\n"));
  try {
    await page.screenshot({ path: path.join(".cursor", "playwright-page-error.png"), fullPage: true });
  } catch {}
  process.exitCode = 1;
} finally {
  await browser.close();
}