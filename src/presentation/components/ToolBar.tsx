import { useEffect, useRef, useState, createContext, useContext } from "react";
import {
  MousePointer2,
  Pencil,
  Link2,
  Sun,
  Moon,
  Download,
  Upload,
  FilePlus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Unlink,
  FileCode,
  FileInput,
  ListFilter,
  Minimize2,
  AlignJustify,
  SlidersHorizontal,
  Circle,
  TreePine,
  ArrowRightLeft,
  Workflow,
  Spline,
  Square,
  Hexagon,
  Menu,
  Lock,
  Scissors,
  Undo2,
  Redo2,
  GitCompare,
  CheckCheck,
  Play,
  Pause,
  RotateCcw,
  StepForward,
} from "lucide-react";
import {
  Button,
  SettingsModalButton,
  useC7One,
  detectIsDark,
  useWindowContext,
} from "@levkobe/c7one";
import {
  parchmentTheme,
  diagraVinciDark,
  lightStateTokens,
  darkStateTokens,
} from "../../themes";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import {
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
  sendZoomCommand,
  setRenderStyle,
  type RenderStyle,
} from "../../application/store/uiSlice";
import {
  setModel,
  setViewState,
  setCode,
  setViewMode,
  pruneElements,
} from "../../application/store/diagramSlice";
import {
  setFoldLevel,
  toggleFoldActive,
  cyclePreset,
} from "../../application/store/filterSlice";
import {
  setDiff,
  clearAllAdded,
  clearAllRemoved,
  clearDiff,
} from "../../application/store/diffSlice";
import {
  startExecution,
  pauseExecution,
  resetExecution,
  tickAdvance,
  setMaterialize,
} from "../../application/store/executionSlice";
import { computeExecutionStep, applyDeltaToModel, buildCleanedModel } from "../../application/ExecutionEngine";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import { ViewStateMerger } from "../../domain/sync/ViewStateMerger";

import { ELEMENT_SVGS } from "../ElementConfigs";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import type { Element } from "../../domain/models/Element";
import type { ViewState } from "../../domain/models/ViewState";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { store, syncManager } from "../../application/store/store";

const ELEMENT_TYPES = [
  { type: "object" },
  { type: "collection" },
  { type: "state" },
  { type: "function" },
  { type: "flow" },
  { type: "choice" },
] as const;

const REL_TYPES: { type: RelationshipType; label: string; glyph: string }[] = [
  { type: "-->", label: "Association", glyph: "→" },
  { type: "..>", label: "Dependency", glyph: "⤏" },
  { type: "--|>", label: "Inheritance", glyph: "▷" },
  { type: "..|>", label: "Realization", glyph: "▷⋯" },
  { type: "o--", label: "Aggregation", glyph: "◇" },
  { type: "*--", label: "Composition", glyph: "◆" },
];

function ElementIcon({ type }: { type: string }) {
  const config = ELEMENT_SVGS[type as keyof typeof ELEMENT_SVGS];
  if (!config)
    return <span className="text-xs font-bold">{type[0].toUpperCase()}</span>;
  const vbMax = Math.max(config.viewBoxWidth, config.viewBoxHeight);
  return (
    <svg
      width={22}
      height={22}
      viewBox={`0 0 ${config.viewBoxWidth} ${config.viewBoxHeight}`}
      fill="none"
    >
      <path
        d={config.data}
        stroke="currentColor"
        strokeWidth={(vbMax / 22) * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-border/50 mx-1 shrink-0" />;
}

const PillOpenContext = createContext(false);

function Pill({
  label,
  children,
  activeSlot,
  compact,
}: {
  label: string;
  children: React.ReactNode;
  activeSlot?: React.ReactNode;
  compact?: boolean;
}) {
  const forceOpen = useContext(PillOpenContext);
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  // Compact mode: no label, no animation, buttons always visible.
  if (compact) {
    return (
      <div className="flex items-center px-2 py-1 rounded-full border border-accent/50 bg-accent/6 gap-0.5 shrink-0">
        {children}
      </div>
    );
  }

  const slide =
    "grid overflow-hidden transition-[grid-template-columns] duration-500 ease-out";

  return (
    <div
      className="flex items-center px-2.5 py-1.5 rounded-full border border-accent/50 bg-accent/6 justify-center min-w-28 shrink-0"
      onMouseEnter={() => !forceOpen && setOpen(true)}
      onMouseLeave={() => !forceOpen && setOpen(false)}
    >
      {/* Label + active indicators — slide away as buttons appear */}
      <div
        className={`${slide} ${isOpen ? "grid-cols-[0fr]" : "grid-cols-[1fr]"}`}
      >
        <div className="overflow-hidden min-w-0 flex items-center gap-1">
          <button
            className="overflow-hidden min-w-0 mr-2 text-[9px] font-bold text-accent/70 text-center tracking-widest uppercase select-none whitespace-nowrap focus:outline-none"
            onClick={() => !forceOpen && setOpen((v) => !v)}
          >
            {label}
          </button>
          {activeSlot && (
            <div className="flex items-center gap-0.5 shrink-0">
              {activeSlot}
            </div>
          )}
        </div>
      </div>

      {/* Buttons — slide in as label disappears */}
      <div
        className={`${slide} ${isOpen ? "grid-cols-[1fr]" : "grid-cols-[0fr]"}`}
      >
        <div className="overflow-hidden min-w-0 flex items-center gap-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function ActiveIndicator({
  children,
  danger,
  title,
  style,
}: {
  children: React.ReactNode;
  danger?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={[
        "btn-icon active pointer-events-none select-none shrink-0",
        danger ? "danger" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      title={title}
    >
      {children}
    </span>
  );
}

function Btn({
  children,
  active,
  danger,
  disabled,
  title,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      title={title}
      onClick={onClick}
      disabled={disabled}
      variant={danger ? "destructive" : active ? "secondary" : "ghost"}
      size="sm"
      className="w-9 h-9 p-0 rounded-full shrink-0"
    >
      {children}
    </Button>
  );
}

const FOLD_MODE_ICONS = {
  expanded: <AlignJustify size={15} />,
  collapsed: <Minimize2 size={15} />,
  edited: <SlidersHorizontal size={15} />,
} as const;

const FOLD_MODE_TITLES = {
  expanded: "All expanded — click to fold at depth N",
  collapsed: "Folded at depth N — click to expand all",
  edited: "Custom fold overrides — click to reset",
} as const;

type FoldMode = "expanded" | "collapsed" | "edited";

export function ToolBar() {
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const { colors, setColors, injectTokens } = useC7One();
  const isDark = detectIsDark(colors["--color-bg-base"]);
  const { tree, moveDivider } = useWindowContext();

  const toolbarInnerRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(9999);
  const [toolbarHeight, setToolbarHeight] = useState(48);
  // Track the last computed target height (px). The loop guard is: if the
  // target hasn't changed, moveDivider already set it — skip. If zoom or
  // content changes, the target changes and we fire exactly once more.
  const lastNeededHRef = useRef<number>(0);

  useEffect(() => {
    if (!toolbarInnerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setToolbarWidth(width);
      setToolbarHeight(height);
    });
    ro.observe(toolbarInnerRef.current);
    return () => ro.disconnect();
  }, []);

  // Snap toolbar window height to its content. Runs whenever the toolbar's
  // measured size changes (mount, zoom, window resize, content change).
  // Loop safety: moveDivider triggers a resize → toolbarHeight changes → this
  // effect re-runs → computes the same neededWindowH → early return.
  useEffect(() => {
    // In panel / wrap mode the toolbar should fill available space — skip.
    if (toolbarWidth / Math.max(toolbarHeight, 1) <= 2) return;

    const contentArea = toolbarInnerRef.current;
    if (!contentArea) return;

    const contentAreaH = contentArea.getBoundingClientRect().height;
    if (contentAreaH < 4) return; // not yet painted

    // firstElementChild.offsetHeight = intrinsic content height, unclipped.
    const firstChild = contentArea.firstElementChild as HTMLElement | null;
    if (!firstChild) return;
    const intrinsicH = firstChild.offsetHeight;
    if (intrinsicH < 4) return;

    // Walk up to find the ancestor that includes the window title bar.
    let windowEl: HTMLElement | null = contentArea.parentElement;
    while (windowEl) {
      if (windowEl.getBoundingClientRect().height > contentAreaH + 4) break;
      windowEl = windowEl.parentElement;
    }
    if (!windowEl) return;

    const titleBarH = windowEl.getBoundingClientRect().height - contentAreaH;
    const neededWindowH = Math.round(intrinsicH + titleBarH + 4);

    // Same target as last call → moveDivider already positioned correctly.
    if (Math.abs(neededWindowH - lastNeededHRef.current) < 2) return;
    lastNeededHRef.current = neededWindowH;

    const pct = (neededWindowH / window.innerHeight) * 100;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findGroup = (node: any, wId: string): any => {
      if (node.type !== "group") return null;
      for (const child of node.children) {
        if (child.type === "leaf" && child.windowId === wId) return node;
        const found = findGroup(child, wId);
        if (found) return found;
      }
      return null;
    };

    const parentGroup = findGroup(tree, "toolbar");
    if (parentGroup) moveDivider(parentGroup.id, 0, pct);
  }, [toolbarWidth, toolbarHeight, tree, moveDivider]);

  // Layout modes based on aspect ratio:
  //   aspect > 2  → wide bar: horizontal scrollable pill row
  //   aspect ≤ 2  → panel: compact pills wrap to fill space
  // Within wide-bar mode:
  //   < 380px  → hamburger menu only
  //   380–720px → compact pills, scrollable row
  //   > 720px  → full animated pills, scrollable (no flex-wrap to prevent oscillation)
  const isWideBar = toolbarWidth / Math.max(toolbarHeight, 1) > 2;
  const isMobile = isWideBar && toolbarWidth < 380;
  const isCompact = isWideBar && !isMobile && toolbarWidth < 720;

  const { model, viewState, code } = useAppSelector((s) => s.diagram);
  const viewMode = viewState.viewMode;
  const {
    interactionMode,
    activeElementType,
    activeRelationshipType,
    renderStyle,
  } = useAppSelector((s) => s.ui);
  const { presets, foldLevel, foldActive, manuallyFolded, manuallyUnfolded } =
    useAppSelector((s) => s.filter);
  const diffState = useAppSelector((s) => s.diff);
  const execState = useAppSelector((s) => s.execution);
  const isExecuteMode = viewMode === "execute";

  const prevViewModeRef = useRef<ViewState["viewMode"]>(viewMode);

  const cleanupAndReset = () => {
    if (!execState.materialize && execState.instances.length > 0) {
      const { model: currentModel } = store.getState().diagram;
      const cleanedModel = buildCleanedModel(currentModel, execState.instances);
      syncManager.syncFromVis(cleanedModel);
    }
    dispatch(resetExecution());
  };

  const handleToggleExecute = () => {
    if (isExecuteMode) {
      cleanupAndReset();
      dispatch(setViewMode(prevViewModeRef.current));
    } else {
      prevViewModeRef.current = viewMode;
      dispatch(setViewMode("execute"));
    }
  };

  const handleExecuteStep = () => {
    const state = store.getState();
    const { instances, tickCount, nextInstanceId, executionColor } =
      state.execution;
    const { model: currentModel, viewState: currentViewState } = state.diagram;
    const result = computeExecutionStep(
      currentModel,
      currentViewState,
      instances,
      tickCount,
      nextInstanceId,
      executionColor,
    );
    const newModel = applyDeltaToModel(currentModel, result.delta);
    syncManager.syncFromVis(newModel);
    dispatch(
      tickAdvance({
        nextInstances: result.nextInstances,
        nextInstanceId: result.nextInstanceId,
      }),
    );
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const updateCodeInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    if (isDark) {
      setColors(parchmentTheme);
      injectTokens(lightStateTokens);
    } else {
      setColors(diagraVinciDark);
      injectTokens(darkStateTokens);
    }
  };

  const is = (m: string) => interactionMode === m;

  const foldMode: FoldMode = !foldActive
    ? "expanded"
    : manuallyFolded.length > 0 || manuallyUnfolded.length > 0
      ? "edited"
      : "collapsed";

  const activePresetCount = presets.filter((p) => p.isActive).length;

  const handleSaveDiagram = () => {
    const lines: string[] = [
      JSON.stringify({ type: "meta", version: 1 }),
      JSON.stringify({ type: "code", value: code }),
      JSON.stringify({ type: "root", data: model.root }),
      ...Object.entries(model.elements).map(([id, el]) =>
        JSON.stringify({ type: "element", id, data: el }),
      ),
      ...Object.entries(model.relationships).map(([id, rel]) =>
        JSON.stringify({ type: "relationship", id, data: rel }),
      ),
      JSON.stringify({ type: "viewState", data: viewState }),
    ];
    trigger(
      new Blob([lines.join("\n")], { type: "application/x-ndjson" }),
      `diagram_${today()}.jsonl`,
    );
  };
  const handleLoadDiagram = () => fileInputRef.current?.click();
  const handleDiagramFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    readFile(e, (text) => {
      try {
        const elements: Record<string, Element> = {};
        const relationships: Record<string, unknown> = {};
        let root: unknown = null;
        let parsedCode: string | null = null;
        let parsedViewState: unknown = null;
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const obj = JSON.parse(trimmed);
          if (obj.type === "element") elements[obj.id] = obj.data;
          else if (obj.type === "relationship")
            relationships[obj.id] = obj.data;
          else if (obj.type === "root") root = obj.data;
          else if (obj.type === "code") parsedCode = obj.value;
          else if (obj.type === "viewState") parsedViewState = obj.data;
        }
        if (root)
          dispatch(
            setModel({ elements, relationships, root } as Parameters<
              typeof setModel
            >[0]),
          );
        if (parsedViewState)
          dispatch(
            setViewState(parsedViewState as Parameters<typeof setViewState>[0]),
          );
        if (parsedCode !== null) dispatch(setCode(parsedCode));
      } catch {
        console.error("Invalid diagram file");
      }
    });
    e.target.value = "";
  };
  const handleSaveCode = () =>
    trigger(new Blob([code], { type: "text/plain" }), `diagram_${today()}.dg`);
  const handleLoadCode = () => codeInputRef.current?.click();
  const handleCodeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    readFile(e, (text) => {
      import("../../application/store/store").then(({ syncManager }) =>
        syncManager.syncFromCode(text),
      );
    });
    e.target.value = "";
  };
  const handleNew = () => {
    if (!confirm("Start a new diagram? Unsaved work will be lost.")) return;
    import("../../application/store/store").then(({ syncManager }) =>
      syncManager.syncFromCode(""),
    );
  };

  const handleUpdateCode = () => updateCodeInputRef.current?.click();

  const handleUpdateCodeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    readFile(e, (text) => {
      try {
        const tokens = new Lexer(text).tokenize();
        const newModel = new Parser(tokens).parse();
        const {
          model: oldModel,
          viewState: currentViewState,
          canvasSize,
        } = store.getState().diagram;

        const oldIds = new Set(Object.keys(oldModel.elements));
        const newIds = new Set(Object.keys(newModel.elements));

        const addedIds = [...newIds].filter((id) => !oldIds.has(id));
        const removedIds = [...oldIds].filter(
          (id) => !newIds.has(id) && id !== oldModel.root.id,
        );

        const removedElements: Record<string, Element> = {};
        for (const id of removedIds) {
          if (oldModel.elements[id])
            removedElements[id] = oldModel.elements[id];
        }

        const mergedModel = {
          ...newModel,
          elements: { ...newModel.elements, ...removedElements },
          root: {
            ...newModel.root,
            childIds: [
              ...newModel.root.childIds,
              ...removedIds.filter(
                (id) => !newModel.root.childIds.includes(id),
              ),
            ],
          },
        };

        const mergedViewState = ViewStateMerger.merge(
          currentViewState,
          mergedModel,
          canvasSize,
        );

        const positions = { ...mergedViewState.positions };
        for (const id of removedIds) {
          if (currentViewState.positions[id]) {
            positions[id] = currentViewState.positions[id];
          }
        }

        dispatch(setModel(mergedModel));
        dispatch(setViewState({ ...mergedViewState, positions }));
        dispatch(setCode(text));
        dispatch(setDiff({ addedIds, removedIds }));
      } catch (err) {
        console.error("[ToolBar] handleUpdateCodeFile error:", err);
      }
    });
    e.target.value = "";
  };

  const handleAcceptAllAdded = () => dispatch(clearAllAdded());
  const handleAcceptAllRemoved = () => {
    dispatch(pruneElements(diffState.removedIds));
    dispatch(clearAllRemoved());
  };

  const handleExportSubset = () => {
    const hiddenSet = new Set(viewState.hiddenPaths);
    const visibleIds = new Set(
      Object.keys(viewState.positions)
        .filter((p) => !hiddenSet.has(p))
        .map((p) => p.split(".").at(-1)!),
    );
    const filteredElements: typeof model.elements = {};
    for (const id of Object.keys(model.elements)) {
      if (visibleIds.has(id))
        filteredElements[id] = {
          ...model.elements[id],
          childIds: model.elements[id].childIds.filter((c) =>
            visibleIds.has(c),
          ),
        };
    }
    const filteredRoot = {
      ...model.root,
      childIds: model.root.childIds.filter((c) => visibleIds.has(c)),
    };
    const filteredRelationships: typeof model.relationships = {};
    for (const [id, r] of Object.entries(model.relationships)) {
      if (visibleIds.has(r.source) && visibleIds.has(r.target))
        filteredRelationships[id] = r;
    }
    const subsetModel = {
      ...model,
      root: filteredRoot,
      elements: filteredElements,
      relationships: filteredRelationships,
    };
    const subsetCode = new CodeGenerator(subsetModel).generate();
    trigger(
      new Blob([subsetCode], { type: "text/plain" }),
      `subset_${today()}.dg`,
    );
  };

  const createBtns = ELEMENT_TYPES.map(({ type }) => (
    <Btn
      key={type}
      title={`New ${type}`}
      active={is("create") && activeElementType === type}
      onClick={() => dispatch(setActiveElementType(type))}
    >
      <ElementIcon type={type} />
    </Btn>
  ));

  const modeBtns = (
    <>
      <Btn
        title="Select / Move"
        active={is("select")}
        onClick={() => dispatch(setInteractionMode("select"))}
      >
        <MousePointer2 size={15} />
      </Btn>
      <Btn
        title="Create element"
        active={is("create")}
        onClick={() => dispatch(setInteractionMode("create"))}
      >
        <Pencil size={15} />
      </Btn>
      <Btn
        title="Connect elements"
        active={is("connect")}
        onClick={() => dispatch(setInteractionMode("connect"))}
      >
        <Link2 size={15} />
      </Btn>
      <Btn
        title="Delete element"
        active={is("delete")}
        danger={is("delete")}
        onClick={() => dispatch(setInteractionMode("delete"))}
      >
        <Trash2 size={15} />
      </Btn>
      <Btn
        title="Disconnect elements"
        active={is("disconnect")}
        danger={is("disconnect")}
        onClick={() => dispatch(setInteractionMode("disconnect"))}
      >
        <Unlink size={15} />
      </Btn>
      <Btn
        title="Read-only / pan only"
        active={is("readonly")}
        onClick={() =>
          dispatch(setInteractionMode(is("readonly") ? "select" : "readonly"))
        }
      >
        <Lock size={15} />
      </Btn>
    </>
  );

  const relBtns = REL_TYPES.map(({ type, label, glyph }) => (
    <Btn
      key={type}
      title={label}
      active={activeRelationshipType === type}
      onClick={() => dispatch(setActiveRelationshipType(type))}
    >
      <span className="text-[12px] font-bold font-mono leading-none select-none">
        {glyph}
      </span>
    </Btn>
  ));

  const visiblePresets = presets.filter((p) => p.id !== "__fold__");

  const selectBtns = (
    <>
      <div className="relative">
        <Btn title="Selector presets" active={activePresetCount > 0}>
          <ListFilter size={15} />
        </Btn>
        {activePresetCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 rounded-full bg-accent text-bg-primary text-[9px] font-bold flex items-center justify-center pointer-events-none px-0.5">
            {activePresetCount}
          </span>
        )}
      </div>
      {visiblePresets.map((preset) => (
        <button
          key={preset.id}
          title={`${preset.label} — ${preset.isActive ? preset.mode : "off"} (click to cycle)`}
          onClick={() => dispatch(cyclePreset(preset.id))}
          className="btn-icon relative overflow-hidden"
          style={
            preset.isActive
              ? { color: preset.color, borderColor: preset.color }
              : {}
          }
        >
          <span
            className="absolute inset-0 rounded-[inherit] opacity-15 transition-opacity"
            style={preset.isActive ? { background: preset.color } : {}}
          />
          <span className="relative text-[9px] font-bold leading-none select-none truncate max-w-[5ch]">
            {preset.label.slice(0, 4)}
          </span>
        </button>
      ))}
      <input
        type="number"
        min={1}
        max={99}
        value={foldLevel}
        onChange={(e) => dispatch(setFoldLevel(Number(e.target.value)))}
        title="Fold depth threshold"
        className="w-9 text-center text-[11px] font-mono bg-bg-elevated/60 border border-border/30 rounded px-1 py-0.5 focus:outline-none focus:border-accent/60 text-fg-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Btn
        title={FOLD_MODE_TITLES[foldMode]}
        active={foldMode !== "expanded"}
        danger={foldMode === "edited"}
        onClick={() => dispatch(toggleFoldActive())}
      >
        {FOLD_MODE_ICONS[foldMode]}
      </Btn>
    </>
  );

  const projectBtns = (
    <>
      <Btn title="Save diagram (.json)" onClick={handleSaveDiagram}>
        <Download size={15} />
      </Btn>
      <Btn title="Load diagram (.json)" onClick={handleLoadDiagram}>
        <Upload size={15} />
      </Btn>
      <Btn title="Export visible subset (.dg)" onClick={handleExportSubset}>
        <Scissors size={15} />
      </Btn>
      <Btn title="New diagram" onClick={handleNew}>
        <FilePlus size={15} />
      </Btn>
    </>
  );

  const codeBtns = (
    <>
      <Btn title="Save code (.dg)" onClick={handleSaveCode}>
        <FileCode size={15} />
      </Btn>
      <Btn title="Load code (.dg)" onClick={handleLoadCode}>
        <FileInput size={15} />
      </Btn>
      <Btn
        title="Update code — diff & merge with current diagram"
        active={diffState.active}
        onClick={handleUpdateCode}
      >
        <GitCompare size={15} />
      </Btn>
    </>
  );

  const layoutBtns = (
    <>
      <Btn
        title="Circular layout"
        active={viewMode === "circular" || viewMode === "basic"}
        onClick={() => {
          dispatch(setViewMode("circular"));
          import("../../application/store/store").then(({ syncManager }) =>
            syncManager.reLayout(),
          );
        }}
      >
        <Circle size={15} />
      </Btn>
      <Btn
        title="Hierarchical layout"
        active={viewMode === "hierarchical"}
        onClick={() => {
          dispatch(setViewMode("hierarchical"));
          import("../../application/store/store").then(({ syncManager }) =>
            syncManager.reLayout(),
          );
        }}
      >
        <TreePine size={15} />
      </Btn>
      <Btn
        title="Timeline layout"
        active={viewMode === "timeline"}
        onClick={() => {
          dispatch(setViewMode("timeline"));
          import("../../application/store/store").then(({ syncManager }) =>
            syncManager.reLayout(),
          );
        }}
      >
        <ArrowRightLeft size={15} />
      </Btn>
      <Btn
        title="Pipeline layout"
        active={viewMode === "pipeline"}
        onClick={() => {
          dispatch(setViewMode("pipeline"));
          import("../../application/store/store").then(({ syncManager }) =>
            syncManager.reLayout(),
          );
        }}
      >
        <Workflow size={15} />
      </Btn>
    </>
  );

  const execBtns = (
    <>
      <Btn
        title="Toggle execute mode"
        active={isExecuteMode}
        onClick={handleToggleExecute}
      >
        <Play size={15} />
      </Btn>
      {isExecuteMode && (
        <>
          <Btn
            title="Run"
            active={execState.status === "running"}
            onClick={() => dispatch(startExecution())}
            disabled={execState.status === "running"}
          >
            <Play size={15} />
          </Btn>
          <Btn
            title="Pause"
            active={execState.status === "paused"}
            onClick={() => dispatch(pauseExecution())}
            disabled={execState.status !== "running"}
          >
            <Pause size={15} />
          </Btn>
          <Btn
            title="Step (one tick)"
            onClick={handleExecuteStep}
            disabled={execState.status === "running"}
          >
            <StepForward size={15} />
          </Btn>
          <Btn
            title="Reset"
            onClick={cleanupAndReset}
            disabled={execState.status === "stopped" && execState.tickCount === 0}
          >
            <RotateCcw size={15} />
          </Btn>
          <Btn
            title={
              execState.materialize
                ? "Keep generated elements: on"
                : "Keep generated elements: off"
            }
            active={execState.materialize}
            onClick={() => dispatch(setMaterialize(!execState.materialize))}
          >
            <CheckCheck size={15} />
          </Btn>
        </>
      )}
    </>
  );

  const styleBtns = (
    [
      { value: "svg", title: "SVG paths", icon: <Spline size={15} /> },
      { value: "rect", title: "Rectangles", icon: <Square size={15} /> },
      { value: "polygon", title: "Polygons", icon: <Hexagon size={15} /> },
    ] as { value: RenderStyle; title: string; icon: React.ReactNode }[]
  ).map(({ value, title, icon }) => (
    <Btn
      key={value}
      title={title}
      active={renderStyle === value}
      onClick={() => dispatch(setRenderStyle(value))}
    >
      {icon}
    </Btn>
  ));

  const viewBtns = (
    <>
      <Btn title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
        <Undo2 size={15} />
      </Btn>
      <Btn title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
        <Redo2 size={15} />
      </Btn>
      <Btn title="Zoom in" onClick={() => dispatch(sendZoomCommand("in"))}>
        <ZoomIn size={15} />
      </Btn>
      <Btn title="Zoom out" onClick={() => dispatch(sendZoomCommand("out"))}>
        <ZoomOut size={15} />
      </Btn>
      <Btn
        title="Reset view"
        onClick={() => dispatch(sendZoomCommand("reset"))}
      >
        <Maximize2 size={15} />
      </Btn>
      <Btn title="Toggle theme" onClick={toggleTheme}>
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </Btn>
      <SettingsModalButton
        expose={[
          "mode",
          "colors",
          "--radius",
          "--border-width",
          "--transition-speed",
          "--shadow-intensity",
        ]}
        label="Open settings"
        buttonClassName="w-9 h-9 p-0 rounded-full btn-icon"
      />
    </>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jsonl"
        className="hidden"
        onChange={handleDiagramFile}
      />
      <input
        ref={codeInputRef}
        type="file"
        accept=".dg,.txt"
        className="hidden"
        onChange={handleCodeFile}
      />
      <input
        ref={updateCodeInputRef}
        type="file"
        accept=".dg,.txt"
        className="hidden"
        onChange={handleUpdateCodeFile}
      />

      <div
        ref={toolbarInnerRef}
        className="w-full h-full flex flex-col overflow-hidden"
      >
        {diffState.active && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-bg-elevated/60 border-b border-border/20 text-xs shrink-0">
            <span className="font-semibold text-fg-muted">Diff view</span>
            <span style={{ color: "#4caf50" }} className="font-medium">
              +{diffState.addedIds.length} added
            </span>
            <span style={{ color: "#ef5350" }} className="font-medium">
              -{diffState.removedIds.length} removed
            </span>
            <span className="text-fg-disabled/60">
              Right-click an element to accept individually
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={handleAcceptAllAdded}
                disabled={diffState.addedIds.length === 0}
                className="flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium transition-colors disabled:opacity-30"
                style={{ borderColor: "#4caf50", color: "#4caf50" }}
                title="Accept all added (remove green highlights)"
              >
                <CheckCheck size={11} />
                Accept added
              </button>
              <button
                onClick={handleAcceptAllRemoved}
                disabled={diffState.removedIds.length === 0}
                className="flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium transition-colors disabled:opacity-30"
                style={{ borderColor: "#ef5350", color: "#ef5350" }}
                title="Accept all removed (delete from diagram)"
              >
                <CheckCheck size={11} />
                Accept removed
              </button>
              <button
                onClick={() => dispatch(clearDiff())}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/40 text-fg-muted text-xs font-medium hover:bg-border/10 transition-colors"
                title="Clear diff — exit diff view without accepting"
              >
                Clear diff
              </button>
            </div>
          </div>
        )}
        {!isWideBar ? (
          /* ── Panel / wrap layout — compact pills wrap to fill space ── */
          <div className="flex flex-wrap gap-2 p-3 justify-center content-start overflow-y-auto flex-1">
            <Pill label="Create" compact>
              {createBtns}
            </Pill>
            <Pill label="Mode" compact>
              {modeBtns}
            </Pill>
            <Pill label="Rel" compact>
              {relBtns}
            </Pill>
            <Pill label="Select" compact>
              {selectBtns}
            </Pill>
            <Pill label="Project" compact>
              {projectBtns}
            </Pill>
            <Pill label="Code" compact>
              {codeBtns}
            </Pill>
            <Pill label="Layout" compact>
              {layoutBtns}
            </Pill>
            <Pill label="Run" compact>
              {execBtns}
            </Pill>
            <Pill label="Style" compact>
              {styleBtns}
            </Pill>
            <Pill label="View" compact>
              {viewBtns}
            </Pill>
          </div>
        ) : isMobile ? (
          /* ── Hamburger trigger ────────────────────────────────────────── */
          <div className="flex items-center px-4 py-2">
            <Btn
              title="Toggle menu"
              active={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <Menu size={15} />
            </Btn>
          </div>
        ) : (
          /* ── Full / compact pill row — overflow scrolls, never wraps ─── */
          <div
            className={`w-full flex items-center gap-2 px-4 py-2.5 overflow-x-auto flex-nowrap ${isCompact ? "" : "justify-around"}`}
          >
            <Pill
              label="Create"
              compact={isCompact}
              activeSlot={
                !isCompact && is("create") ? (
                  <ActiveIndicator title={`New ${activeElementType}`}>
                    <ElementIcon type={activeElementType} />
                  </ActiveIndicator>
                ) : undefined
              }
            >
              {createBtns}
            </Pill>
            <Divider />
            <Pill
              label="Mode"
              compact={isCompact}
              activeSlot={
                !isCompact ? (
                  <ActiveIndicator
                    title={interactionMode}
                    danger={is("delete") || is("disconnect")}
                  >
                    {
                      {
                        select: <MousePointer2 size={15} />,
                        create: <Pencil size={15} />,
                        connect: <Link2 size={15} />,
                        delete: <Trash2 size={15} />,
                        disconnect: <Unlink size={15} />,
                        readonly: <Lock size={15} />,
                      }[interactionMode]
                    }
                  </ActiveIndicator>
                ) : undefined
              }
            >
              {modeBtns}
            </Pill>
            <Divider />
            <Pill
              label="Rel"
              compact={isCompact}
              activeSlot={
                !isCompact && is("connect") ? (
                  <ActiveIndicator
                    title={
                      REL_TYPES.find((r) => r.type === activeRelationshipType)
                        ?.label
                    }
                  >
                    <span className="text-[12px] font-bold font-mono leading-none select-none">
                      {
                        REL_TYPES.find((r) => r.type === activeRelationshipType)
                          ?.glyph
                      }
                    </span>
                  </ActiveIndicator>
                ) : undefined
              }
            >
              {relBtns}
            </Pill>
            <Divider />
            <Pill
              label="Select"
              compact={isCompact}
              activeSlot={
                !isCompact &&
                visiblePresets.filter((p) => p.isActive).length > 0 ? (
                  <>
                    {visiblePresets
                      .filter((p) => p.isActive)
                      .map((preset) => (
                        <span
                          key={preset.id}
                          className="btn-icon active pointer-events-none select-none bg-bg-base shrink-0 relative overflow-hidden"
                          style={{
                            color: preset.color,
                            borderColor: preset.color,
                          }}
                          title={`${preset.label} — ${preset.mode}`}
                        >
                          <span
                            className="absolute inset-0 rounded-[inherit] opacity-15"
                            style={{ background: preset.color }}
                          />
                          <span className="relative text-[9px] font-bold leading-none select-none truncate max-w-[5ch]">
                            {preset.label.slice(0, 6)}
                          </span>
                        </span>
                      ))}
                  </>
                ) : undefined
              }
            >
              {selectBtns}
            </Pill>
            <Divider />
            <Pill label="Project" compact={isCompact}>
              {projectBtns}
            </Pill>
            <Divider />
            <Pill label="Code" compact={isCompact}>
              {codeBtns}
            </Pill>
            <Divider />
            <Pill
              label="Layout"
              compact={isCompact}
              activeSlot={
                !isCompact ? (
                  <ActiveIndicator title={viewMode}>
                    {
                      {
                        circular: <Circle size={15} />,
                        basic: <Circle size={15} />,
                        hierarchical: <TreePine size={15} />,
                        timeline: <ArrowRightLeft size={15} />,
                        pipeline: <Workflow size={15} />,
                        execute: <Play size={15} />,
                      }[viewMode]
                    }
                  </ActiveIndicator>
                ) : undefined
              }
            >
              {layoutBtns}
            </Pill>
            <Divider />
            <Pill
              label="Run"
              compact={isCompact}
              activeSlot={
                !isCompact && isExecuteMode ? (
                  <ActiveIndicator title={execState.status}>
                    {execState.status === "running" ? (
                      <Play size={15} />
                    ) : (
                      <Pause size={15} />
                    )}
                  </ActiveIndicator>
                ) : undefined
              }
            >
              {execBtns}
            </Pill>
            <Divider />
            <Pill
              label="Style"
              compact={isCompact}
              activeSlot={
                !isCompact ? (
                  <ActiveIndicator title={renderStyle}>
                    {
                      {
                        svg: <Spline size={15} />,
                        rect: <Square size={15} />,
                        polygon: <Hexagon size={15} />,
                      }[renderStyle]
                    }
                  </ActiveIndicator>
                ) : undefined
              }
            >
              {styleBtns}
            </Pill>
            <Divider />
            <Pill label="View" compact={isCompact}>
              {viewBtns}
            </Pill>
          </div>
        )}

        {/* Hamburger expanded panel */}
        {isMobile && mobileOpen && (
          <PillOpenContext.Provider value={true}>
            <div className="flex flex-wrap justify-around gap-2 px-4 py-3">
              <Pill label="Create">{createBtns}</Pill>
              <Pill label="Mode">{modeBtns}</Pill>
              <Pill label="Rel">{relBtns}</Pill>
              <Pill label="Select">{selectBtns}</Pill>
              <Pill label="Project">{projectBtns}</Pill>
              <Pill label="Code">{codeBtns}</Pill>
              <Pill label="Layout">{layoutBtns}</Pill>
              <Pill label="Run">{execBtns}</Pill>
              <Pill label="Style">{styleBtns}</Pill>
              <Pill label="View">{viewBtns}</Pill>
            </div>
          </PillOpenContext.Provider>
        )}
      </div>
    </>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function readFile(
  e: React.ChangeEvent<HTMLInputElement>,
  onText: (text: string) => void,
) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    if (typeof ev.target?.result === "string") onText(ev.target.result);
  };
  reader.readAsText(file);
}
