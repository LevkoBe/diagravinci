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

const SHORTCUTS: { keys: string; action: string; group?: string }[] = [
  { keys: "Ctrl+Z", action: "Undo", group: "History" },
  { keys: "Ctrl+Y / Ctrl+Shift+Z", action: "Redo", group: "History" },
  { keys: "Ctrl+S", action: "Save", group: "File" },
  { keys: "Ctrl+O", action: "Open", group: "File" },
  { keys: "1–6", action: "Switch mode", group: "Modes" },
  { keys: "Q–Y  (create)", action: "Element subtype", group: "Modes" },
  { keys: "Q–Y  (connect)", action: "Relationship subtype", group: "Modes" },
  { keys: "W / E", action: "Zoom in / out", group: "Canvas" },
  { keys: "R", action: "Reset view", group: "Canvas" },
  { keys: "Y", action: "Toggle class mode", group: "Canvas" },
  { keys: "Ctrl+Scroll", action: "Zoom", group: "Canvas" },
  { keys: "Shift+Scroll", action: "Pan", group: "Canvas" },
  { keys: "Right-click", action: "Fold / accept diff", group: "Canvas" },
  { keys: "F5", action: "Enter / exit execute", group: "Execute" },
  { keys: "Space", action: "Run / Pause", group: "Execute" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest uppercase text-fg-muted mb-2">
        {title}
      </div>
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

export function HelpModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Content maxWidth={666}>
        <div className="p-6">
          <div>
            <h2 className="text-base font-semibold text-fg-primary mb-0.5">
              Quick Reference
            </h2>
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
                  <span className="font-medium text-fg-primary w-20 shrink-0">
                    {kind}
                  </span>
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
              <div>
                <span className="text-fg-primary font-medium">Create</span> —
                choose element type, then click canvas
              </div>
              <div>
                <span className="text-fg-primary font-medium">Mode</span> —
                select / connect / delete / pan
              </div>
              <div>
                <span className="text-fg-primary font-medium">Rel</span> —
                relationship type for Connect mode
              </div>
              <div>
                <span className="text-fg-primary font-medium">Layout</span> —
                switch between Circular / Hierarchical / Timeline / Pipeline
              </div>
              <div>
                <span className="text-fg-primary font-medium">Select</span> —
                filter presets and fold depth
              </div>
              <div>
                <span className="text-fg-primary font-medium">Run</span> —
                execute mode with token simulation
              </div>
              <div>
                <span className="text-fg-primary font-medium">Project</span> —
                save / load full diagram (.jsonl)
              </div>
              <div>
                <span className="text-fg-primary font-medium">Code</span> — save
                / load diagram code (.dg), diff & merge
              </div>
            </div>
          </Section>

          <Section title="Keyboard shortcuts">
            <div className="grid grid-cols-1 gap-y-0.5">
              {SHORTCUTS.reduce<{ group: string; items: typeof SHORTCUTS }[]>((acc, s) => {
                const g = s.group ?? "";
                const last = acc[acc.length - 1];
                if (last && last.group === g) { last.items.push(s); }
                else { acc.push({ group: g, items: [s] }); }
                return acc;
              }, []).map(({ group, items }) => (
                <div key={group} className="mb-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-fg-muted/60 mb-1">{group}</div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {items.map(({ keys, action }) => (
                      <div key={keys} className="flex items-start gap-3 text-xs">
                        <CodeChip>{keys}</CodeChip>
                        <span className="text-fg-muted">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Tips">
            <ul className="text-xs text-fg-muted space-y-1 list-disc list-inside">
              <li>Drag on empty canvas to box-select multiple elements</li>
              <li>Ctrl+Scroll to zoom; Shift+Scroll to pan</li>
              <li>Same name in two places = same element (cross-reference)</li>
              <li>
                AI panel: describe a system in plain English to generate a
                diagram
              </li>
              <li>
                Templates panel: start from built-in architectural patterns
              </li>
              <li>
                State persists automatically in your browser — no need to save
                manually
              </li>
            </ul>
          </Section>
        </div>
      </Modal.Content>
    </Modal>
  );
}
