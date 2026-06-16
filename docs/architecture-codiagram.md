### How to read this document

This is a per-file map of which user-facing flows (CD/VIS/UI/AI, defined below) touch which source file, and roughly in what call order. The numbers double as a lightweight control-flow trace, not just a checklist.

**Legend:**

| Symbol                                  | Meaning                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `+`                                     | The file backs this flow but is structural/shared support (types, rendering primitives, registries, utilities) — always present, not part of the sequential trace, no specific position matters.                                                                                                                         |
| `-`                                     | The file is not involved in this flow at all.                                                                                                                                                                                                                                                                            |
| Whole number (`1`, `2`, `3`, …)         | A step where control crosses to a **different actor** that does not hand a value back into the caller's own continuing logic — a dispatch to the Redux store, a callback fired into another subsystem, kicking off an independent loop. Whole numbers increase as control moves further down the flow, caller to callee. |
| Floating-point number (`2.1`, `2.2`, …) | A **synchronous call made by** the file at the parent whole number, whose result is consumed by that same parent before it continues its own logic (or exits to the next whole number). A "called and returns to caller" step — nested, not handed off.                                                                  |
| `a;b` (e.g. `5.1;6.1`)                  | The file is reached from **two distinct parent steps** in the same flow — not sequential, two separate call sites. (Example below.)                                                                                                                                                                                      |

**Worked example — CD column** (`CodeEditor` → `SyncManager.syncFromCode` → …):

1. `CodeEditor.tsx` (`1`) — user types; whole number because control leaves the component and enters `SyncManager`.
2. `SyncManager.ts` (`2`) — takes over. Everything it calls synchronously and digests itself is numbered `2.x`, in real call order (see `syncFromCode` in `SyncManager.ts`):
   - `Lexer.ts` (`2.1`) — tokenize, returns tokens to `SyncManager`.
   - `Parser.ts` (`2.2`) — parse, returns a `DiagramModel`.
   - `groupUtils.ts` (`2.3`) — normalizes session/group directives in the code, returns the updated code + model.
   - `ModelDiffer.ts` (`2.4`) — diff against the current model, returns a `ModelDiff`.
   - `ViewStateMerger.ts` (`2.5`) — merge into a new `ViewState`.
   - `ForceSimulationService.ts` (`2.6`) — started/stopped as a side effect inside the same function body, right before `SyncManager` hands off; even though it kicks off its own independent `requestAnimationFrame` loop (conceptually a "whole number" kind of thing — see the **FORCE** sub-flow below), the _call_ that starts/stops it is still synchronous and returns into `syncFromCode`, so it stays a floating sub-step of `2`.
3. `diagramSlice.ts` (`3`) — whole number: `SyncManager` dispatches, handing control to Redux — a different actor.
4. `VisualCanvas.tsx` (`4`) — whole number: the store notifies subscribers; the component tree, a different actor again, takes over.

The `5.1;6.1` / `5.2;6.2` pattern on `Lexer.ts`/`Parser.ts` in the **AI** column is the multi-parent case: `ResponseValidator` (step `5`) parses the AI's output once to validate it, then `SyncManager` (step `6`, via `syncFromAI` → `syncFromCode`) parses it again for real — same files, two distinct call sites in the same flow.

---

### Flows:

- **TPL** (sub-case of CD): `TemplatePanel` → `SyncManager.syncFromTemplate` → `syncFromCode(code, false, resetSessions=true)` — same pipeline as CD, but also wipes `groups`/`selectors`/`sessions` before parsing so a loaded template starts from a clean slate.
- **CD**: `CodeEditor` → `SyncManager.syncFromCode` → `Lexer` → `Parser` → `ModelDiffer` → `ViewStateMerger` → `diagramSlice` → `VisualCanvas`
- **VIS**: `VisualCanvas`/`DiagramLayerRenderer` → callbacks → `SyncManager.syncFromVis` → `CodeGenerator` → `ModelDiffer` → `ViewStateMerger` → `diagramSlice` → `CodeEditor`
- **UI**: `ToolBar` → `uiSlice`/themes (`themes.ts` tokens applied directly via c7one, no Redux slice) → `VisualCanvas` reacts to mode/zoom; save/load dispatches directly to `diagramSlice` or `syncFromCode`
- **AI**: `AIPanel` → `AIOrchestrator` → `PromptBuilder` → `GeminiService` → `ResponseValidator` → `SyncManager.syncFromAI` → same as CD path
- **EXEC**: `ToolBar` (play/pause/step) → `ExecutionEngine` → `executionSlice` → `ExecuteLayout` → `VisualCanvas`
- **TAB**: `TabSyncManager` ↔ `BroadcastChannel` ↔ other-tab `TabSyncManager` → `diagramSlice`/`filterSlice`
- **FORCE** (sub-case, runs alongside CD/VIS/UI/AI): whenever `viewMode === "force"`, `SyncManager.restartForceIfNeeded` starts `ForceSimulationService`, which runs its own `requestAnimationFrame` loop dispatching `batchUpdatePositions` directly to `diagramSlice` — the only place outside `SyncManager.syncFrom*` that writes positions on every tick without going through `ViewStateMerger`.
- `navigate.ts` (`navigateSelection`/`navigateAlternative`/`navigateParent`/`navigateChild`) is a pure helper consumed by `useKeyboardShortcuts` for arrow-key selection traversal — UI flow only, no store writes itself.
- `reparent.ts` (`applyReparent`) is a pure helper consumed by `VisualCanvas` when a drag crosses a new parent boundary — remaps `childIds` and relationship paths, then the caller still goes through `SyncManager.syncFromVis` — VIS flow only, no store writes itself.

```bash
CODEBASE STRUCTURE + FLOW CHOREOGRAPHY

Flow Legend:
  CD  = Code Change Flow    (user types in editor)
  VIS = Visual Change Flow  (user interacts with canvas)
  UI  = UI Interaction Flow (mode, zoom, theme, save/load, filters, undo)
  AI  = AI Generation Flow  (user generates with AI panel)

                                                         CD      VIS     UI      AI
------------------------------------------------------------------------------------
src/
├── main.tsx                                             +       +       +       +
├── App.tsx                                              +       +       +       +
├── errorTracking.ts                                     +       +       +       +
├── themes.ts                                            -       -       1       -
│
├── config/
│   └── appConfig.ts                                     +       +       +       +
│
├── presentation/
│   ├── ElementConfigs.ts                                +       +       +       +
│   ├── hooks/
│   │   ├── useUndoRedo.ts                               -       -       1       -
│   │   ├── useExecution.ts                              -       -       1       -
│   │   └── useKeyboardShortcuts.ts                      -       -       1       -
│   ├── utils/
│   │   └── groupUtils.ts                                2.3     -       -       6.3
│   └── components/
│       ├── AIPanel.tsx                                  -       -       -       1
│       ├── ApiKeySetup.tsx                              -       -       -       +
│       ├── AppSettingsPanel.tsx                         -       -       1       -
│       ├── CanvasControls.tsx                           -       -       1       -
│       ├── CodeEditor.tsx                               1       4       -       8
│       ├── DangerIconBtn.tsx                            -       -       1       -
│       ├── DiagramLayerRenderer.ts                      4.1     1       3.1     8.1
│       ├── GroupsPanel.tsx                              -       -       1       -
│       ├── HelpModal.tsx                                -       -       1       -
│       ├── IconsPanel.tsx                               -       -       1       -
│       ├── PropertiesPanel.tsx                          -       -       1       -
│       ├── SelectedPanel.tsx                            -       -       1       -
│       ├── TemplatePanel.tsx                            -       -       1       -
│       ├── ToolBar.tsx                                  -       -       1       -
│       ├── VisualCanvas.tsx                             4       1       3       8
│       ├── visualConfig.ts                              +       +       +       +
│       └── rendering/
│           ├── elementSizing.ts                         +       +       +       +
│           ├── types.ts                                 +       +       +       +
│           ├── elements/
│           │   ├── BaseElementRenderer.ts               +       +       +       +
│           │   ├── classDiagramUtils.ts                 +       +       +       +
│           │   ├── ElementEventHandler.ts               +       +       +       +
│           │   ├── lucideIconMap.ts                     +       +       +       +
│           │   ├── PolygonElementRenderer.ts            +       +       +       +
│           │   ├── SimpleRectElementRenderer.ts         +       +       +       +
│           │   └── SvgPathElementRenderer.ts            +       +       +       +
│           └── relationships/
│               ├── RelationshipRenderer.ts              +       +       +       +
│               └── arrowUtils.ts                        +       +       +       +
│
├── application/
│   ├── AIOrchestrator.ts                                -       -       -       2
│   ├── ExecutionEngine.ts                               -       -       1       -
│   ├── ForceSimulationService.ts                        2.6     2.3     1.1     6.6
│   ├── navigate.ts                                      -       -       1.1     -
│   ├── reparent.ts                                      -       1.1     -       -
│   ├── SyncManager.ts                                   2       2       2       6
│   ├── TabSyncManager.ts                                +       +       +       +
│   └── store/
│       ├── diagramSlice.ts                              3       3       1.1     7
│       ├── diffSlice.ts                                 -       -       1.1     -
│       ├── executionSlice.ts                            -       -       1.1     -
│       ├── filterSlice.ts                               -       -       1.1     -
│       ├── historySlice.ts                              +       +       1.1     +
│       ├── hooks.ts                                     +       +       +       +
│       ├── persistence.ts                               +       +       +       +
│       ├── store.ts                                     2;3     2;3     1       6;7
│       └── uiSlice.ts                                   -       -       1.1     -
│
├── infrastructure/
│   ├── CollectionRepository.ts                          -       -       +       -
│   ├── CollectionZip.ts                                 -       -       +       -
│   ├── ExportSvg.ts                                     -       -       +       -
│   ├── ai/
│   │   ├── AIService.ts                                 -       -       -       +
│   │   └── apiKeyStorage.ts                             -       -       +       +
│   │   ├── GeminiService.ts                             -       -       -       4
│   │   ├── PromptBuilder.ts                             -       -       -       3
│   │   ├── ResponseValidator.ts                         -       -       -       5
│   ├── parser/
│   │   ├── Lexer.ts                                     2.1     -       -       5.1;6.1
│   │   ├── Parser.ts                                    2.2     -       -       5.2;6.2
│   │   └── Token.ts                                     +       -       -       +
│   └── codegen/
│       └── CodeGenerator.ts                             -       2.4     -       -
│
├── domain/
│   ├── layout/
│   │   ├── BaseLayout.ts                                +       +       +       +
│   │   ├── CircularLayout.ts                            +       +       +       +
│   │   ├── ExecuteLayout.ts                             +       +       +       +
│   │   ├── ForceDirectedLayout.ts                       +       +       +       +
│   │   ├── HierarchicalLayout.ts                        +       +       +       +
│   │   ├── LayoutAlgorithm.ts                           +       +       +       +
│   │   ├── LayoutRegistry.ts                            +       +       +       +
│   │   ├── LayoutUtils.ts                               +       +       +       +
│   │   ├── ManualLayout.ts                              +       +       +       +
│   │   ├── PipelineLayout.ts                            +       +       +       +
│   │   ├── RadialLayout.ts                              +       +       +       +
│   │   ├── TimelineLayout.ts                            +       +       +       +
│   │   └── TopologicalLayout.ts                         +       +       +       +
│   ├── models/
│   │   ├── DiagramModel.ts                              +       +       +       +
│   │   ├── DiagramTemplate.ts                           -       -       +       -
│   │   ├── Element.ts                                   +       +       +       +
│   │   ├── Relationship.ts                              +       +       +       +
│   │   ├── Selector.ts                                  +       +       +       +
│   │   ├── TemplateCollection.ts                        -       -       +       -
│   │   └── ViewState.ts                                 +       +       +       +
│   ├── selector/
│   │   ├── SelectorEvaluator.ts                         -       -       2.1     -
│   │   ├── SelectorPresets.ts                           +       +       +       +
│   │   ├── GroupEvaluator.ts                            +       +       +       +
│   │   └── GroupExprParser.ts                           -       -       -       -
│   ├── sync/
│   │   ├── FilterResolver.ts                            -       -       2       -
│   │   ├── ModelDiffer.ts                               2.4     2.1     -       6.4
│   │   └── ViewStateMerger.ts                           2.5     2.2     2.1     6.5
│   └── validation/
│       └── ValidationRules.ts                           +       +       -       +
│
├── shared/
│   ├── utils.ts                                         +       +       +       +
│   ├── stageRegistry.ts                                 +       +       +       +
│   └── tabSessionId.ts                                  +       +       +       +
│
└── embed/
    ├── EmbedApp.tsx                                     +       +       +       +
    ├── embedMain.tsx                                    +       +       +       +
    ├── embedParams.ts                                   +       +       +       +
    ├── embedStore.ts                                    +       +       +       +
    └── useEmbedMessages.ts                              +       +       +       +
```
