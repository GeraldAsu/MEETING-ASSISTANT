# Project Journal — DecisionLog

## Entry 1 — Initial review of v0

Reviewed the first working version: a form (Decision Title, Rationale/Context, Participants, Category/Tag) with Save, plus Export JSON/CSV and a Recorded Decisions list below. Built with HTML/CSS/JS and localStorage.

**What worked:**
- Making Rationale/Context a required field was the right call — it's the actual point of the tool, not an optional nice-to-have.
- Clean, minimal UI with no glassmorphism, consistent with the original brief.
- Export options signaled this was meant to be a system of record, not a throwaway form.

**Gaps identified:**
- No visible timestamp on entries.
- Participants as unstructured free text — no normalization, risk of duplicate identities ("Alice" vs "alice").
- No concept of decision lifecycle — decisions that get reversed or replaced would look contradictory with no trail.
- No search/filter on the decisions list — wouldn't scale past a handful of entries.
- Category/Tag as free text — risk of fragmentation ("Engineering" vs "engineering" vs "Eng").
- Couldn't confirm label/input association or focus states from a screenshot alone — flagged as an accessibility check needed in code.

**Decision:** Prioritize fixes as a structured list rather than freeform feedback, so they could be handed directly to an AI coding agent as explicit requirements — reducing back-and-forth and ambiguity in implementation.

---

## Entry 2 — Functional corrections

Turned the gaps above into concrete requirements:
- Auto-captured timestamp, displayed in human-readable format.
- Added a status field (Active/Superseded) with a "Supersede" action that links old and new decisions bidirectionally.
- Normalized participant and category input (trim, consistent casing) even while keeping free text for now — full structured participant data was judged as unnecessary complexity for this stage.
- Converted Category/Tag into a suggest-as-you-type field to reduce fragmentation without forcing rigid structure (later revised — see Entry 4).
- Added search and filter (status, category) to keep the list usable as it grows.
- Updated the localStorage schema to include the new fields, with a migration step so existing data wouldn't break or get wiped.

**Challenge:** Balancing "don't over-engineer the MVP" against "don't paint ourselves into a corner." Decided the supersede/lifecycle feature was worth the complexity now, since retrofitting decision history later would be much harder than adding a fixed category list or roster later.

---

## Entry 3 — UI pass

Once functional requirements were added, it became clear the UI needed a matching pass — more fields and controls meant a real risk of clutter creeping into what was supposed to stay minimal.

Addressed:
- Consistent spacing scale, toolbar layout for search/filters.
- Redesigned list rows as cards, with truncated rationale text and a "Show more" toggle to prevent runaway card height.
- Empty states for both "no decisions yet" and "no results match filters."
- Inline form validation (no browser alerts), save confirmation via toast + `aria-live`, disabled Save button during submission.
- Responsive behavior and minimum 44x44px tap targets for mobile use.
- Consistent typography scale and clear visual distinction between primary/secondary button styles.

**Decision:** Keep all of this scoped to CSS/markup changes only — no new JS frameworks, no visual "trend" additions, to stay consistent with the original no-glassmorphism, minimal brief.

---

## Entry 4 — Considered AI-generated decisions, then dropped it

Explored the idea of having AI extract decisions automatically from a pasted meeting transcript. Recognized this would require:
- An actual AI API call (cost per use).
- Reliable parsing of unstructured meeting text into structured decision entries — nontrivial complexity for the current stage.

**Decision:** Dropped the transcript-extraction idea for now. Instead, re-scoped the actual need — "reduce typing to the minimum" — into a **non-AI, fully offline autosuggest system**:
- Decision Title and Rationale/Context get hardcoded, realistic suggestion banks (title patterns and rationale starter phrases) plus autosuggest from the user's own past entries.
- Category/Tag converted from free-text-with-suggestions into a **fixed dropdown** of common categories — trading flexibility for consistency, since fragmentation was a bigger risk than rigidity at this scale.
- Participants converted from free text into a **picker populated from a hardcoded company roster array**, clicked instead of typed, with the array clearly marked for the user to replace with real names.

**Why this was the better call:** it delivers the actual user goal (less typing, more consistency) without introducing API cost, network dependency, or unreliable AI parsing into what's meant to be a fast, frictionless tool.

**Also added:** a Delete action per decision, with a confirmation step, and logic to clean up any supersede links pointing to a deleted entry so the data doesn't end up referencing missing decisions.

---

## Entry 5 — Consolidating into a single build prompt

Rather than handing corrections to the coding agent in multiple rounds (functional → UI → autosuggest → delete), merged everything into **one single, explicitly-scoped prompt** covering data model, functional changes, static suggestion data, UI improvements, and accessibility — in that order, since later sections depend on the data model being right first.

**Reasoning:** multi-round agent prompting tends to waste effort re-establishing context and inviting the agent to guess at intent between messages. A single, explicit, assumption-tolerant prompt (agent instructed not to ask clarifying questions, told to note assumptions in its summary instead) reduces round-trips and keeps the build efficient.

**Open items for next pass:**
- Replace placeholder `COMPANY_PEOPLE` array with the real team roster.
- Review whether the fixed category list matches how the team actually talks about categories.
- Revisit structured participant identities (not just casing normalization) once real usage patterns are visible.
- No multi-user sync yet — still single-browser localStorage only.