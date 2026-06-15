import { Modal } from "@levkobe/c7one";

const ELEMENTS = [
  { syntax: "name{}", kind: "Object", note: "class, entity, component" },
  { syntax: "name[]", kind: "Collection", note: "array, list, group" },
  { syntax: "name||", kind: "State", note: "condition, lifecycle stage" },
  { syntax: "name()", kind: "Function", note: "operation, process" },
  { syntax: "name>>", kind: "Flow", note: "pipeline stage, I/O boundary" },
  { syntax: "name<>", kind: "Choice", note: "branch, decision point" },
];

const RELATIONSHIPS = [
  { syntax: "a --> b", label: "Association", note: "directed dependency" },
  { syntax: "a ..> b", label: "Flow", note: "data / execution flow, dashed" },
  { syntax: "a --|> b", label: "Inheritance", note: "IS-A, extends" },
  { syntax: "a ..|> b", label: "Realization", note: "implements" },
  { syntax: "a o-- b", label: "Aggregation", note: "has-a, weak ownership" },
  {
    syntax: "a *-- b",
    label: "Composition",
    note: "part-of, strong ownership",
  },
  {
    syntax: "a --label--> b",
    label: "Labeled",
    note: "any type can carry a label",
  },
  {
    syntax: "a 1-->N b",
    label: "Quantified",
    note: "ERD cardinality — digits, N, or * (target only) on either side of any arrow",
  },
];

const DIRECTIVES = [
  {
    syntax: "!group id=g regex=.*Service{} color=#hex",
    note: "regex= is matched against the full type-embedded path (e.g. game{}.player{}); {} [] () || are auto-escaped; element flag matching group id always matches",
  },
  {
    syntax: "!group id=g2 regex=.*Service{}|.*Repository{} color=#hex",
    note: "use | for OR inside regex; standard groups/classes work in the name part (e.g. [A-Z], (foo|bar))",
  },
  {
    syntax: "!group id=g3 compose=g&g2 color=#hex",
    note: "compose= combines group ids with & (AND), | (OR), - (AND NOT), and parens; AND-ed with regex when both are present",
  },
  {
    syntax: '!session id=v label="View" groups=g:color,g2:hide',
    note: "named preset combining group:mode pairs (color/dim/hide/off)",
  },
];

const SHORTCUTS: { keys: string; action: string; group?: string }[] = [
  { keys: "Ctrl+Z", action: "Undo", group: "History" },
  { keys: "Ctrl+Y / Ctrl+Shift+Z", action: "Redo", group: "History" },
  {
    keys: "Ctrl+C / Ctrl+X / Ctrl+V",
    action: "Copy / Cut / Paste",
    group: "Edit",
  },
  { keys: "Ctrl+D", action: "Duplicate selected", group: "Edit" },
  { keys: "Ctrl+A", action: "Select all", group: "Edit" },
  { keys: "Delete / Backspace", action: "Delete selected", group: "Edit" },
  {
    keys: "Ctrl+Shift+K",
    action: "Comment / uncomment lines",
    group: "Code editor",
  },
  {
    keys: "Ctrl+Scroll / Cmd+Scroll",
    action: "Zoom in / out",
    group: "Canvas",
  },
  {
    keys: "Shift+Scroll",
    action: "Pan horizontally / vertically",
    group: "Canvas",
  },
  {
    keys: "Right-click (normal)",
    action: "Toggle fold on element",
    group: "Canvas",
  },
  {
    keys: "Right-click (diff mode)",
    action: "Accept individual change",
    group: "Canvas",
  },
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
        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-fg-primary mb-0.5">
              Quick Reference
            </h2>
            <p className="text-xs text-fg-muted">
              Edit code on the left, draw on the canvas — both stay in sync.{" "}
              <a
                href="https://github.com/LevkoBe/diagravinci"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                Full docs ↗
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
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
              <span>
                Nesting: <CodeChip>{"system{ frontend{} backend{} }"}</CodeChip>
              </span>
              <span>
                Flags: <CodeChip>name:flag</CodeChip>
              </span>
              <span>
                Dot-ref: <CodeChip>system.api.auth</CodeChip>
              </span>
            </div>
          </Section>

          <Section title="Relationship types">
            <div className="grid grid-cols-1 gap-1">
              {RELATIONSHIPS.map(({ syntax, label, note }) => (
                <div key={label} className="flex items-center gap-3 text-xs">
                  <CodeChip>{syntax}</CodeChip>
                  <span className="font-medium text-fg-primary w-24 shrink-0">
                    {label}
                  </span>
                  <span className="text-fg-muted">{note}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              Mirror forms: <CodeChip>{"<--"}</CodeChip>{" "}
              <CodeChip>{"<.."}</CodeChip> <CodeChip>{"<|--"}</CodeChip>{" "}
              <CodeChip>{"<|.."}</CodeChip> <CodeChip>{"--o"}</CodeChip>{" "}
              <CodeChip>{"--*"}</CodeChip> · Quantifiers: <CodeChip>1</CodeChip>{" "}
              <CodeChip>N</CodeChip> <CodeChip>*</CodeChip> (target only)
            </div>
          </Section>

          <Section title="Directives — groups, sessions">
            <div className="grid grid-cols-1 gap-2">
              {DIRECTIVES.map(({ syntax, note }) => (
                <div key={syntax} className="flex flex-col gap-0.5 text-xs">
                  <CodeChip>{syntax}</CodeChip>
                  <span className="text-fg-muted pl-1">{note}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              Group modes: <CodeChip>color</CodeChip> highlights matched ·{" "}
              <CodeChip>dim</CodeChip> fades unmatched ·{" "}
              <CodeChip>hide</CodeChip> removes unmatched ·{" "}
              <CodeChip>off</CodeChip> disabled
            </div>
          </Section>

          <Section title="Toolbar groups">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-fg-muted">
              <div>
                <span className="text-fg-primary font-medium">Create</span> —
                choose element type, then click canvas
              </div>
              <div>
                <span className="text-fg-primary font-medium">Mode</span> —
                select / connect / delete / disconnect / pan / present
              </div>
              <div>
                <span className="text-fg-primary font-medium">Rel</span> —
                relationship type for Connect mode
              </div>
              <div>
                <span className="text-fg-primary font-medium">Layout</span> —
                Hierarchical · Radial · Circular · Timeline · Pipeline · Execute
                · Force · Basic
              </div>
              <div>
                <span className="text-fg-primary font-medium">Select</span> —
                filter presets and fold depth
              </div>
              <div>
                <span className="text-fg-primary font-medium">Run</span> — play
                / pause / step / reset token simulation
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
              {SHORTCUTS.reduce<{ group: string; items: typeof SHORTCUTS }[]>(
                (acc, s) => {
                  const g = s.group ?? "";
                  const last = acc[acc.length - 1];
                  if (last && last.group === g) {
                    last.items.push(s);
                  } else {
                    acc.push({ group: g, items: [s] });
                  }
                  return acc;
                },
                [],
              ).map(({ group, items }) => (
                <div key={group} className="mb-2">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-fg-muted/60 mb-1">
                    {group}
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {items.map(({ keys, action }) => (
                      <div
                        key={keys}
                        className="flex items-start gap-3 text-xs"
                      >
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
              <li>
                Same name in two places = same element (cross-reference with
                dot-notation)
              </li>
              <li>Right-click any element to fold / unfold it individually</li>
              <li>
                Define <CodeChip>!group</CodeChip> <CodeChip>!session</CodeChip>{" "}
                directly in diagram code — loaded automatically on parse
              </li>
              <li>
                AI panel: describe a system in plain English to generate or
                extend a diagram
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
