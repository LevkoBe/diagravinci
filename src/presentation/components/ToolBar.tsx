import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sun,
  Moon,
  Download,
  Upload,
  FilePlus,
  FileCode,
  FileInput,
  Scissors,
  Undo2,
  Redo2,
  GitCompare,
  CheckCheck,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  HelpCircle,
  ImageDown,
  MousePointer2,
  Pencil,
  Link2,
  Trash2,
  Unlink,
  Lock,
  Box,
  Layers,
  CircleDot,
  Braces,
  GitBranch,
  GitFork,
  Circle,
  Network,
  ArrowRightLeft,
  Workflow,
  Spline,
  Square,
  Hexagon,
  Table2,
  AlignJustify,
  Minimize2,
  SlidersHorizontal,
  ListFilter,
} from "lucide-react";
import { AppConfig } from "../../config/appConfig";
import { stageRegistry } from "../../shared/stageRegistry";
import {
  Button,
  Select,
  SettingsModalButton,
  useC7One,
  detectIsDark,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Modal,
} from "@levkobe/c7one";
import { HelpModal } from "./HelpModal";
import { SelectorsPanel } from "./SelectorModal";
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
  setRenderStyle,
  setRelLineStyle,
  toggleClassDiagramMode,
  type RenderStyle,
  type RelLineStyle,
} from "../../application/store/uiSlice";
import {
  setModel,
  setViewState,
  setCode,
  setViewMode,
  pruneElements,
} from "../../application/store/diagramSlice";
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
import {
  setFoldLevel,
  toggleFoldActive,
} from "../../application/store/filterSlice";
import {
  computeExecutionStep,
  applyDeltaToModel,
  buildCleanedModel,
} from "../../application/ExecutionEngine";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import { ViewStateMerger } from "../../domain/sync/ViewStateMerger";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import type { Element } from "../../domain/models/Element";
import type { ViewState } from "../../domain/models/ViewState";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { store, syncManager } from "../../application/store/store";

const REL_TYPES: {
  type: RelationshipType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "-->",
    label: "Association",
    icon: <span className="font-mono text-xs leading-none">{"-->"}</span>,
  },
  {
    type: "..>",
    label: "Dependency",
    icon: <span className="font-mono text-xs leading-none">{"··>"}</span>,
  },
  {
    type: "--|>",
    label: "Inheritance",
    icon: <span className="font-mono text-xs leading-none">--▷</span>,
  },
  {
    type: "..|>",
    label: "Realization",
    icon: <span className="font-mono text-xs leading-none">··▷</span>,
  },
  {
    type: "o--",
    label: "Aggregation",
    icon: <span className="font-mono text-xs leading-none">◇--</span>,
  },
  {
    type: "*--",
    label: "Composition",
    icon: <span className="font-mono text-xs leading-none">◆--</span>,
  },
];

function Divider() {
  return <div className="w-px h-5 bg-border/50 mx-0.5 shrink-0" />;
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

export type ToolBarLayout = "h-scroll" | "wrap" | "compact";

export function ToolBar({ layout = "h-scroll" }: { layout?: ToolBarLayout }) {
  const dispatch = useAppDispatch();
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const { colors, setColors, injectTokens } = useC7One();
  const isDark = detectIsDark(colors["--color-bg-base"]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const updateCodeInputRef = useRef<HTMLInputElement>(null);

  const { model, viewState, code } = useAppSelector((s) => s.diagram);
  const viewMode = viewState.viewMode;
  const {
    interactionMode,
    activeElementType,
    activeRelationshipType,
    renderStyle,
    relLineStyle,
    classDiagramMode,
  } = useAppSelector((s) => s.ui);
  const { selectors, foldLevel, foldActive, manuallyFolded, manuallyUnfolded } =
    useAppSelector((s) => s.filter);
  const diffState = useAppSelector((s) => s.diff);
  const execState = useAppSelector((s) => s.execution);
  const isExecuteMode = viewMode === "execute";
  const prevViewModeRef = useRef<ViewState["viewMode"]>(viewMode);

  const showLabels = layout !== "compact";
  const containerClass =
    layout === "h-scroll"
      ? "flex items-center gap-2 h-full overflow-x-auto"
      : layout === "wrap"
        ? "flex flex-wrap items-center gap-x-4 gap-y-3 py-2 m-3 justify-center w-[90%]"
        : "flex flex-wrap items-center gap-1 py-0.5 w-full";

  const is = (m: string) => interactionMode === m;

  const layoutValue =
    viewMode === "basic" || viewMode === "execute" || viewMode === "circular"
      ? "circular"
      : viewMode;

  const activePresetCount = selectors.filter(
    (s) => s.mode !== "off" && s.id !== "__fold__" && s.id !== "__selection__",
  ).length;

  const foldMode = !foldActive
    ? "expanded"
    : manuallyFolded.length > 0 || manuallyUnfolded.length > 0
      ? "edited"
      : "collapsed";

  const foldIcon =
    foldMode === "edited" ? (
      <SlidersHorizontal size={15} />
    ) : foldMode === "collapsed" ? (
      <Minimize2 size={15} />
    ) : (
      <AlignJustify size={15} />
    );

  const toggleTheme = () => {
    if (isDark) {
      setColors(parchmentTheme);
      injectTokens(lightStateTokens);
    } else {
      setColors(diagraVinciDark);
      injectTokens(darkStateTokens);
    }
  };

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

  const handleExportPng = async () => {
    const dataUrl = await stageRegistry.exportPng();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `diagram_${today()}.png`;
    a.click();
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
          if (currentViewState.positions[id])
            positions[id] = currentViewState.positions[id];
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
    const foldedSet = new Set(viewState.foldedPaths);
    const isDescendantOfFolded = (path: string): boolean => {
      const parts = path.split(".");
      for (let i = 1; i < parts.length; i++) {
        if (foldedSet.has(parts.slice(0, i).join("."))) return true;
      }
      return false;
    };
    const visibleIds = new Set(
      Object.keys(viewState.positions)
        .filter((p) => !hiddenSet.has(p) && !isDescendantOfFolded(p))
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
    trigger(
      new Blob(
        [
          new CodeGenerator({
            ...model,
            root: filteredRoot,
            elements: filteredElements,
            relationships: filteredRelationships,
          }).generate(),
        ],
        { type: "text/plain" },
      ),
      `subset_${today()}.dg`,
    );
  };

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

      <div className={containerClass}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">File</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={handleNew}>
              <FilePlus size={14} /> New diagram
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Diagram</DropdownMenuLabel>
            <DropdownMenuItem onSelect={handleSaveDiagram}>
              <Download size={14} /> Save
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLoadDiagram}>
              <Upload size={14} /> Load
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuItem onSelect={handleExportPng}>
              <ImageDown size={14} /> Export PNG
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportSubset}>
              <Scissors size={14} /> Export visible subset
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Code</DropdownMenuLabel>
            <DropdownMenuItem onSelect={handleSaveCode}>
              <FileCode size={14} /> Save code (.dg)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLoadCode}>
              <FileInput size={14} /> Load code (.dg)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleUpdateCode}
              className={diffState.active ? "text-accent" : ""}
            >
              <GitCompare size={14} /> Update code (diff & merge)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {layout !== "compact" && <Divider />}

        {showLabels && (
          <span className="text-xs text-fg-muted shrink-0">Mode</span>
        )}
        <Select
          minimal
          value={interactionMode}
          onValueChange={(v) =>
            dispatch(setInteractionMode(v as typeof interactionMode))
          }
          options={[
            {
              value: "select",
              label: "Select",
              icon: <MousePointer2 size={14} />,
            },
            { value: "create", label: "Create", icon: <Pencil size={14} /> },
            { value: "connect", label: "Connect", icon: <Link2 size={14} /> },
            { value: "delete", label: "Delete", icon: <Trash2 size={14} /> },
            {
              value: "disconnect",
              label: "Disconnect",
              icon: <Unlink size={14} />,
            },
            { value: "readonly", label: "Read-only", icon: <Lock size={14} /> },
          ]}
        />

        {is("create") && (
          <>
            {showLabels && (
              <span className="text-xs text-fg-muted shrink-0">Type</span>
            )}
            <Select
              minimal
              value={activeElementType}
              onValueChange={(v) =>
                dispatch(setActiveElementType(v as typeof activeElementType))
              }
              options={[
                { value: "object", label: "Object", icon: <Box size={14} /> },
                {
                  value: "collection",
                  label: "Collection",
                  icon: <Layers size={14} />,
                },
                {
                  value: "state",
                  label: "State",
                  icon: <CircleDot size={14} />,
                },
                {
                  value: "function",
                  label: "Function",
                  icon: <Braces size={14} />,
                },
                { value: "flow", label: "Flow", icon: <GitBranch size={14} /> },
                {
                  value: "choice",
                  label: "Choice",
                  icon: <GitFork size={14} />,
                },
              ]}
            />
          </>
        )}

        {is("connect") && (
          <>
            {showLabels && (
              <span className="text-xs text-fg-muted shrink-0">Rel</span>
            )}
            <Select
              minimal
              value={activeRelationshipType}
              onValueChange={(v) =>
                dispatch(setActiveRelationshipType(v as RelationshipType))
              }
              options={REL_TYPES.map(({ type, label, icon }) => ({
                value: type,
                label,
                icon,
              }))}
            />
          </>
        )}

        {layout !== "compact" && <Divider />}

        {showLabels && (
          <span className="text-xs text-fg-muted shrink-0">Layout</span>
        )}
        <Select
          minimal
          value={layoutValue}
          disabled={isExecuteMode}
          onValueChange={(v) => {
            dispatch(setViewMode(v as ViewState["viewMode"]));
            syncManager.reLayout();
          }}
          options={[
            {
              value: "circular",
              label: "Circular",
              icon: <Circle size={14} />,
            },
            {
              value: "hierarchical",
              label: "Hierarchical",
              icon: <Network size={14} />,
            },
            {
              value: "timeline",
              label: "Timeline",
              icon: <ArrowRightLeft size={14} />,
            },
            {
              value: "pipeline",
              label: "Pipeline",
              icon: <Workflow size={14} />,
            },
          ]}
        />

        {showLabels && (
          <span className="text-xs text-fg-muted shrink-0">Style</span>
        )}
        <Select
          minimal
          value={renderStyle}
          onValueChange={(v) => dispatch(setRenderStyle(v as RenderStyle))}
          options={[
            { value: "svg", label: "SVG paths", icon: <Spline size={14} /> },
            { value: "rect", label: "Rectangles", icon: <Square size={14} /> },
            {
              value: "polygon",
              label: "Polygons",
              icon: <Hexagon size={14} />,
            },
          ]}
        />

        <span className="text-xs text-fg-muted shrink-0">Lines</span>
        <Select
          minimal
          value={relLineStyle}
          onValueChange={(v) => dispatch(setRelLineStyle(v as RelLineStyle))}
          options={[
            {
              value: "straight",
              label: "Straight",
              icon: (
                <span className="font-mono font-bold text-xs leading-none">
                  ─
                </span>
              ),
            },
            {
              value: "curved",
              label: "Curved",
              icon: (
                <span className="font-mono font-bold text-xs leading-none">
                  ⌒
                </span>
              ),
            },
            {
              value: "orthogonal",
              label: "Orthogonal",
              icon: (
                <span className="font-mono font-bold text-xs leading-none">
                  ⌐
                </span>
              ),
            },
          ]}
        />

        <Button
          title="Class diagram mode"
          variant={classDiagramMode ? "secondary" : "ghost"}
          size="sm"
          className="w-9 h-9 p-0 rounded-full shrink-0"
          onClick={() => dispatch(toggleClassDiagramMode())}
        >
          <Table2 size={15} />
        </Button>

        <input
          type="number"
          min={1}
          max={99}
          value={foldLevel}
          onChange={(e) => dispatch(setFoldLevel(Number(e.target.value)))}
          title="Fold depth threshold"
          className="w-9 text-center text-[11px] font-mono bg-bg-elevated/60 border border-border/30 rounded px-1 py-0.5 focus:outline-none focus:border-accent/60 text-fg-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Button
          title={`Fold: ${foldMode}`}
          variant={
            foldMode === "edited"
              ? "destructive"
              : foldMode !== "expanded"
                ? "secondary"
                : "ghost"
          }
          size="sm"
          className="w-9 h-9 p-0 rounded-full shrink-0"
          onClick={() => dispatch(toggleFoldActive())}
        >
          {foldIcon}
        </Button>

        <div className="relative">
          <Button
            title="Selectors"
            variant={activePresetCount > 0 ? "secondary" : "ghost"}
            size="sm"
            className="w-9 h-9 p-0 rounded-full shrink-0"
            onClick={() => setSelectorModalOpen(true)}
          >
            <ListFilter size={15} />
          </Button>
          {activePresetCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 rounded-full bg-accent text-bg-primary text-[9px] font-bold flex items-center justify-center pointer-events-none px-0.5">
              {activePresetCount}
            </span>
          )}
        </div>

        {layout !== "compact" && <Divider />}

        <Btn
          title={isExecuteMode ? "Exit execute mode" : "Enter execute mode"}
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
              disabled={execState.status === "running"}
              onClick={() => dispatch(startExecution())}
            >
              <Play size={15} />
            </Btn>
            <Btn
              title="Pause"
              active={execState.status === "paused"}
              disabled={execState.status !== "running"}
              onClick={() => dispatch(pauseExecution())}
            >
              <Pause size={15} />
            </Btn>
            <Btn
              title="Step (one tick)"
              disabled={execState.status === "running"}
              onClick={handleExecuteStep}
            >
              <StepForward size={15} />
            </Btn>
            <Btn
              title="Reset"
              disabled={
                execState.status === "stopped" && execState.tickCount === 0
              }
              onClick={cleanupAndReset}
            >
              <RotateCcw size={15} />
            </Btn>
            <Btn
              title={
                execState.materialize
                  ? "Keep generated: on"
                  : "Keep generated: off"
              }
              active={execState.materialize}
              onClick={() => dispatch(setMaterialize(!execState.materialize))}
            >
              <CheckCheck size={15} />
            </Btn>
          </>
        )}

        {layout !== "compact" && <Divider />}

        <Btn title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 size={15} />
        </Btn>
        <Btn title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 size={15} />
        </Btn>

        {layout !== "compact" && <Divider />}

        <Btn title="Toggle theme" onClick={toggleTheme}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </Btn>
        <Btn title="Help / quick reference" onClick={() => setHelpOpen(true)}>
          <HelpCircle size={15} />
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
      </div>

      {diffState.active &&
        createPortal(
          <div className="fixed top-14 inset-x-0 z-40 flex items-center gap-3 px-4 py-1.5 bg-bg-elevated border-b border-border/20 text-xs">
            <span className="font-semibold text-fg-muted">Diff view</span>
            <span
              style={{ color: AppConfig.canvas.DIFF_ADDED_COLOR }}
              className="font-medium"
            >
              +{diffState.addedIds.length} added
            </span>
            <span
              style={{ color: AppConfig.canvas.DIFF_REMOVED_COLOR }}
              className="font-medium"
            >
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
                style={{
                  borderColor: AppConfig.canvas.DIFF_ADDED_COLOR,
                  color: AppConfig.canvas.DIFF_ADDED_COLOR,
                }}
              >
                <CheckCheck size={11} /> Accept added
              </button>
              <button
                onClick={handleAcceptAllRemoved}
                disabled={diffState.removedIds.length === 0}
                className="flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium transition-colors disabled:opacity-30"
                style={{
                  borderColor: AppConfig.canvas.DIFF_REMOVED_COLOR,
                  color: AppConfig.canvas.DIFF_REMOVED_COLOR,
                }}
              >
                <CheckCheck size={11} /> Accept removed
              </button>
              <button
                onClick={() => dispatch(clearDiff())}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/40 text-fg-muted text-xs font-medium hover:bg-border/10 transition-colors"
              >
                Clear diff
              </button>
            </div>
          </div>,
          document.body,
        )}

      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />

      <Modal open={selectorModalOpen} onOpenChange={setSelectorModalOpen}>
        <Modal.Content maxWidth={555} minHeight={444}>
          <SelectorsPanel />
        </Modal.Content>
      </Modal>
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
