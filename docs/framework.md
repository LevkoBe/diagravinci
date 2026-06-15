# Diagram as a Framework

Four stages. Each unlocks a different kind of value. Each builds on the last.

---

## 1. Sketch

_Before you can explain or improve a system, you need to see it. Invisible complexity cannot be reasoned about, shared, or reviewed. A rough diagram — even an incomplete one — is immediately more useful than no diagram._

- **Templates** — proven starting point; structure without blank-slate decisions
  - Layered Architecture, Capstone App, Microservices, User Journey — each encodes a known architectural pattern
  - Saved diagrams from prior work — a baseline rather than a blank slate
- **Canvas** — visual-first; right for spatial thinking and discovery
  - Place, connect, nest, and arrange elements directly
  - Class diagram mode — for data models and schemas
  - _Canvas and Code work together — Canvas for layout and arrangement; Code for structure, naming, and auto-layout._
- **Code (.dg syntax)** — structure-first; reproducible, diffable, version-controlled
  - Six element types: `{}` object, `[]` collection, `||` state, `()` function, `>>` flow, `<>` choice — each with a distinct semantic and execution role
  - Six relationship types: `->` association, `..>` flow, `-|>` inheritance, `..|>` realization, `o--` aggregation, `--` composition
  - Labels on relationships (`A --label--> B`) — name the method, event, or data crossing that boundary
  - Nesting for hierarchy; dot-notation for cross-block references (`system.api.auth`)
  - Flags (`:flagname`) — tag elements for selector targeting
- **AI** — describe-first; fastest path from idea to canvas
  - Natural language → initial diagram
  - Describe one component → targeted additions to an existing diagram

---

## 2. Deepen

_The sketch gives you a shape. This step gives you a complete picture — all components present, all connections named, all roles explicit. A diagram that only shows top-level blocks cannot answer "what depends on what" or "where does this responsibility live."_

- **Component completeness** — a diagram missing components creates false confidence in the architecture
  - Add subsystems, services, utilities, and shared infrastructure
  - Interfaces and abstractions separate from their implementations
  - Use the full type vocabulary: `||` for lifecycle stages, `>>` for pipeline and I/O boundaries, `<>` for decision points
- **Relationships** — connections are where architecture lives; an unlabeled arrow says nothing
  - Label every edge with the actual method, event, or data type crossing it
  - Use relationship kind intentionally: `->` for structural dependency, `..>` for data and execution flow, `-|>` for inheritance, `..|>` for interface realization, `o--` / `--` for ownership
  - Dependency direction — in clean architecture, arrows point inward; violations appear as wrong-direction arrows
- **Navigation as it grows** — a diagram too complex to navigate is as useless as no diagram
  - Fold to depth — collapse all elements below a chosen nesting level
  - Selective unfold — open one block; everything else stays folded (right-click to toggle)
  - Dot-notation for cross-block relationships without redeclaring nesting
- **AI for deepening** — use when unsure what belongs in a component or how components connect
  - Suggest missing subcomponents
  - Suggest relationships between existing elements
  - Evaluate architectural consistency

---

## 3. Showcase

_A complete diagram still needs to be communicated. Different audiences need different views of the same system; a live walkthrough needs different tools than a solo investigation. This step turns a complete diagram into a presentation artifact._

- **Filter** — remove noise without destroying the diagram
  - Groups: regex rules matched against element paths (`game{}.player{}` format)
    - Color mode — matched elements highlighted; others unchanged
    - Dim mode — matched elements prominent; others faded
    - Hide mode — matched elements visible; others removed from canvas
    - Stacked groups — multiple rules composited into one view
  - Sessions — named, saved group states; one-click perspective switch
    - Audience-specific (developer / product / management)
    - Flow-specific, abstraction-only, subsystem-only
- **Navigate** — walk through it live, not just look at it
  - Labeled edges as narration beats
  - Relationship step-through — edge-by-edge navigation
    - Sessions as chapters — switch perspectives mid-walkthrough
  - Keyboard: Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+Scroll zoom, Shift+Scroll pan
- **Animate** — show behavior, not just structure
  - Execute layout + Play — token simulation over the diagram
  - Six element types with distinct execution behaviors:
    - Objects `{}` — upsert incoming token's children into their own
    - Collections `[]` and States `||` — accumulate tokens; tokens persist
    - Functions `()` — receive and route tokens; dead ends remove the token
    - Flows `>>` — replace the token's payload with clones of their children
    - Choices `<>` — route tokens to "yes" or "no" branch based on a condition
  - Special functions: `gen()`, `round_robin()`, `duplicator()`, `multiplier_N()`, `throttler_N()`, `connector()`, `disconnector()`
  - User Journey: Choice elements `<>` for branching, color selectors for path highlighting, end-to-end token animation
- **Export and share** — reach audiences that aren't in the room
  - PNG export — for slides, reports, documentation
  - Live link — interactive; audience navigates independently
- **AI in showcase** — generate focused views when a question arises live
  - Generate a specific flow on demand
  - Explain a visible subsystem to the current audience

---

## 4. Evolve

_Systems change. New features, new constraints, new understanding of what was built. This step is Step 1 applied to what already exists — the same four input modes, now operating on a system that has history. The tools are identical. The purpose is different: not to create, but to extend, correct, and record._

- **Templates** — now: saved states of the current diagram
  - Save the current diagram as a snapshot — a point-in-time record
  - Load a previous snapshot for comparison
  - Open a copy as a future-state variant — sketch a proposed change without touching the record
- **Canvas** — now: free-form iteration on what exists
  - Add or remove elements (undo/redo)
  - Visual diff — added elements highlighted green, removed elements red
- **Code** — now: git-backed and reviewable
  - Flags (`:flagname`) — mark intent, open questions, and unresolved decisions on elements
  - Sessions — create views that isolate and highlight what's new or flagged
  - `.dg` committed alongside code — architecture and implementation in the same commit
  - `git diff` on a `.dg` = architecture diff, reviewable in a PR
- **AI** — now: improvement-oriented
  - Suggest new features based on what already exists
  - Identify gaps, missing connections, inconsistencies
  - Describe a future state → AI adds relevant elements to the current diagram
