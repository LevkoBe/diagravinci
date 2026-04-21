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
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { toggleTheme } from "../../application/store/themeSlice";
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
  openFilterModal,
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
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import { ViewStateMerger } from "../../domain/sync/ViewStateMerger";
import { FilterModal } from "./FilterModal";
import { ELEMENT_SVGS } from "../ElementConfigs";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import type { Element } from "../../domain/models/Element";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { store } from "../../application/store/store";

const ELEMENT_TYPES = [
  { type: "object" },
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
  return <div className="w-px h-6 bg-fg-ternary/50 mx-1 shrink-0" />;
}

const PillOpenContext = createContext(false);

function Pill({
  label,
  children,
  activeSlot,
}: {
  label: string;
  children: React.ReactNode;
  activeSlot?: React.ReactNode;
}) {
  const forceOpen = useContext(PillOpenContext);
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  const slide =
    "grid overflow-hidden transition-[grid-template-columns] duration-500 ease-out";

  return (
    <div
      className={[
        "flex items-center px-2.5 py-1.5 rounded-full border border-accent/50 bg-accent/6 justify-center",
        forceOpen ? "justify-center" : "min-w-32",
      ].join(" ")}
      onMouseEnter={() => !forceOpen && setOpen(true)}
      onMouseLeave={() => !forceOpen && setOpen(false)}
    >
      {/* Label + active indicators — slide away as buttons appear */}
      <div
        className={`${slide} ${isOpen ? "grid-cols-[0fr]" : "grid-cols-[1fr]"}`}
      >
        <div className="overflow-hidden min-w-0 flex items-center gap-1">
          <button
            className="overflow-hidden min-w-0 mr-2 text-[9px] font-bold text-accent/70 tracking-widest uppercase select-none whitespace-nowrap focus:outline-none"
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
        <div className="overflow-hidden min-w-0 flex items-center gap-1 pl-1">
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
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={["btn-icon", active ? "active" : "", danger ? "danger" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
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

  const isDark = useAppSelector((s) => s.theme.isDark);
  const { model, viewState, code } = useAppSelector((s) => s.diagram);
  const viewMode = viewState.viewMode;
  const {
    interactionMode,
    activeElementType,
    activeRelationshipType,
    renderStyle,
  } = useAppSelector((s) => s.ui);
  const {
    presets,
    isModalOpen,
    foldLevel,
    foldActive,
    manuallyFolded,
    manuallyUnfolded,
  } = useAppSelector((s) => s.filter);
  const diffState = useAppSelector((s) => s.diff);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const updateCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const is = (m: string) => interactionMode === m;

  const foldMode: FoldMode = !foldActive
    ? "expanded"
    : manuallyFolded.length > 0 || manuallyUnfolded.length > 0
      ? "edited"
      : "collapsed";

  const activePresetCount = presets.filter((p) => p.isActive).length;

  const handleSaveDiagram = () => {
    trigger(
      new Blob([JSON.stringify({ model, viewState, code }, null, 2)], {
        type: "application/json",
      }),
      `diagram_${today()}.json`,
    );
  };
  const handleLoadDiagram = () => fileInputRef.current?.click();
  const handleDiagramFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    readFile(e, (text) => {
      try {
        const p = JSON.parse(text);
        if (p.model) dispatch(setModel(p.model));
        if (p.viewState) dispatch(setViewState(p.viewState));
        if (p.code) dispatch(setCode(p.code));
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

        // Preserve old positions for removed elements (root-level path = element id)
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
        <Btn
          title="Selector presets"
          active={isModalOpen || activePresetCount > 0}
          onClick={() => dispatch(openFilterModal())}
        >
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
        className="w-9 text-center text-[11px] font-mono bg-bg-secondary/60 border border-fg-ternary/30 rounded px-1 py-0.5 focus:outline-none focus:border-accent/60 text-fg-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
      <Btn title="Toggle theme" onClick={() => dispatch(toggleTheme())}>
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </Btn>
    </>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
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
      {isModalOpen && <FilterModal />}

      <div className="border-b-2 border-fg-ternary/60">
        {diffState.active && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-bg-secondary/60 border-b border-fg-ternary/20 text-xs">
            <span className="font-semibold text-fg-secondary">Diff view</span>
            <span style={{ color: "#4caf50" }} className="font-medium">
              +{diffState.addedIds.length} added
            </span>
            <span style={{ color: "#ef5350" }} className="font-medium">
              -{diffState.removedIds.length} removed
            </span>
            <span className="text-fg-ternary/60">
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
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-fg-ternary/40 text-fg-secondary text-xs font-medium hover:bg-fg-ternary/10 transition-colors"
                title="Clear diff — exit diff view without accepting"
              >
                Clear diff
              </button>
            </div>
          </div>
        )}
        {/* Mobile header — visible only on small screens */}
        <div className="flex sm:hidden items-center px-4 py-2">
          <Btn
            title="Toggle menu"
            active={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu size={15} />
          </Btn>
        </div>

        {/* Desktop toolbar — hidden on small screens */}
        <div className="hidden w-full sm:flex items-center justify-around gap-2 px-4 py-2.5 flex-wrap">
          <Pill
            label="Create"
            activeSlot={
              is("create") ? (
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
            activeSlot={
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
            }
          >
            {modeBtns}
          </Pill>
          <Divider />
          <Pill
            label="Rel"
            activeSlot={
              is("connect") ? (
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
            activeSlot={
              visiblePresets.filter((p) => p.isActive).length > 0 ? (
                <>
                  {visiblePresets
                    .filter((p) => p.isActive)
                    .map((preset) => (
                      <span
                        key={preset.id}
                        className="btn-icon active pointer-events-none select-none shrink-0 relative overflow-hidden"
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
                          {preset.label.slice(0, 4)}
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
          <Pill label="Project">{projectBtns}</Pill>
          <Divider />
          <Pill label="Code">{codeBtns}</Pill>
          <Divider />
          <Pill
            label="Layout"
            activeSlot={
              <ActiveIndicator title={viewMode}>
                {
                  {
                    circular: <Circle size={15} />,
                    basic: <Circle size={15} />,
                    hierarchical: <TreePine size={15} />,
                    timeline: <ArrowRightLeft size={15} />,
                    pipeline: <Workflow size={15} />,
                  }[viewMode]
                }
              </ActiveIndicator>
            }
          >
            {layoutBtns}
          </Pill>
          <Divider />
          <Pill
            label="Style"
            activeSlot={
              <ActiveIndicator title={renderStyle}>
                {
                  {
                    svg: <Spline size={15} />,
                    rect: <Square size={15} />,
                    polygon: <Hexagon size={15} />,
                  }[renderStyle]
                }
              </ActiveIndicator>
            }
          >
            {styleBtns}
          </Pill>
          <Divider />
          <Pill label="View">{viewBtns}</Pill>
        </div>

        {/* Mobile panel — all pills forced open, stacked in a wrap grid */}
        {mobileOpen && (
          <PillOpenContext.Provider value={true}>
            <div className="sm:hidden flex flex-wrap justify-around gap-2 px-4 py-3">
              <Pill label="Create">{createBtns}</Pill>
              <Pill label="Mode">{modeBtns}</Pill>
              <Pill label="Rel">{relBtns}</Pill>
              <Pill label="Select">{selectBtns}</Pill>
              <Pill label="Project">{projectBtns}</Pill>
              <Pill label="Code">{codeBtns}</Pill>
              <Pill label="Layout">{layoutBtns}</Pill>
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
