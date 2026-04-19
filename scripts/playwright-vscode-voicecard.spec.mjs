// playwright-vscode-voicecard.spec.mjs
// Playwright test: verify VSCodeVoiceCard renders and is interactive
import { test, expect } from '@playwright/test';

test('VSCodeVoiceCard appears and is interactive', async ({ page }) => {
  // Adjust the URL if your dev server runs elsewhere
  await page.goto('http://localhost:3000');

  // Wait for the VSCodeVoiceCard to appear (look for the VS Code title)
  const card = await page.waitForSelector('text=VS Code', { timeout: 10000 });
  expect(card).toBeTruthy();

  // Take a screenshot for review
  await page.screenshot({ path: 'vscode-voicecard.png', fullPage: true });

  // Check that the START button is present and enabled
  const startButton = await page.waitForSelector('text=START');
  expect(await startButton.isEnabled()).toBe(true);

  // Optionally, click the START button (no destructive action expected)
  await startButton.click();

  // Log success
  console.log('VSCodeVoiceCard is present and interactive. Screenshot saved.');
});
