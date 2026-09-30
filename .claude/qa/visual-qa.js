#!/usr/bin/env node
/**
 * DØi Labs — lightweight visual QA capture.
 *
 * Captures screenshots of the key page states at the widths required by
 * the doi-responsive-qa skill, plus basic structural checks (horizontal
 * overflow, console errors). Intended to be run by Claude (or a human)
 * against a locally served copy of the site before/after a frontend change.
 *
 * Requires:
 *   - `playwright`, installed globally (`npm root -g`) on the machine this
 *     runs on. Not a project dependency (see .claude/qa/README.md) — this
 *     script resolves it via the global npm root at runtime since Node
 *     doesn't search that path by default. If it's not installed globally
 *     either, this script cannot run; fall back to manual browser
 *     verification instead.
 *   - The site served locally, e.g.: `npx serve . -l 4220`
 *
 * Usage:
 *   node .claude/qa/visual-qa.js [baseUrl] [outDir]
 *
 *   baseUrl  default: http://localhost:4220
 *   outDir   default: /tmp/doi-visual-qa  (never the repo — see README)
 */

const path = require('path');
const fs = require('fs');

const BASE_URL = process.argv[2] || 'http://localhost:4220';
const OUT_DIR = process.argv[3] || '/tmp/doi-visual-qa';

const WIDTHS = [375, 393, 430, 768, 1024, 1280, 1440];

// Sections to jump to and capture, by element id/selector. Kept in sync
// with doi-responsive-qa's "important page states" list. Update this list
// if section ids change.
const STATES = [
  { name: 'hero-top', scrollTo: null },
  { name: 'industries', scrollTo: '#industries' },
  { name: 'services', scrollTo: '#services' },
  { name: 'pipeline', scrollTo: '#pipeline' },
  { name: 'deliverables', scrollTo: '.del-section' },
  { name: 'why', scrollTo: '#mission' },
  { name: 'contact', scrollTo: '#contact' },
  { name: 'footer', scrollTo: 'footer' },
];

function requirePlaywright() {
  try {
    return require('playwright');
  } catch (_err) {
    // Not on the default resolution path. It may still be installed
    // globally (e.g. `npm root -g`) without NODE_PATH set — try that
    // before giving up, rather than requiring the caller to know this.
    try {
      const { execSync } = require('child_process');
      const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
      module.paths.push(globalRoot);
      return require('playwright');
    } catch (err2) {
      return null;
    }
  }
}

async function main() {
  const pw = requirePlaywright();
  if (!pw) {
    console.error('playwright is not resolvable (checked local resolution + `npm root -g`) — see .claude/qa/README.md for the environment note.');
    process.exit(1);
  }
  const { chromium } = pw;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
  });

  const report = [];

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    // Weather widget in the mission-intake area calls a third-party API;
    // block it so QA runs don't depend on network access.
    await page.route('**://api.open-meteo.com/**', (r) => r.abort());

    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const hasOverflow = overflow.scrollWidth > overflow.clientWidth;

    const widthDir = path.join(OUT_DIR, String(width));
    fs.mkdirSync(widthDir, { recursive: true });

    for (const state of STATES) {
      if (state.scrollTo) {
        const exists = await page.evaluate((sel) => !!document.querySelector(sel), state.scrollTo);
        if (!exists) continue;
        await page.evaluate((sel) => document.querySelector(sel).scrollIntoView(), state.scrollTo);
        await page.waitForTimeout(500);
      } else {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: path.join(widthDir, `${state.name}.png`) });
    }

    report.push({
      width,
      hasOverflow,
      scrollWidth: overflow.scrollWidth,
      clientWidth: overflow.clientWidth,
      consoleErrors,
    });

    await page.close();
  }

  await browser.close();

  console.log(`\nScreenshots written to: ${OUT_DIR}\n`);
  console.log('Structural summary:');
  for (const r of report) {
    const flag = r.hasOverflow || r.consoleErrors.length ? '  <-- CHECK' : '';
    console.log(
      `  [${r.width}px] overflow=${r.hasOverflow} (scrollWidth=${r.scrollWidth} clientWidth=${r.clientWidth}) consoleErrors=${r.consoleErrors.length}${flag}`
    );
    for (const e of r.consoleErrors) console.log(`      ${e}`);
  }

  const anyIssue = report.some((r) => r.hasOverflow || r.consoleErrors.length);
  process.exit(anyIssue ? 1 : 0);
}

main();
