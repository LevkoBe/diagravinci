# DigraVinci: State Persistence Reference

Three distinct layers hold state. Knowing which layer owns a piece of data tells you whether it survives a page reload, a new tab, or a file share.

---

## Layer 1 — Diagram model (written to code)

Everything in `DiagramModel` is serialised to the `.dg` code text by `CodeGenerator` and restored by `Parser`. This is the **canonical** source of truth — what you see in the code editor.

| Field | Code directive |
|---|---|
| `root`, `elements` | Element blocks (`Name{}`, `Name[]`, …) with `:flag` suffixes |
| `relationships` | Arrow lines (`A --> B`, `A --label--> B`) |
| `groups` | `!group  id=…  label=…  color=…  rule=…` |
| `sessions` | `!session  id=…  label=…  groups=id:mode,…` |

All groups are uniform — click-selection groups, rule-based groups, and diff groups all use the same `!group` directive. A click-selection group's `rule` is a generated regex of the form `(^|.*\.)player{}$|(^|.*\.)login\|\|$` — one regex alternative per selected element, matching the type-embedded path segment at any depth.

Old `!selector` and `!rule` directives found in `.dg` files are automatically migrated to `!group` on the first save.

**Flags** (`element.flags[]`) are part of elements and are written to code via the `:flag` suffix on element declarations.

---

## Layer 2 — Browser storage (not in code)

Persisted to **IndexedDB** (primary) with **localStorage** as a synchronous fallback. Survives page reloads but is never emitted to the code file.

### ViewState

Canvas display properties — keyed by type-embedded path (e.g. `game{}.player{}`):

| Field | What it stores |
|---|---|
| `positions` | Per-path `{id, position, size, value, isRecursive, width, height}` |
| `relationships` | Resolved edge layout: source/target paths, type, label, quantifiers |
| `viewMode` | Active layout mode (`"circular"`, `"radial"`, `"force"`, `"execute"`, …) |
| `pan` | Canvas pan offset `{x, y}` |
| `zoom` | Canvas zoom level |
| `hiddenPaths` | Paths removed from the canvas by active groups/sessions |
| `dimmedPaths` | Paths rendered at reduced opacity |
| `foldedPaths` | Paths whose subtrees are collapsed |
| `coloredPaths` | Per-path colour overrides from active groups/sessions |

### Filter state

| Field | What it stores |
|---|---|
| `groups` | Runtime mirror of `model.groups` — kept in sync with the code |
| `selectors` | Legacy selector list (expression-based; preserved for backward compatibility) |
| `foldLevel` | The depth at which fold-to-level collapses the tree |
| `foldActive` | Whether fold-to-level is currently enabled |
| `manuallyFolded` | Paths the user has explicitly folded |
| `manuallyUnfolded` | Paths the user has explicitly unfolded against the active fold level |

### UI preferences

| Field | What it stores |
|---|---|
| `renderStyle` | Element shape: `"svg" \| "rect" \| "polygon"` |
| `relLineStyle` | Edge routing: `"straight" \| "curved" \| "orthogonal"` |
| `classDiagramMode` | Whether class-diagram mode is active |
| `opaqueElementBg` | Whether element backgrounds are opaque |
| `interactionMode` | Last active interaction mode (select, create, connect, …) |
| `activeElementType` | Last selected element type in the toolbar |
| `activeRelationshipType` | Last selected relationship type in the toolbar |

---

## Layer 3 — Tab-specific / ephemeral

Lost when the tab closes or the page reloads.

| Item | Storage | Notes |
|---|---|---|
| `activeSessionId` | `sessionStorage` | Which session is active; per-tab so different tabs can have different views |
| `selectedElementIds` | In-memory only | Always reset to `[]` on page load |
| `connectingFromId`, `zoomCommand`, `groupMoveSelectorId`, `navigationParentId` | In-memory only | Transient UI interaction state |
| Undo / redo history | In-memory only | `historySlice` is not persisted |
