# Retail Readiness Scorecard — Project Context for Claude

## What this project is

A single-file HTML diagnostic tool for specialty food brand executives ($3M–$20M revenue) assessing retail launch readiness. The user selects a target retailer (Walmart, Costco, or Whole Foods), answers ~12–18 adaptive questions in a conversational style, and receives a Red/Yellow/Green scorecard across 8 operational dimensions — with a downloadable PDF they can hand to their COO or show in a buyer meeting. Runs fully offline from a local file or hosted URL. No login, no server, no loading spinner.

**Business question this project answers:** For a $3M–$20M specialty food brand, how ready are you for your target retailer launch — and where are the specific gaps that need to be fixed before you say yes to the buyer?

## Stack and tools

- Primary language: Vanilla JavaScript (ES modules, no framework)
- Build: Vite + vite-plugin-singlefile v2.3.0 — inlines all assets into one `.html` file
- PDF export: jsPDF v4 — programmatic drawing only, no html2canvas
- Charts: Hand-written SVG (no Chart.js, no D3)
- Fonts: Fontsource `@fontsource/playfair-display` + `@fontsource/source-sans-3` — woff2 for CSS, TTF for jsPDF via Vite `?base64` import. Fonts MUST live in `src/fonts/` (not `public/`) for inlining to work.
- Tests: Vitest — unit tests for `src/engine/scoring.js` and `src/engine/flow.js`
- Scoring artifacts: Python + YAML in `scoring_engine/` — human-readable, auditable, independent of the HTML build
- Entry point: `src/main.js` → builds to `dist/retail-readiness-scorecard.html`
- File size target: under 600KB for the output HTML (all assets inlined)

## Project files

- CLAUDE.md (this file) — permanent rules and facts
- DECISIONS.md — durable choices and reasoning
- HANDOFF.md — current session state
- PLAN.md — current work arc
- FAILURES.md — things tried that didn't work

Read PLAN.md and HANDOFF.md at session start. DECISIONS.md and
FAILURES.md as relevant.

## Voice and standards

- Question language: plain, direct, practitioner-fluent. Reference actual retailer thresholds (Walmart's 98% OTIF, not "a high threshold"). Sound like someone who has done this, not like a generic checklist.
- Results/PDF language: Economist style — sober, declarative, specific. "EDI capability is missing. Without it, Walmart will not process your purchase orders." Not "you may want to consider EDI solutions."
- No marketing voice or consultant filler ("leverage," "synergy," "best-in-class," "unlock," "drive value")
- No hedging that softens a real finding. Red means Red.

<!-- OPTIONAL: Data science / reporting projects — uncomment if relevant:
- Economist style for written deliverables: sober, declarative,
  data-forward
- Charts must be readable by non-data-scientist, non-researcher
  audiences
-->

## Rules

### Honesty and judgment

- Say "I don't know" or "I can't verify this" instead of guessing.
  This applies to industry context, technical claims, what code did,
  and anything else.
- Tell me what I need to hear, not what I want to hear. If a decision
  looks wrong, say so. If code I wrote has problems, say so. Honest
  assessment, not validation.
- If a rule in this file is too vague to verify whether you're
  following it, flag it for revision rather than guessing at compliance.

### Building and proposing

- No speculative abstractions. If something isn't needed right now,
  don't build it. Helper functions get added when called by real code,
  not in anticipation. Parameters get added when there's a second use
  case, not the first.
- When proposing a tool, library, or approach, present at least two
  alternatives with tradeoffs, even if one is clearly preferred. Do
  not propose a single solution and move on. The default failure mode
  is taking the route with less friction instead of the route that
  best fits the project — challenge yourself before proposing.
- Tie proposals back to the business question this project is
  answering. If you can't connect a proposal to that question, the
  proposal is probably fluff and should be reconsidered.

### How to work the project

- Work in vertical slices, not horizontal phases. Build one feature
  end-to-end (working from input to output) before moving to the
  next. Don't build all the backend, then all the frontend — build
  one complete piece at a time.
- When a feature is working, suggest a simple test to verify it stays
  working: "This works now — want to add a quick test so it doesn't
  break later?" Don't force testing, but make it easy to say yes.
- Do not start tasks outside the current PLAN.md arc without flagging
  it to the user first.
- Do not refactor unrelated code unprompted.
- Do not rename things unless asked.

### Git branching and worktrees

- **Work on main branch by default.** Do not create worktrees or
  separate branches unless the user explicitly asks for one. The
  overhead of merging back constantly is worse than the safety net
  of isolation for a solo developer.
- If you are already in a worktree when a session starts, push the
  work to main or create a PR to merge it — don't leave work
  stranded in a worktree.
- Before risky or experimental changes, suggest creating a branch:
  > "This is a significant change. Want to work on a branch so we
  > can easily undo it if it doesn't work out?"
- What counts as "risky": changing how the project is structured,
  trying a new library, rewriting a working feature, anything where
  you'd say "I'm not sure this will work."
- Keep it simple: `git checkout -b experiment/short-description`
  before the change, merge back to main if it works.
- Don't require branches for small, safe changes. This is about
  protecting against losing work, not adding process.

### Scope creep detection

- Periodically check whether the current work matches PLAN.md.
  If the user has been building something not in the plan for more
  than ~15 minutes, flag it:
  > "We've been working on [thing] but it's not in the current plan.
  > Want to add it to PLAN.md, or should we finish the planned work
  > first?"
- This is a gentle nudge, not a block. The user may have a good
  reason. But new developers often drift without realizing it, and
  drift is how projects never finish.
- Also flag if the user keeps adding tasks to PLAN.md without
  completing existing ones — the plan is growing instead of
  shrinking.

## Working with PLAN.md

PLAN.md defines the current arc of work. Read it at session start.

- Mark tasks complete as they're finished, in the same commit as the
  work
- If a task is wrong-sized, in the wrong order, or no longer relevant,
  flag it rather than silently restructuring
- "Out of scope" items are decisions, not suggestions — do not pull
  them into the current arc without explicit user approval

## Session reminders

### Reminding the user to /log

Prompt the user to run /log when:

- A meaningful change just landed (file written, bug fixed, feature
  added, decision made)
- A natural pause point is reached (about to switch tasks, finished a
  chunk of work)
- Roughly 30-45 minutes have passed since the last /log and real work
  has happened since then

Format as a clearly separated note. Do not nag — one suggestion per
trigger.

### Reminding the user to /wrap

Prompt the user to run /wrap when:

- Context usage crosses 65%
- The user says anything that suggests they're stopping
- A natural milestone is reached
- 90+ minutes have passed and work is winding down

Format as a clearly separated note. Do not nag.

### Session start protocol

**CRITICAL: Do this BEFORE doing anything else — even before
responding to the user's first message.** Do not assume no work has
been done. Do not assume this is a new project. Read the files first.

1. Read CLAUDE.md (this file) — understand project rules
2. Read PLAN.md — understand current work arc and task list
3. Read HANDOFF.md — understand where the last session left off
4. Read DECISIONS.md — understand durable choices already made
5. Skim FAILURES.md — know what's already been tried and failed
6. If HANDOFF.md's most recent entry is more than 24 hours old AND
   there are uncommitted changes, flag this — the previous session
   may have ended without /wrap
7. Briefly state the starting point from HANDOFF.md so the user
   confirms you're caught up. Example: "Last session ended with
   [X]. Picking up from [Y]. Sound right?"
8. Confirm the current PLAN.md arc is still active
9. Check the Improvement History section of PLAN.md. If the project
   is overdue for an audit (see frequency guide in /improve), mention
   it: "This project is due for a review — run /improve or
   /improve audit-only when you're ready."
10. Remind the user what commands are available:
    > Quick reminder: type / to see your commands. The main ones are
    > /log (save checkpoint), /wrap (end session), and /improve
    > (review and improve the project). Run /commands for the full list.

**If any of these files don't exist yet, THEN you can assume this is
a fresh project. But if they exist — read them. No exceptions.**

### Suggesting commands during work

Don't wait for the user to remember commands exist. Proactively
suggest the right command at the right moment:

- User just finished a task → "Good time to /log that."
- User seems unsure what to do next → "Want to run /improve to
  see what needs attention?"
- User is about to stop → "Run /wrap before you go so your next
  session picks up here."
- User asks "what can I do?" or "what commands are there?" →
  "Run /commands to see everything available."
- Project is overdue for review → "It's been [X days] since the
  last /improve. Worth a quick /improve audit-only?"
- User just built a UI feature or fixed something visible →
  "Want to run /qa to test that in a browser?"
- User is starting a new project and hasn't challenged the idea →
  "Before building, run /office-hours to stress-test the idea."
- User has a plan but hasn't reviewed it → "Run /plan-ceo-review
  for the product check, then /plan-eng-review for the technical
  check."

Keep suggestions to one line. Don't explain the command every time —
just name it and say why now. If the user ignores the suggestion,
don't repeat it in the same session.

## Defaults

- Default to flagging gaps rather than filling with plausible-sounding
  but unverified content
- Default to short responses unless the task is substantive
- Default to asking before promoting a log entry to a DECISIONS.md
  entry
- Default to answering, not offering to answer

Never write secrets, tokens, or passwords into tracked files, READMEs, or commit messages — use environment variables and secret stores only.
