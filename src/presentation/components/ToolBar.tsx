import { useRef, useState, useEffect, useMemo } from "react";
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
  Presentation,
  Circle,
  Network,
  ArrowRightLeft,
  Workflow,
  Target,
  Spline,
  Square,
  Hexagon,
  Table2,
  AlignJustify,
  Minimize2,
  SlidersHorizontal,
  ListFilter,
  Atom,
  Move,
  Layers,
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
  Slider,
  Label,
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
  toggleOpaqueElementBg,
  setActiveSession,
  type RenderStyle,
  type RelLineStyle,
} from "../../application/store/uiSlice";
import {
  setModel,
  setViewState,
  setCode,
  setViewMode,
} from "../../application/store/diagramSlice";
import {
  toSelectorId,
  FOLD_SELECTOR_ID,
  type Session,
  type Selector,
  type Group,
} from "../../domain/models/Selector";
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
  syncSelectorsFromCode,
  syncGroupsFromCode,
} from "../../application/store/filterSlice";
import {
  computeExecutionStep,
  applyDeltaToModel,
  buildCleanedModel,
} from "../../application/ExecutionEngine";
import { CodeGenerator } from "../../infrastructure/codegen/CodeGenerator";
import { Lexer } from "../../infrastructure/parser/Lexer";
import { Parser } from "../../infrastructure/parser/Parser";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import type { Element } from "../../domain/models/Element";
import type { ViewState } from "../../domain/models/ViewState";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { store, syncManager } from "../../application/store/store";
import { forceConfig } from "../../application/ForceSimulationService";

function ForceSettings() {
  const [rep, setRep] = useState(forceConfig.repulsion);
  const [dist, setDist] = useState(forceConfig.linkDistance);
  const [grav, setGrav] = useState(forceConfig.gravity);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-fg-muted mb-1.5 block">
          Repulsion — {rep.toFixed(1)}
        </Label>
        <Slider
          min={0.1}
          max={5}
          step={0.1}
          value={[rep]}
          onValueChange={([v]) => {
            forceConfig.repulsion = v;
            setRep(v);
          }}
        />
      </div>
      <div>
        <Label className="text-xs text-fg-muted mb-1.5 block">
          Link distance — {dist}px
        </Label>
        <Slider
          min={20}
          max={300}
          step={5}
          value={[dist]}
          onValueChange={([v]) => {
            forceConfig.linkDistance = v;
            setDist(v);
          }}
        />
      </div>
      <div>
        <Label className="text-xs text-fg-muted mb-1.5 block">
          Gravity — {grav.toFixed(3)}
        </Label>
        <Slider
          min={0}
          max={0.02}
          step={0.001}
          value={[grav]}
          onValueChange={([v]) => {
            forceConfig.gravity = v;
            setGrav(v);
          }}
        />
      </div>
    </div>
  );
}

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
    label: "Flow",
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
    opaqueElementBg,
    activeSessionId,
  } = useAppSelector((s) => s.ui);
  const {
    selectors,
    groups,
    foldLevel,
    foldActive,
    manuallyFolded,
    manuallyUnfolded,
  } = useAppSelector((s) => s.filter);
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

  const sessions = useMemo(() => model.sessions ?? [], [model.sessions]);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  useEffect(() => {
    if (sessions.length === 0) return;
    if (activeSession) return;
    dispatch(setActiveSession(sessions[0].id));
  }, [sessions, activeSession, dispatch]);

  const activePresetCount = [
    ...selectors.filter((s) => s.id !== FOLD_SELECTOR_ID),
    ...groups,
  ].filter(
    (s) => (activeSession?.groupModes?.[s.id] ?? "off") !== "off",
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
      const cleanedModel = buildCleanedModel(
        currentModel,
        execState.instances,
        execState.removedTemplates,
      );
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

  useKeyboardShortcuts({
    onSave: handleSaveDiagram,
    onOpen: () => fileInputRef.current?.click(),
  });

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
        let sessions: Session[] = [
          { id: "default", label: "Default", groupModes: {} },
        ];
        let newModelSelectors: Selector[] = [];
        let newModelGroups: Group[] = [];
        if (parsedCode !== null) {
          try {
            const parsed = new Parser(new Lexer(parsedCode).tokenize()).parse();
            sessions = parsed.sessions ?? sessions;
            newModelSelectors = parsed.selectors ?? [];
            newModelGroups = parsed.groups ?? [];
          } catch {
            /* keep fallback session */
          }
        }
        const prevModelSelectorIds = (
          store.getState().diagram.model.selectors ?? []
        ).map((s) => s.id);
        const prevModelGroupIds = (
          store.getState().diagram.model.groups ?? []
        ).map((g) => g.id);
        if (root)
          dispatch(
            setModel({ elements, relationships, root, sessions } as Parameters<
              typeof setModel
            >[0]),
          );
        if (parsedViewState)
          dispatch(
            setViewState(parsedViewState as Parameters<typeof setViewState>[0]),
          );
        if (parsedCode !== null) dispatch(setCode(parsedCode));
        dispatch(
          syncSelectorsFromCode({
            modelSelectors: newModelSelectors,
            prevModelSelectorIds,
          }),
        );
        dispatch(
          syncGroupsFromCode({
            modelGroups: newModelGroups,
            prevModelGroupIds,
          }),
        );
        dispatch(setActiveSession(sessions[0].id));
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
    const fileName = e.target.files?.[0]?.name ?? "diff";
    readFile(e, (text) => {
      try {
        const tokens = new Lexer(text).tokenize();
        const newModel = new Parser(tokens).parse();
        const { model: oldModel } = store.getState().diagram;
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

        const baseName = fileName.replace(/\.[^.]+$/, "");
        const newSelLabel = `${baseName}_new`;
        const delSelLabel = `${baseName}_del`;
        const newSelId = toSelectorId(newSelLabel);
        const delSelId = toSelectorId(delSelLabel);

        const addedSet = new Set(addedIds);
        const removedSet = new Set(removedIds);
        const updatedElements = { ...mergedModel.elements };
        for (const [id, el] of Object.entries(updatedElements)) {
          const filteredFlags = (el.flags ?? []).filter((f) => {
            const fId = toSelectorId(f);
            return fId !== newSelId && fId !== delSelId;
          });
          if (addedSet.has(id)) filteredFlags.push(newSelLabel);
          if (removedSet.has(id)) filteredFlags.push(delSelLabel);
          updatedElements[id] = {
            ...el,
            flags: filteredFlags.length > 0 ? filteredFlags : undefined,
          };
        }

        const codeGroups = (mergedModel.groups ?? []).filter(
          (g) => g.id !== newSelId && g.id !== delSelId,
        );
        const diffGroups: Group[] = [];
        if (addedIds.length > 0) {
          diffGroups.push({
            id: newSelId,
            regex: "",
            color: AppConfig.canvas.DIFF_ADDED_COLOR,
          });
        }
        if (removedIds.length > 0) {
          diffGroups.push({
            id: delSelId,
            regex: "",
            color: AppConfig.canvas.DIFF_REMOVED_COLOR,
          });
        }

        const finalModel = {
          ...mergedModel,
          elements: updatedElements,
          groups: [...diffGroups, ...codeGroups],
        };
        const code = new CodeGenerator(finalModel).generate();
        syncManager.syncFromCode(code, true);
      } catch (err) {
        console.error("[ToolBar] handleUpdateCodeFile error:", err);
      }
    });
    e.target.value = "";
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
            <Button variant="secondary">File</Button>
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
            <DropdownMenuItem onSelect={handleUpdateCode}>
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
            {
              value: "presentation",
              label: "Presentation",
              icon: <Presentation size={14} />,
            },
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
                {
                  value: "object",
                  label: "Object",
                  icon: (
                    <span className="font-mono text-xs leading-none">
                      {"{}"}
                    </span>
                  ),
                },
                {
                  value: "collection",
                  label: "Collection",
                  icon: (
                    <span className="font-mono text-xs leading-none">
                      {"[]"}
                    </span>
                  ),
                },
                {
                  value: "state",
                  label: "State",
                  icon: (
                    <span className="font-mono text-xs leading-none">
                      {"||"}
                    </span>
                  ),
                },
                {
                  value: "function",
                  label: "Function",
                  icon: (
                    <span className="font-mono text-xs leading-none">
                      {"()"}
                    </span>
                  ),
                },
                {
                  value: "flow",
                  label: "Flow",
                  icon: (
                    <span className="font-mono text-xs leading-none">
                      {">>"}
                    </span>
                  ),
                },
                {
                  value: "choice",
                  label: "Choice",
                  icon: (
                    <span className="font-mono text-xs leading-none">
                      {"<>"}
                    </span>
                  ),
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
            {
              value: "radial",
              label: "Radial",
              icon: <Target size={14} />,
            },
            {
              value: "force",
              label: "Force",
              icon: <Atom size={14} />,
            },
            {
              value: "manual",
              label: "Manual",
              icon: <Move size={14} />,
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

        <Button
          title="Opaque element background"
          variant={opaqueElementBg ? "secondary" : "ghost"}
          size="sm"
          className="w-9 h-9 p-0 rounded-full shrink-0"
          onClick={() => dispatch(toggleOpaqueElementBg())}
        >
          <Layers size={15} />
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

        <Select
          value={activeSession?.id ?? sessions[0]?.id ?? ""}
          onValueChange={(v: string) => dispatch(setActiveSession(v))}
          options={sessions.map((s) => ({ value: s.id, label: s.label }))}
        />

        <div className="relative">
          <Button
            title="Groups"
            variant={activePresetCount > 0 ? "primary" : "ghost"}
            size="sm"
            className="w-9 h-9 p-0 rounded-full shrink-0"
            onClick={() => setSelectorModalOpen(true)}
          >
            <ListFilter size={15} />
          </Button>
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
          renderAppSettings={() => <ForceSettings />}
          label="Open settings"
          buttonClassName="w-9 h-9 p-0 rounded-full btn-icon"
        />
      </div>

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
