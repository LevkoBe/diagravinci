# DigraVinci

**Tri-Modal Diagramming — Code, Visual, and AI in one model**

[**Live Demo →**](https://levkobe.github.io/diagravinci/)

---

## Navigation

- [Why DigraVinci?](#why-diagravinci)
- [The Framework](#the-framework)
- [Walkthrough Video](#walkthrough-video)
- [Features](#features)
- [DSL Syntax Reference](#dsl-syntax-reference)
- [Getting Started Locally](#getting-started-locally)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Testing](#testing)
- [User Tutorial](#user-tutorial)
- [CI/CD](#cicd)
- [License](#license)

---

## Why DigraVinci?

Existing tools make you choose: use a visual editor (Lucidchart, Miro) or write code (PlantUML, Mermaid) or generate once with AI (Eraser.io) — but never all three on the same model. Teams end up juggling multiple tools depending on who is working and how, or sticking to one tool, disregarding personal preferences.

DigraVinci treats the diagram as a single model with three views. A product manager can sketch visually, a developer can define structure in code, and a junior teammate can generate a starting point with natural language — all working on the same diagram without conversion or duplication.

A few things that no other diagramming tool does together:

- **True bidirectional sync** — edit code and the canvas updates; drag a node and the code updates. Continuous, live sync in both directions.
- **Multiple interchangeable layout algorithms** — switch the same model between hierarchical, circular, radial, timeline, pipeline, and basic views without touching the underlying structure.
- **Selector-based filtering with sessions** — filter elements by name (regex), type, depth level, or boolean combinations; apply color, dim, or hide modes; save named presets as sessions for one-click perspective switching.
- **Diagram diff and merge** — paste new code over an existing diagram and get a visual diff with added/removed elements highlighted; accept or reject each change individually.
- **Multi-tab sync** — open the same diagram in multiple browser tabs; tabs stay in sync via BroadcastChannel while keeping filter state and view mode independent per tab.
- **AI that understands iteration** — the AI panel can generate from scratch or extend an existing diagram with context, detect structural bugs, and suggest architectural improvements — not just one-shot output.
- **Template collections** — built-in architectural patterns, product & process templates, and a DigraVinci collection; user-defined collections can be exported and imported as ZIP files.
- **Fully offline, fully client-side** — no account, no server, no telemetry. State persists in IndexedDB; diagrams save as plain `.dg` or `.jsonl` files you own.

---

## The Framework

DigraVinci is built around a four-stage workflow for turning a system into a diagram worth keeping:

**Sketch → Deepen → Showcase → Evolve**

Each stage uses the same four input modes (Canvas, Code, AI, Templates), but serves a different purpose. The loop is intentional: Evolve feeds back into Sketch each time something changes.

See [`docs/framework.md`](docs/framework.md) for the full breakdown of each stage and its tools.

The **DigraVinci collection** in the Template Panel contains diagrams of this framework itself — a feature snowflake, the cycle diagram, and the full architecture — ready to open and explore immediately.

---

## Walkthrough Video

> **Diagramming your project from scratch — a full walkthrough following the Sketch → Deepen → Showcase → Evolve framework.**
>
> Opens with a blank canvas. Walks through every stage: generating the initial structure from a description, refining it in code, filtering for different audiences with sessions, animating execution, and committing the `.dg` file alongside the code it documents.

**[Watch the walkthrough →](https://youtu.be/IpJ8uAoZsFw)**

---

## Features

### Editing Modes

- **Select / Move** — drag elements, pan canvas, single and multi-select
- **Create** — click anywhere on canvas to place a new element
- **Connect** — draw relationships between elements visually
- **Delete** — click elements to remove them
- **Disconnect** — click relationships to remove them
- **Presentation mode** — locked canvas with navigation controls for live walkthroughs

### Element Types

- **Object `{}`** — classes, entities, components
- **Collection `[]`** — arrays, lists, grouped containers
- **State `||`** — state machine nodes, lifecycle stages
- **Function `()`** — operations, methods, processes
- **Flow `>>`** — data pipelines, I/O stages
- **Choice `<>`** — conditional paths, decision branches

### Relationship Types

- **Association `-->`** — standard directed dependency
- **Loose dependency `..>`** — dotted directed dependency
- **Inheritance `--|>`** — generalization / extends
- **Realization `..|>`** — interface implementation
- **Aggregation `o--`** — has-a (hollow diamond)
- **Composition `*--`** — part-of (filled diamond)
- **Labeled relationships** — inline verb labels on any relationship (`user --places--> order`)

### Layout Algorithms

- **Hierarchical** — topologically sorted vertical levels; best for containment hierarchies and system architecture
- **Radial** — center node with concentric rings; best for snowflake and hub-and-spoke maps
- **Circular** — radial arrangement weighted by connectivity; best for peer networks and cyclic graphs
- **Timeline** — left-to-right columns by execution depth; best for workflows and state machines
- **Pipeline** — three-lane source / process / sink; best for ETL and data flows
- **Execute** — step-by-step execution simulation; tokens traverse the diagram following relationships
- **Force-directed** — physics-based spring layout; best for exploratory mapping
- **Basic** — recursive container positioning; default fallback

### Rendering Styles

- **SVG path** — smooth custom shapes per element type
- **Rectangle** — axis-aligned boxes for compact views
- **Polygon** — geometric multi-point shapes
- **Class diagram mode** — toggleable overlay that renders elements as UML-style class boxes; attributes and methods are inferred from nested elements and relationships

### Canvas Controls

- **Zoom in / out** — toolbar buttons, range 0.1× to 500×
- **Mouse wheel zoom** — Ctrl+Scroll / Cmd+Scroll
- **Scroll pan** — Shift+Scroll horizontal and vertical
- **Drag select** — click-drag to box-select multiple elements
- **Fit to view** — auto-frame the full diagram after layout change or on demand
- **Hover highlighting** — elements and relationship endpoints highlight on hover
- **Relationship navigation** — navigate between elements by stepping through highlighted relationships

### Filtering and Sessions

- **In-code selector directives** — define filter presets directly inside diagram code using `!rule`, `!selector`, and `!session` directives; loaded automatically when the diagram is parsed
- **Sessions** — named, saved selector states; one-click perspective switch between developer, product, management, or flow-specific views
- **Color mode** — highlight matching elements with a chosen color
- **Dim mode** — reduce opacity of non-matching elements
- **Hide mode** — fully remove non-matching elements from view
- **Selector by name** — substring or regex match on element identifiers
- **Selector by type** — match specific element types (object, function, state, etc.)
- **Selector by depth** — match elements within a min/max nesting level range
- **Selector by flag** — match elements tagged with `:flagname`
- **Boolean expressions** — combine rule atoms with `|`, `&`, `-` (NOT), and `()`
- **Stacked selectors** — multiple rules composited into one view
- **Export presets** — save all presets to a `.jsonl` file
- **Import presets** — load presets from a `.jsonl` file
- **Export filtered subset** — generate diagram code for only the currently visible elements

### Folding

- **Fold by depth** — configurable threshold; everything beyond depth N collapses
- **Manual fold toggle** — right-click any element to collapse/expand it individually
- **Manual override tracking** — per-element exceptions to the depth rule are remembered
- **Clear overrides** — reset all manual folds back to the depth rule
- **Collapsed badge** — collapsed elements show a summary count of hidden children

### AI Panel (Google Gemini)

- **Generate from natural language** — describe a system in plain English; receive valid diagram code
- **Context-aware generation** — optionally include the current diagram so AI adds to rather than replaces it
- **Bug analysis** — detect structural issues such as orphaned elements or unclear flows
- **Improvement suggestions** — architectural recommendations and alternative patterns
- **Response validation** — every AI response is parsed before being accepted; invalid output is rejected
- **Rate limiting** — 5 requests per minute, enforced client-side
- **API key storage** — stored in browser localStorage only; never sent anywhere except directly to Gemini

### Templates

- **DigraVinci collection** — diagrams of the tool itself: use case snowflake, feature snowflake, framework cycle, and full architecture (core and current)
- **Architecture collection** — SOLID principles, Design Patterns (GoF), Application Architecture (MVC, MVVM, Hexagonal, Clean, CQRS, Event Sourcing, Layered), System Architecture (Monolith, SOA, Serverless, BFF)
- **Product & Process collection** — User & Customer (user journeys, funnels, personas), Planning & Roadmap (OKR tree, story map, feature roadmap), Business Process (service blueprint, decision flow, ticket triage)
- **Exploration & Showcases** — execution examples, selector showcases, icon reference, all element types, all relationship types
- **Template metadata** — name, description, tags, preferred view mode per template
- **Apply template** — instantiate a template and switch to its preferred layout
- **Save as template** — save any current diagram as a reusable template
- **Custom collections** — organise templates into named, user-defined collections
- **Export collection** — download a collection as a ZIP file
- **Import collection** — load a collection from a ZIP file
- **Template search** — filter templates by name, description, or tags

### Execution Simulation

- **Execute layout** — switch any diagram to live execution mode; tokens flow through elements step by step
- **Token propagation** — tokens move along relationships, carrying animated state through the diagram
- **gen elements** — periodically spawn new tokens; configurable child elements define the spawned payload
- **round_robin routing** — distribute tokens across multiple outgoing relationships in rotation
- **Flow payload substitution** — when a `flow>>` element has children, the incoming token is replaced with clones of those children; a flow with no children passes the token through unchanged
- **Choice branching** — tokens fork at `<>` elements; children define the match condition
- **Function chaining** — functions declared inside functions model subroutine call order transparently
- **Special execution elements** — `multiplier_N` (fan-out N copies), `duplicator` (copy to all outgoing paths), `deduplicator` (suppress duplicate tokens per tick), `connector` (merge arrivals into one token), `disconnector` (split combined token back into parts), `throttler_N` (pass every Nth token)
- **Tick controls** — play, pause, step, and reset execution; configurable tick interval
- **Execution color** — active tokens highlighted with a distinct color across the canvas

### File Operations

- **Save diagram `.jsonl`** — full state: code, model, view state, positions
- **Load diagram `.jsonl`** — restore complete diagram state
- **Save code `.dg`** — export diagram syntax only
- **Load code `.dg`** — import diagram from a code file
- **Update with diff** — load new code over an existing diagram and enter diff/merge mode

### Diff and Merge

- **Visual diff** — added elements highlighted green, removed elements highlighted red
- **Accept individual** — right-click an element in diff mode to accept that single change
- **Accept all added** — batch-accept all new elements
- **Accept all removed** — batch-delete all removed elements
- **Clear diff** — exit diff mode without committing changes

### Undo / Redo

- **50-entry history** — circular buffer covering all state changes
- **Keyboard shortcuts** — Ctrl+Z to undo, Ctrl+Shift+Z or Ctrl+Y to redo
- **Debouncing** — 500 ms debounce prevents rapid edits from flooding the stack
- **Deduplication** — consecutive identical states (positions snapped to 5 px grid) are not duplicated

### Multi-Tab Sync

- **BroadcastChannel** — real-time diagram sync between browser tabs
- **Tab discovery** — HELLO/HELLO_REPLY handshake on tab open
- **Independent filter state** — each tab can activate different presets
- **Shared preset definitions** — preset library stays consistent across tabs
- **Debounced broadcast** — reduces message frequency under rapid edits

### Persistence

- **IndexedDB auto-save** — full app state written on every change (debounced 1 s)
- **Restore on reload** — diagram, theme, UI state, filter presets, fold state all restored
- **Panel size memory** — splitter ratios remembered between sessions

### Keyboard Shortcuts

- **Ctrl+Z** — undo
- **Ctrl+Shift+Z / Ctrl+Y** — redo
- **Ctrl+C / Ctrl+X / Ctrl+V** — copy, cut, paste selected elements
- **Ctrl+D** — duplicate selected elements
- **Ctrl+A** — select all
- **Delete / Backspace** — delete selected elements
- **Ctrl+Shift+K** — comment/uncomment lines in code editor
- **Ctrl+Scroll / Cmd+Scroll** — zoom in / out
- **Shift+Scroll** — pan horizontally / vertically
- **Right-click (diff mode)** — accept individual added/removed element
- **Right-click (normal)** — toggle fold on element

### Quick Reference

- **Help modal** — `?` button in the View toolbar group opens a built-in quick-reference card covering element types, relationship syntax, toolbar groups, keyboard shortcuts, and tips

---

## DSL Syntax Reference

The full reference is in [`docs/syntax-reference.md`](docs/syntax-reference.md). The essentials are below.

### Element Types

| Syntax     | Type       | Meaning                                                |
| ---------- | ---------- | ------------------------------------------------------ |
| `name{}`   | Object     | A single identifiable thing: class, entity, component. |
| `name[]`   | Collection | A plurality of things: array, list, queue, group.      |
| `name\|\|` | State      | A condition or lifecycle stage something can be in.    |
| `name()`   | Function   | An action: operation, process, transformation.         |
| `name>>`   | Flow       | A carrier of elements: pipeline stage or I/O boundary. |
| `name<>`   | Choice     | A decision point: conditional branch or routing gate.  |

A bare `name` with no wrapper defaults to Object.

### Nesting

```
system{
  frontend{ components{} pages{} }
  backend{ api() db{} }
}
```

### Relationships

```
a --> b             # association
a ..> b             # loose dependency / data flow
a --|> b            # inheritance (extends)
a ..|> b            # realization (implements)
a *-- b             # composition
a o-- b             # aggregation

a --places--> b     # labeled association
a --code..> b       # labeled flow
```

All six types have mirror forms (`<--`, `<..`, `<|--`, `<|..`, `--o`, `--*`) that place the arrowhead or diamond on the opposite element.

### Inline chains

```
A --> B --> C
gen(Item{}) --> queue[] --> handler()
```

### Dot-notation references

```
system{
  frontend{ pages{} }
  backend{ api() }
}

system.frontend.pages --> system.backend.api   # absolute
.frontend.pages --> .backend.api               # relative (inside a block)
```

### Flags

Elements accept one or more named flags for selector targeting:

```
knight:fine
queen:current:unlocked
```

### Directives

Lines beginning with `!` configure rules, selectors, and sessions.

```
!rule     id=api_layer    all_name=.*Service
!rule     id=deep         all_level=4-10
!rule     id=subtree      all=^Domain\.Layouts
!selector name=Services   expression=api_layer  color=#2196f3
!selector name=No_Deep    expression=-deep       color=#888888
!session  id=dev_view     label="Dev View"       selectors=services:color,no_deep:hide
```

**Rule keys** — `all_name=` (name regex), `all_level=N` or `all_level=N-M` (depth range), `all=` (full path regex); replace `all` with a specific type (`object`, `function`, `state`, `collection`, `flow`, `choice`) to restrict the match.

**Selector expression operators** — `ruleId` (matches rule), `-x` (NOT), `x | y` (OR), `x & y` (AND), `(…)` (grouping). Wrap compound expressions in quotes if they contain spaces.

**Selector modes** — controlled at runtime via sessions or the UI toggle:

| Mode    | Matching elements | Non-matching elements |
| ------- | ----------------- | --------------------- |
| `color` | colored           | unchanged             |
| `dim`   | unchanged         | dimmed                |
| `hide`  | unchanged         | hidden                |

**Sessions** — named presets that set specific modes for a group of selectors at once:

```
!session id=cd_view  label="Code Change Flow"  selectors=cd_flow:color,vis_flow:off
!session id=clean    label="Clean View"        selectors=noise:hide,detail:dim
```

### Comments

```
# full-line comment
A --> B  # inline comment
```

---

## Getting Started Locally

**Requirements:** Node.js 20+, npm

```bash
git clone https://github.com/LevkoBe/diagravinci.git
cd diagravinci
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### AI Setup

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/)
2. Open the AI panel in the app
3. Paste your key — it is saved to browser localStorage and sent only to the Gemini API directly

The free Gemini 2.5 Flash Lite tier allows 15 requests per minute and 1 million tokens per day. The app enforces a 5 requests/minute client-side limit and degrades gracefully if the API is unavailable.

### Scripts

```bash
npm run dev            # development server
npm run build          # production build (TypeScript + Vite)
npm run preview        # preview production build locally
npm run test           # run test suite (Vitest)
npm run test:coverage  # run tests with v8 coverage report
npm run lint           # ESLint
```

---

## Architecture

Four-layer clean architecture:

```
Presentation   React components — Canvas, Editor, Toolbar, Panels
Application    SyncManager, FilterResolver, AIOrchestrator, ExecutionEngine, TabSyncManager
Domain         DiagramModel, ViewState, Element, Relationship, Layouts, SelectorEvaluator
Infrastructure Parser, Lexer, CodeGenerator, AIServices, Persistence, CollectionRepository
```

**Bidirectional sync** works through a single Redux store as the source of truth. Both the code editor and the visual canvas are views of the same model. Changes from either side go through `SyncManager`, which parses or regenerates code, recalculates layout for new elements, merges positions for unchanged ones, and broadcasts the updated state.

**Layout** is computed by interchangeable strategy classes (`HierarchicalLayout`, `CircularLayout`, `RadialLayout`, `TimelineLayout`, `PipelineLayout`, `ExecuteLayout`, `ForceDirectedLayout`, `ManualLayout`) all extending a `BaseLayout` that handles recursive container positioning and size calculation. `ExecuteLayout` is driven by `ExecutionEngine`, which computes token movement deltas step by step and applies them to a live copy of the model.

**Filtering** uses a selector system: rules match elements by path, name, level, type, or flag; rules are combined with boolean operators evaluated by `SelectorEvaluator`; resolved visibility lists (`hiddenPaths`, `dimmedPaths`, `coloredPaths`, `foldedPaths`) are stored in `ViewState` and applied at render time. Sessions package named selector configurations for instant switching.

The DigraVinci architecture is itself documented as a `.dg` diagram — open the **DigraVinci collection** in the Template Panel to explore it interactively.

---

## Tech Stack

| Concern      | Choice                         | Reason                                                                                                          |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| UI Framework | React 19 + TypeScript          | Component model maps to diagram elements; TypeScript catches sync bugs at compile time                          |
| Canvas       | Konva.js + react-konva         | Hit detection, event handling, layering — without reimplementing them over raw Canvas API                       |
| Code Editor  | Monaco Editor                  | VS Code's editor engine; syntax highlighting and full keyboard navigation out of the box                        |
| State        | Redux Toolkit                  | Unidirectional flow is the right model for bidirectional sync; DevTools time-travel is invaluable for debugging |
| AI           | Google Gemini 2.5 Flash Lite   | Generous free tier (15 RPM, 1M tokens/day); structured JSON output; strong code generation                      |
| Build        | Vite 7                         | Fast HMR, native ES modules                                                                                     |
| Styling      | Tailwind CSS 4                 | Utility-first, no CSS file maintenance                                                                          |
| Testing      | Vitest + React Testing Library | Vite-native runner; behavioral component testing                                                                |
| CI/CD        | GitHub Actions                 | Free, integrated; deploy to GitHub Pages on every push to `main`                                                |

---

## Testing

```bash
npm run test           # run all tests
npm run test:coverage  # run with v8 coverage report
```

Test suites covering domain models, layout algorithms, parser/lexer, filter resolution, execution engine, Redux slices, and React components. Tests run automatically on every pull request via GitHub Actions before merge.

---

## User Tutorial

A step-by-step guide for first-time users: eight tasks covering visual editing, code editing, layout switching, templates, execution simulation, filtering, persistence, and AI generation.

See [`user_testing/USER_TESTING.md`](user_testing/USER_TESTING.md).

No account, no install — all tasks run in the browser at the [live demo](https://levkobe.github.io/diagravinci/).

---

## CI/CD

Two GitHub Actions workflows:

- **`deploy.yml`** — on push to `main`: type-check → build → deploy to GitHub Pages
- **`test-pr.yml`** — on pull requests: install → run full test suite

---

## License

[MIT](LICENSE)
