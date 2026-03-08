import { useEffect, useRef, useState, useCallback } from "react";
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
  SlidersHorizontal,
  EyeOff,
  Eye,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { toggleTheme } from "../../application/store/themeSlice";
import {
  setInteractionMode,
  setActiveElementType,
  setActiveRelationshipType,
  sendZoomCommand,
} from "../../application/store/uiSlice";
import {
  setModel,
  setViewState,
  setCode,
} from "../../application/store/diagramSlice";
import {
  setFilterMode,
  setFilterActive,
} from "../../application/store/filterSlice";
import { ELEMENT_SVGS } from "../ElementConfigs";
import { FilterModal } from "./FilterModal";
import type { RelationshipType } from "../../infrastructure/parser/Token";
import type { FilterMode } from "../../domain/models/FilterRule";

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
  const displaySize = 22;
  const scaledStroke = (vbMax / displaySize) * 1.5;

  return (
    <svg
      width={displaySize}
      height={displaySize}
      viewBox={`0 0 ${config.viewBoxWidth} ${config.viewBoxHeight}`}
      fill="none"
    >
      <path
        d={config.data}
        stroke="currentColor"
        strokeWidth={scaledStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-fg-ternary/50 mx-1 shrink-0" />;
}

function Pill({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-accent/50 bg-accent/6">
      <span className="text-[9px] font-bold text-accent/70 tracking-widest uppercase mr-1 select-none">
        {label}
      </span>
      {children}
    </div>
  );
}

function Btn({
  children,
  active,
  title,
  danger,
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

export function ToolBar() {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector((s) => s.theme.isDark);
  const { interactionMode, activeElementType, activeRelationshipType } =
    useAppSelector((s) => s.ui);
  const model = useAppSelector((s) => s.diagram.model);
  const viewState = useAppSelector((s) => s.diagram.viewState);
  const code = useAppSelector((s) => s.diagram.code);
  const { mode: filterMode, isActive: filterIsActive } = useAppSelector(
    (s) => s.filter,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const is = (m: string) => interactionMode === m;

  const handleSaveDiagram = () => {
    const blob = new Blob(
      [JSON.stringify({ model, viewState, code }, null, 2)],
      { type: "application/json" },
    );
    trigger(blob, `diagram_${today()}.json`);
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

  const handleSaveCode = () => {
    trigger(new Blob([code], { type: "text/plain" }), `diagram_${today()}.dg`);
  };

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

  const reapplyFilter = useCallback(() => {
    import("../../application/store/store").then(({ syncManager }) =>
      syncManager.reapplyFilter(),
    );
  }, []);

  const handleFilterMode = (mode: FilterMode) => {
    const toggling = filterIsActive && filterMode === mode;
    dispatch(setFilterMode(mode));
    dispatch(setFilterActive(!toggling));
    reapplyFilter();
  };

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

      {filterModalOpen && (
        <FilterModal onClose={() => setFilterModalOpen(false)} />
      )}

      <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap border-b-2 border-fg-ternary/60">
        {/* Create */}
        <Pill label="Create">
          {ELEMENT_TYPES.map(({ type }) => (
            <Btn
              key={type}
              title={`New ${type}`}
              active={is("create") && activeElementType === type}
              onClick={() => dispatch(setActiveElementType(type))}
            >
              <ElementIcon type={type} />
            </Btn>
          ))}
        </Pill>

        <Divider />

        {/* Interaction mode */}
        <Pill label="Mode">
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
        </Pill>

        <Divider />

        {/* Relationship types */}
        <Pill label="Rel">
          {REL_TYPES.map(({ type, label, glyph }) => (
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
          ))}
        </Pill>

        <Divider />

        {/* Filter */}
        <Pill label="Filter">
          <Btn
            title="Edit filter rules"
            active={filterModalOpen}
            onClick={() => setFilterModalOpen((v) => !v)}
          >
            <SlidersHorizontal size={15} />
          </Btn>
          <Btn
            title="Hide filtered elements"
            active={filterIsActive && filterMode === "hide"}
            onClick={() => handleFilterMode("hide")}
          >
            <EyeOff size={15} />
          </Btn>
          <Btn
            title="Dim filtered elements"
            active={filterIsActive && filterMode === "dim"}
            onClick={() => handleFilterMode("dim")}
          >
            <Eye size={15} />
          </Btn>
        </Pill>

        <div className="flex-1" />

        {/* Diagram file */}
        <Pill label="Project">
          <Btn title="Save diagram (.json)" onClick={handleSaveDiagram}>
            <Download size={15} />
          </Btn>
          <Btn title="Load diagram (.json)" onClick={handleLoadDiagram}>
            <Upload size={15} />
          </Btn>
          <Btn title="New diagram" onClick={handleNew}>
            <FilePlus size={15} />
          </Btn>
        </Pill>

        <Divider />

        {/* Code file */}
        <Pill label="Code">
          <Btn title="Save code (.dg)" onClick={handleSaveCode}>
            <FileCode size={15} />
          </Btn>
          <Btn title="Load code (.dg)" onClick={handleLoadCode}>
            <FileInput size={15} />
          </Btn>
        </Pill>

        <Divider />

        {/* View */}
        <Pill label="View">
          <Btn title="Zoom in" onClick={() => dispatch(sendZoomCommand("in"))}>
            <ZoomIn size={15} />
          </Btn>
          <Btn
            title="Zoom out"
            onClick={() => dispatch(sendZoomCommand("out"))}
          >
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
        </Pill>
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
