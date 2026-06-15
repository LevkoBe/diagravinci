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

All groups are uniform — click-selection groups, rule-based groups, and diff groups all use the same `!group` directive. Selection groups carry a rule like `UserService?/OrderService?` (name wildcards) generated from the clicked elements.

Old `!selector` and `!rule` directives found in `.dg` files are automatically migrated to `!group` on the first save.

**Flags** (`element.flags[]`) are part of elements and are written to code via the `:flag` suffix on element declarations.

---

## Layer 2 — ViewState (browser storage only, not in code)

`ViewState` is persisted to IndexedDB / localStorage between sessions but is **never emitted to the code file**. These are canvas display properties, not diagram semantics.

| Field | What it stores |
|---|---|
| `positions` | Per-path `{x, y, size, value, width, height}` |
| `pan` | Canvas pan offset `{x, y}` |
| `zoom` | Canvas zoom level |
| `hiddenPaths` | Paths explicitly hidden from the canvas |
| `dimmedPaths` | Paths rendered at reduced opacity |
| `coloredPaths` | Per-path colour overrides (not group-based) |
| `foldedPaths` | Paths whose subtrees are collapsed |
| `viewMode` | `"normal" | "force" | "execute"` |
| `relationships` (visual) | Edge layout state |

Also browser-stored but not in code: fold settings (`foldLevel`, `foldActive`, manual fold/unfold overrides), UI preferences (`renderStyle`, `relLineStyle`, `opaqueElementBg`, …), and `filter.groups` (kept in sync with the code, but also cached in storage).

---

## Layer 3 — Tab-specific / ephemeral

Lost when the tab closes or the page reloads.

| Item | Storage | Notes |
|---|---|---|
| `activeSessionId` | `sessionStorage` | Which session is active; per-tab so different tabs can have different views |
| `selectedElementIds` | In-memory only | Always reset to `[]` on page load |
| `connectingFromId`, `zoomCommand`, `groupMoveSelectorId`, `navigationParentId` | In-memory only | Transient UI interaction state |
| Undo / redo history | In-memory only | `historySlice` is not persisted |
