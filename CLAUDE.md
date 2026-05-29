# DØi Labs — Claude Code Configuration

## Project Overview

**DØi Labs** is a California-based enterprise drone services company (FAA Part 107 certified). This repo is their marketing/lead-generation website deployed on Vercel.

### Tech Stack

- **Frontend**: Single-file vanilla HTML/CSS/JS — all styles and scripts are inlined directly in the HTML file, no build step
- **Backend**: One Vercel serverless function (`api/mission-intake.js`, ES module)
- **Dependencies**: `motion` v12 (available if needed for animation); no framework, no bundler
- **Deployment**: Vercel — `vercel.json` sets no-cache headers on `index.html`

### File Map

| File | Purpose |
|------|---------|
| `index.html` | Primary site (~9MB inline — all CSS/JS in one file) |
| `doilabs-v2.html` | Alternate/archive version of the site |
| `thank-you.html` | Post-form-submission success page |
| `api/mission-intake.js` | Serverless POST handler for the contact form |
| `vercel.json` | Cache-control headers for Vercel |
| `package.json` | Only dependency: `motion` |
| `*.png / *.webp / *.jpeg` | Drone/site imagery referenced directly from HTML |
| `*.mp4 / *.mov` | Hero background video |

### API: `POST /api/mission-intake`

Forwards contact-form submissions to a Power Automate webhook.

**Required env var**: `POWER_AUTOMATE_WEBHOOK_URL`

**Required body fields**: `clientName`, `clientEmail`, `clientPhone`, `missionType`

Validation: email regex, 2000-char max per field. Returns `{ success: true }` on success.

### Design System (index.html CSS vars)

```css
--bg: #080808        /* page background */
--og: #f08c00        /* orange accent */
--tiger: #ff6b1a     /* hover orange */
--t1: #f0f0f0        /* primary text */
--t2: #a8a8a8        /* secondary text */
--mono: 'Share Tech Mono'
--disp: 'Orbitron'
--body: 'Rajdhani'
```

Dark tactical aesthetic. Crosshair cursor. `clip-path` polygon buttons. Scroll-driven animations (drone fly-in, sticky pipeline, IntersectionObserver reveals).

### Key Sections in `index.html`

1. **Hero** (sticky scroll zone, 300vh) — drone scroll animation via `requestAnimationFrame`
2. **Proof Band** — 4 stats (500+ missions, 48HR turnaround, 2CM accuracy, 100% FAA)
3. **Pipeline** (sticky scroll zone, 800vh) — 7-step mission process with image/text sync
4. **Why DØi** — 6 capability cards with IntersectionObserver reveal
5. **Services** — 6 service cards
6. **Trust** — compliance/certification grid
7. **Contact Form** — multi-panel form, POSTs to `/api/mission-intake`
8. **Footer**

Mobile breakpoint: `900px`. Sticky pipeline replaced by `.mob-pipeline` on small screens.

### Development Conventions

- **No build step** — edit HTML files directly; changes are live on save
- **Styles live in `<style>` tags** inside each HTML file — do not create external CSS files
- **Scripts live in `<script>` tags** at the bottom of each HTML file — do not create external JS files
- **Images referenced by filename** from root — keep all media assets at root level
- **Never touch `node_modules/`** — `motion` is a dep but not currently imported in the HTML
- **API changes** require updating `api/mission-intake.js` and the `fetch('/api/mission-intake', ...)` call in `index.html` (~line 2484) together
- **Env var** `POWER_AUTOMATE_WEBHOOK_URL` must be set in Vercel project settings for the form to work

### Testing

There is no test suite. Verify changes by:
1. Opening the HTML file in a browser (or `npx serve .`)
2. Checking mobile layout at 900px breakpoint
3. Testing the contact form POST against a local or staging webhook URL

## Rules

- **ALWAYS do a full inquiry before every task** — read the actual files, run `ls` to check actual directory contents, verify actual filenames. NEVER guess. NEVER rely on recall from a previous session or earlier in the conversation. Always look at the real current state of the repo before making any change or statement.
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.claude/settings.json` has `attribution.commit` set (#2078). The Claude Code Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Spawning a Coordinated Team

```javascript
// ALL agents in ONE message, each knows WHO to message next
Agent({ prompt: "Research the codebase. SendMessage findings to 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Wait for 'researcher'. Design solution. SendMessage to 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Wait for 'architect'. Implement it. SendMessage to 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Wait for 'coder'. Write tests. SendMessage results to 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Wait for 'tester'. Review code quality and security.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Kick off the pipeline
SendMessage({ to: "researcher", summary: "Start", message: "[task context]" })
```

### Patterns

| Pattern | Flow | Use When |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Sequential dependencies (feature dev) |
| **Fan-out** | Lead → A, B, C → Lead | Independent parallel work (research) |
| **Supervisor** | Lead ↔ workers | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

## Swarm & Routing

### Config
- **Topology**: hierarchical-mesh (anti-drift)
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Agent Routing

| Task | Agents | Topology |
|------|--------|----------|
| Bug Fix | researcher, coder, tester | hierarchical |
| Feature | architect, coder, tester, reviewer | hierarchical |
| Refactor | architect, coder, reviewer | hierarchical |
| Performance | perf-engineer, coder | hierarchical |
| Security | security-architect, auditor | hierarchical |

### When to Swarm
- **YES**: 3+ files, new features, cross-module refactoring, API changes, security, performance
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes, questions

### 3-Tier Model Routing

| Tier | Handler | Use Cases |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2 | Haiku | Simple tasks, low complexity |
| 3 | Sonnet/Opus | Architecture, security, complex reasoning |

## Memory & Learning

### Before Any Task
```bash
npx @claude-flow/cli@latest memory search --query "[task keywords]" --namespace patterns
npx @claude-flow/cli@latest hooks route --task "[task description]"
```

### After Success
```bash
npx @claude-flow/cli@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx @claude-flow/cli@latest hooks post-task --task-id "[id]" --success true --store-results true
```

### MCP Tools (use `ToolSearch("keyword")` to discover)

| Category | Key Tools |
|----------|-----------|
| **Memory** | `memory_store`, `memory_search`, `memory_search_unified` |
| **Bridge** | `memory_import_claude`, `memory_bridge_status` |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_health` |
| **Agents** | `agent_spawn`, `agent_list`, `agent_status` |
| **Hooks** | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch` |
| **Security** | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |
| **Hive-Mind** | `hive-mind_init`, `hive-mind_consensus`, `hive-mind_spawn` |

### Background Workers

| Worker | When |
|--------|------|
| `audit` | After security changes |
| `optimize` | After performance work |
| `testgaps` | After adding features |
| `map` | Every 5+ file changes |
| `document` | After API changes |

```bash
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit
```

## Agents

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Architecture**: `system-architect`, `backend-dev`, `mobile-dev`
**Security**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Any string works as a custom agent type.

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
npm run build && npm test
```

## CLI Quick Reference

```bash
npx @claude-flow/cli@latest init --wizard           # Setup
npx @claude-flow/cli@latest swarm init --v3-mode     # Start swarm
npx @claude-flow/cli@latest memory search --query "" # Vector search
npx @claude-flow/cli@latest hooks route --task ""    # Route to agent
npx @claude-flow/cli@latest doctor --fix             # Diagnostics
npx @claude-flow/cli@latest security scan            # Security scan
npx @claude-flow/cli@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (swarm, memory, hooks). **CLI** is the same via Bash.
