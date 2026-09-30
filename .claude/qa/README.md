# DØi Frontend QA Tooling

Supports the `doi-responsive-qa`, `doi-accessibility`, `doi-performance`, and `doi-ux-critic` skills with a lightweight, repeatable check. See those skills for *what* to look for — this directory is the *how to run it*.

## Visual QA screenshots

```bash
# 1. Serve the site locally
npx serve . -l 4220

# 2. In another shell, capture screenshots + a structural summary
node .claude/qa/visual-qa.js
# optional args: node .claude/qa/visual-qa.js http://localhost:4220 /tmp/doi-visual-qa
```

Captures the 7 required widths (375/393/430/768/1024/1280/1440) × the important page states (hero, Mission Applications, Capabilities, workflow, deliverables, Why DØi, mission intake, footer), and reports horizontal overflow + console errors for each width. Exits non-zero if any width has an issue.

Screenshots are written to `/tmp/doi-visual-qa` by default — **outside the repo**. Do not commit screenshots; there's no reason for generated QA artifacts to live in git history. If you use a different `outDir`, keep it out of the repo, or it will need adding to `.gitignore`.

## Environment note: Playwright is not a project dependency

`playwright` is **not** in `package.json` and there's no `node_modules/playwright` in this repo — the site has no build step by design (see root `CLAUDE.md`), and adding a dev-only dependency for screenshots isn't worth changing that architecture.

In the Claude Code cloud sandbox this was set up in, `playwright` (with a pre-installed Chromium at `/opt/pw-browsers`) is installed **globally** (`npm root -g`), but Node does not search the global npm root by default — `require('playwright')` alone fails even though it's on the machine. `.claude/qa/visual-qa.js` works around this itself: it falls back to `npm root -g`, appends that path to `module.paths`, and retries the `require` before giving up. You don't need to do anything extra to use it in that sandbox.

**This is an environment-specific convenience, not a guarantee.** If you're running this from a different machine/environment and it still can't resolve playwright:

```bash
node -e "require.resolve('playwright')"          # fails if not on the default path
npm root -g                                       # check whether it's installed globally at all
NODE_PATH="$(npm root -g)" node -e "require.resolve('playwright')"   # confirms the fallback this script uses
```

...then either:
1. Install it ad hoc for the session: `npm install --no-save playwright && npx playwright install chromium` (do **not** add it to `package.json` without discussing it with the project owner first — see "Documented gaps" below), or
2. Skip automated screenshots and verify manually: `npx serve .` + open a real browser + resize/use devtools device emulation at the required widths.

## Documented gaps (do not silently invent tooling to fill these)

This repo has **no** build step, linter, formatter, type checker, or test suite — confirmed via `package.json` (only dependency: `motion`, no `scripts` block) and the root `CLAUDE.md` ("There is no test suite. Verify changes by: opening the HTML file in a browser..."). This is a deliberate architecture choice (single-file HTML/CSS/JS, no build step), not an oversight.

Because of this:
- **No Claude Code hooks were added** for formatter/lint/type-check/test-on-edit — there is nothing to wire them to. Adding a hook that shells out to a nonexistent `npm run lint` would just fail (or, worse, someone "fixes" it by installing a whole toolchain nobody asked for).
- If the project ever gains real scripts (`npm run lint`, `npm test`, etc.), add matching `PostToolUse` hooks in `.claude/settings.json` at that point — keyed off `Write|Edit|MultiEdit` the same way the existing claude-flow hooks are — rather than before there's anything for them to run.
- The one thing this repo *can* validate today is exactly what `.claude/qa/visual-qa.js` does: load the page and check for overflow/console errors. That's why it exists as a plain script rather than a hook — it needs a running local server, which isn't something you want to spin up on every keystroke.

## A note on video-heavy screenshots

This sandbox's headless Chromium cannot decode H.264 (`video.canPlayType('video/mp4; codecs="avc1..."')` returns `''`), so hero/background video elements will render blank in these screenshots. That's a known, environment-specific limitation — verify video-dependent visuals in a real browser separately, don't read too much into a blank hero background in a screenshot.
