import { Modal } from "@levkobe/c7one";

const ELEMENTS = [
  { syntax: "name{}", kind: "Object", note: "class, entity, component" },
  { syntax: "name[]", kind: "Collection", note: "array, list, group" },
  { syntax: "|name|", kind: "State", note: "state machine node" },
  { syntax: "name()", kind: "Function", note: "operation, process" },
  { syntax: ">name>", kind: "Flow", note: "pipeline stage, I/O" },
  { syntax: "<name>", kind: "Choice", note: "branch, decision" },
];

const RELATIONSHIPS = [
  { syntax: "a --> b", label: "Association" },
  { syntax: "a ..> b", label: "Dependency" },
  { syntax: "a --|> b", label: "Inheritance" },
  { syntax: "..|>", label: "Realization" },
  { syntax: "a o-- b", label: "Aggregation" },
  { syntax: "a *-- b", label: "Composition" },
  { syntax: "a --label--> b", label: "Labeled" },
];

const SHORTCUTS = [
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Shift+Z / Ctrl+Y", action: "Redo" },
  { keys: "Ctrl+Scroll", action: "Zoom in/out" },
  { keys: "Shift+Scroll", action: "Pan" },
  { keys: "Right-click element", action: "Fold / accept diff" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest uppercase text-fg-muted mb-2">{title}</div>
      {children}
    </div>
  );
}

function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[11px] bg-bg-elevated px-1.5 py-0.5 rounded border border-border/40 text-accent">
      {children}
    </code>
  );
}

export function HelpModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Content className="w-[520px] max-h-[80vh] overflow-y-auto p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-fg-primary mb-0.5">Quick Reference</h2>
          <p className="text-xs text-fg-muted">
            Edit code on the left, draw on the canvas — both stay in sync.{" "}
            <a
              href="https://levkobe.github.io/diagravinci/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              Open app ↗
            </a>
          </p>
        </div>

        <Section title="Element types — DSL syntax">
          <div className="grid grid-cols-1 gap-1">
            {ELEMENTS.map(({ syntax, kind, note }) => (
              <div key={kind} className="flex items-center gap-3 text-xs">
                <CodeChip>{syntax}</CodeChip>
                <span className="font-medium text-fg-primary w-20 shrink-0">{kind}</span>
                <span className="text-fg-muted">{note}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-fg-muted">
            Nesting: <CodeChip>{"system{ frontend{} backend{} }"}</CodeChip>
          </div>
        </Section>

        <Section title="Relationship types">
          <div className="grid grid-cols-2 gap-1">
            {RELATIONSHIPS.map(({ syntax, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <CodeChip>{syntax}</CodeChip>
                <span className="text-fg-muted">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Toolbar groups (hover to expand)">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-fg-muted">
            <div><span className="text-fg-primary font-medium">Create</span> — choose element type, then click canvas</div>
            <div><span className="text-fg-primary font-medium">Mode</span> — select / connect / delete / pan</div>
            <div><span className="text-fg-primary font-medium">Rel</span> — relationship type for Connect mode</div>
            <div><span className="text-fg-primary font-medium">Layout</span> — switch between Circular / Hierarchical / Timeline / Pipeline</div>
            <div><span className="text-fg-primary font-medium">Select</span> — filter presets and fold depth</div>
            <div><span className="text-fg-primary font-medium">Run</span> — execute mode with token simulation</div>
            <div><span className="text-fg-primary font-medium">Project</span> — save / load full diagram (.jsonl)</div>
            <div><span className="text-fg-primary font-medium">Code</span> — save / load diagram code (.dg), diff & merge</div>
          </div>
        </Section>

        <Section title="Keyboard shortcuts">
          <div className="grid grid-cols-1 gap-1">
            {SHORTCUTS.map(({ keys, action }) => (
              <div key={keys} className="flex items-center gap-3 text-xs">
                <CodeChip>{keys}</CodeChip>
                <span className="text-fg-muted">{action}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Tips">
          <ul className="text-xs text-fg-muted space-y-1 list-disc list-inside">
            <li>Drag on empty canvas to box-select multiple elements</li>
            <li>Ctrl+Scroll to zoom; Shift+Scroll to pan</li>
            <li>Same name in two places = same element (cross-reference)</li>
            <li>AI panel: describe a system in plain English to generate a diagram</li>
            <li>Templates panel: start from built-in architectural patterns</li>
            <li>State persists automatically in your browser — no need to save manually</li>
          </ul>
        </Section>
      </Modal.Content>
    </Modal>
  );
}
