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
} from "../../application/store/diagramSlice";
import {
  openFilterModal,
  setFoldLevel,
  toggleFoldActive,
} from "../../application/store/filterSlice";
import { FilterModal } from "./FilterModal";
import { ELEMENT_SVGS } from "../ElementConfigs";
import type { RelationshipType } from "../../infrastructure/parser/Token";

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
}: {
  label: string;
  children: React.ReactNode;
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
      {/* Label — slides away as buttons appear */}
      <div
        className={`${slide} ${isOpen ? "grid-cols-[0fr]" : "grid-cols-[1fr]"}`}
      >
        <button
          className="overflow-hidden min-w-0 text-[9px] font-bold text-accent/70 tracking-widest uppercase select-none whitespace-nowrap focus:outline-none"
          onClick={() => !forceOpen && setOpen((v) => !v)}
        >
          {label}
        </button>
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

function Btn({
  children,
  active,
  danger,
  title,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

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

  const selectBtns = (
    <>
      <div className="relative">
        <Btn
          title="Filter presets"
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
      {isModalOpen && <FilterModal />}

      <div className="border-b-2 border-fg-ternary/60">
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
          <Pill label="Create">{createBtns}</Pill>
          <Divider />
          <Pill label="Mode">{modeBtns}</Pill>
          <Divider />
          <Pill label="Rel">{relBtns}</Pill>
          <Divider />
          <Pill label="Select">{selectBtns}</Pill>
          <Divider />
          <Pill label="Project">{projectBtns}</Pill>
          <Divider />
          <Pill label="Code">{codeBtns}</Pill>
          <Divider />
          <Pill label="Layout">{layoutBtns}</Pill>
          <Divider />
          <Pill label="Style">{styleBtns}</Pill>
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
