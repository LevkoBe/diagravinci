# Diagravinci

**Tri-Modal Diagramming — Code, Visual, and AI in one model**

[**Live Demo →**](https://levkobe.github.io/diagravinci/)

---

## Navigation

- [Why Diagravinci?](#why-diagravinci)
- [Features](#features)
- [DSL Syntax Reference](#dsl-syntax-reference)
- [Getting Started Locally](#getting-started-locally)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Testing](#testing)
- [CI/CD](#cicd)
- [License](#license)

---

## Why Diagravinci?

Existing tools make you choose: use a visual editor (Lucidchart, Miro) or write code (PlantUML, Mermaid) or generate once with AI (Eraser.io) — but never all three on the same model. Teams end up juggling multiple tools depending on who is working and how, or sticking to one tool, disregarding personal preferences.

Diagravinci treats the diagram as a single model with three views. A product manager can sketch visually, a developer can define structure in code, and a junior teammate can generate a starting point with natural language — all working on the same diagram without conversion or duplication.

A few things that no other diagramming tool does together:

- **True bidirectional sync** — edit code and the canvas updates; drag a node and the code updates. Continuous, live sync in both directions.
- **Multiple interchangeable layout algorithms** — switch the same model between hierarchical, circular, timeline, pipeline, and basic views without touching the underlying structure.
- **Selector-based filtering** — filter elements by name (regex), type, depth level, or boolean combinations; apply color, dim, or hide modes per preset; save and import/export presets as `.jsonl`.
- **Diagram diff and merge** — paste new code over an existing diagram and get a visual diff with added/removed elements highlighted; accept or reject each change individually.
- **Multi-tab sync** — open the same diagram in multiple browser tabs; tabs stay in sync via BroadcastChannel while keeping filter state and view mode independent per tab.
- **AI that understands iteration** — the AI panel can generate from scratch or extend an existing diagram with context, detect structural bugs, and suggest architectural improvements — not just one-shot output.
- **Template collections** — nine built-in architectural patterns, plus user-defined templates organised into named collections that can be exported and imported as ZIP files.
- **Fully offline, fully client-side** — no account, no server, no telemetry. State persists in IndexedDB; diagrams save as plain `.dg` or `.jsonl` files you own.

---

## Features

### Editing Modes

- **Select / Move** — drag elements, pan canvas, single and multi-select
- **Create** — click anywhere on canvas to place a new element
- **Connect** — draw relationships between elements visually
- **Delete** — click elements to remove them
- **Disconnect** — click relationships to remove them
- **Read-only / Pan** — locked canvas for presentation or review

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
- **Circular** — radial arrangement weighted by connectivity; best for peer networks and cyclic graphs
- **Timeline** — left-to-right columns by execution depth; best for workflows and state machines
- **Pipeline** — three-lane source / process / sink; best for ETL and data flows
- **Execute** — step-by-step execution simulation; tokens traverse the diagram following relationships; supports `gen` spawning, `round_robin` routing, `choice` branching, and `function` cloning
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

### Filtering System

- **In-code selector directives** — define filter presets directly inside diagram code using `!atom` and `!selector` directives; presets defined in code are loaded automatically when the diagram is parsed
- **Filter presets** — named configurations, each with its own selector rules and visual mode
- **Color mode** — highlight matching elements with a chosen color
- **Dim mode** — reduce opacity of non-matching elements to 0.18
- **Hide mode** — fully remove non-matching elements from view
- **Selector by name** — substring or regex match on element identifiers
- **Selector by depth** — match elements within a min/max nesting level range
- **Selector by raw path** — full regex on hierarchical element paths
- **Boolean combiners** — combine multiple atoms with logical operators
- **Selection preset** — dynamic preset that always reflects the current canvas selection
- **Preset reorder** — drag presets up/down to set priority
- **Cycle modes** — toggle a preset through Color → Dim → Hide → Off
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

- **Built-in templates** — MVC, Microservices, Event-Driven, Layered Architecture, Data Pipeline, State Machine, Cloud Infrastructure, CI/CD Pipeline, Analytics Platform
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
- **gen elements** — periodically spawn new tokens; configurable by `gen` label on the element
- **round_robin routing** — distribute tokens across multiple outgoing relationships in rotation
- **choice branching** — tokens fork at `<>` choice elements and follow all matching paths
- **function cloning** — tokens entering `()` elements trigger cloned sub-processes
- **Special execution elements** — named `()` functions with built-in behaviour: `multiplier_N` (fan-out to N copies), `duplicator` (copy token to all outgoing paths), `deduplicator` (suppress duplicate tokens), `connector` / `disconnector` (add or remove relationships at runtime), `throttler_N` (pass every Nth token)
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

### Properties Panel

- **Element details** — name, type, incoming and outgoing relationships
- **Rename** — edit element identifier inline
- **Delete** — remove selected element
- **Relationship list** — inspect all connections of the selected element

### Code Editor

- **Monaco editor** — the same engine as VS Code; full keyboard navigation
- **Live sync** — every edit is parsed and reflected on the canvas in real time
- **Syntax** — diagram DSL with nesting, relationships, labels, and comments

### Appearance

- **Dark / Light theme** — full two-scheme toggle
- **Theme persistence** — preference saved across sessions
- **Context-sensitive cursors** — cursor changes with the active interaction mode
- **Responsive toolbar** — collapses to a mobile menu on small screens
- **Zoom-adaptive rendering** — very small elements are simplified at low zoom levels
- **Dynamic render props** — label font size, stroke width, and icon size all scale with zoom

### Quick Reference

- **Help modal** — `?` button in the View toolbar group opens a built-in quick-reference card covering element types, relationship syntax, toolbar groups, keyboard shortcuts, and tips

### Keyboard Shortcuts

- **Ctrl+Z** — undo
- **Ctrl+Shift+Z / Ctrl+Y** — redo
- **Ctrl+Scroll / Cmd+Scroll** — zoom in / out
- **Shift+Scroll** — pan horizontally / vertically
- **Right-click (diff mode)** — accept individual added/removed element
- **Right-click (normal)** — toggle fold on element

---

## DSL Syntax Reference

### Element Types

```
name{}      # object     — class, entity, component
name[]      # collection — array, list, grouped container
|name|      # state      — state machine node, lifecycle stage
name()      # function   — operation, process
>name>      # flow       — pipeline stage, I/O
<name>      # choice     — branch, decision point
name        # bare name defaults to object
```

Same name used in multiple places refers to the same element (cross-referencing and reuse).

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
a ..> b             # loose dependency
a --|> b            # inheritance
a ..|> b            # realization
a *-- b             # composition
a o-- b             # aggregation

a --places--> b     # labeled association
```

### Chaining

```
player --> world --|> item *-- player o-- item
```

### State transitions

```
idle[] --start--> running[]
running[] --stop--> idle[]
```

### Flow with choice

```
>input> validate() <valid invalid>
valid >success> process()
invalid >error> reject()
```

### Dot-notation path references

Refer to a nested element by its full path using dots. Useful in relationships and cross-references without repeating the full nesting structure:

```
system{
  frontend{ pages{} }
  backend{ api() }
}

system.frontend.pages --> system.backend.api
```

Relative references (starting with `.`) are resolved from the current nesting level:

```
system{
  .frontend.pages --> .backend.api
}
```

### In-code selector directives

Define filter presets directly in diagram code using `!` directives. They are parsed and loaded automatically:

```
!atom id=api_layer name=api
!selector name=API mode=color color=#4488ff combiner=api_layer
```

`!atom` defines a reusable selector atom (matched by name, path, or level).
`!selector` assembles atoms into a named, immediately-active filter preset.

### Comments

```
# full-line comment
player{username}  # inline comment
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
Application    SyncManager, FilterResolver, AIOrchestrator, HistoryManager
Domain         DiagramModel, ViewState, Element, Relationship, Layout algorithms
Infrastructure Parser, CodeGenerator, Gemini client, Storage, TemplateRepository
```

**Bidirectional sync** works through a single Redux store as the source of truth. Both the code editor and the visual canvas are views of the same model. Changes from either side go through `SyncManager`, which parses or regenerates code, recalculates layout for new elements, merges positions for unchanged ones, and broadcasts the updated state.

**Layout** is computed by interchangeable strategy classes (`HierarchicalLayout`, `CircularLayout`, `TimelineLayout`, `PipelineLayout`, `ExecuteLayout`, `BasicLayout`) all extending a `BaseLayout` that handles recursive container positioning and size calculation. `ExecuteLayout` is driven by `ExecutionEngine`, which computes token movement deltas step by step and applies them to a live copy of the model.

**Filtering** uses a selector system: atoms match elements by path, name, level, or type; atoms are combined with boolean operators evaluated by `SelectorEvaluator`; resolved visibility lists (`hiddenPaths`, `dimmedPaths`, `coloredPaths`, `foldedPaths`) are stored in `ViewState` and applied at render time.

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

34 test suites, 836 tests covering domain models, layout algorithms, parser/lexer, filter resolution, execution engine, Redux slices, and React components.

Tests run automatically on every pull request via GitHub Actions before merge.

---

## CI/CD

Two GitHub Actions workflows:

- **`deploy.yml`** — on push to `main`: type-check → build → deploy to GitHub Pages
- **`test-pr.yml`** — on pull requests: install → run full test suite

---

## License

[MIT](LICENSE)
