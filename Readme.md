# DecisionLog

## What is this?

DecisionLog is a lightweight web tool that lets teams record decisions made during meetings — along with the reasoning behind them — so that context isn't lost weeks or months later. It answers one recurring, expensive question: **"Why did we decide this?"**

Every recorded decision captures the title, the rationale, who was involved, when it happened, what category it falls under, and its current status (active or superseded by a later decision).

## Who it's for

- Small to mid-sized product, engineering, or operations teams who make frequent decisions in meetings and don't have a lightweight way to track *why*, not just *what*.
- Teams that already have heavier tools (Jira, Notion, Confluence) but find decision rationale gets buried in tickets, docs, or Slack threads instead of living somewhere dedicated and searchable.
- Anyone onboarding new team members who need to understand the reasoning behind past choices without digging through old meeting notes.

## The problem it solves

Teams are good at recording *what* was decided (a ticket gets created, a doc gets updated) but bad at recording *why*. Six months later, someone asks "why did we pick this approach?" and the answer lives only in someone's memory — if they're even still on the team.

DecisionLog makes capturing the rationale a required, low-friction step, so:

- New team members can get context without interrupting anyone.
- Decisions that get revisited or reversed have a clear trail (superseded-by links) instead of looking contradictory or arbitrary.
- Teams build a searchable, filterable institutional memory instead of relying on individual recall.

## Technologies and tools used

- **HTML / CSS / Vanilla JavaScript** — no frameworks, kept intentionally simple and dependency-light.
- **Web Storage (localStorage)** — all data persists client-side; no backend or database required for this version.
- **Static, hardcoded suggestion data** — decision title examples, rationale starter phrases, category list, and company roster are built into the JS (no AI/API calls), keeping the tool fully offline and free to run.
- **Accessibility-first markup** — semantic labels, ARIA roles/attributes (`aria-required`, `aria-live`, combobox patterns), keyboard navigation, and WCAG AA color contrast throughout.

## Design principles

- **Minimal and consistent** — no glassmorphism, no visual trends that date quickly. Clean type, clear hierarchy, consistent spacing.
- **Low friction over completeness** — autosuggest and dropdowns reduce typing wherever possible; the goal is that recording a decision takes seconds, not minutes, so people actually do it.
- **Honest data model** — decisions can be marked "Superseded" and linked to what replaced them, so the log reflects how teams actually change their minds over time rather than pretending every decision is permanent.

## Status

Early-stage / actively evolving. Current version uses localStorage only (no multi-user sync). See `journal.md` for the build history and reasoning behind design decisions.