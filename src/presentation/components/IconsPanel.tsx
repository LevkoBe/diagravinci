import { useState } from "react";
import { getLucideIcon, type LucideIconNode } from "./rendering/elements/lucideIconMap";

const ICON_CATEGORIES: { name: string; icons: string[] }[] = [
  {
    name: "Technology",
    icons: ["database", "server", "cloud", "network", "router", "cpu", "storage", "cache", "queue", "api", "web", "auth", "workflow", "event", "layers"],
  },
  {
    name: "Security",
    icons: ["lock", "key", "shield", "globe", "eye", "compass"],
  },
  {
    name: "People",
    icons: ["user", "users", "phone", "mail", "heart", "star"],
  },
  {
    name: "Files",
    icons: ["file", "folder", "log", "chart", "ledger", "blueprint"],
  },
  {
    name: "UI",
    icons: ["settings", "search", "clock", "calendar", "info", "warning", "check", "x", "zap", "timer", "diagram", "frame"],
  },
  {
    name: "Combat",
    icons: ["sword", "axe", "bow", "dagger", "spear", "hammer", "pickaxe", "blade", "baton", "chisel", "whetstone"],
  },
  {
    name: "Defense",
    icons: ["helm", "knight", "fortress", "wall", "gauntlet", "boots", "cape", "mask", "cage", "chain"],
  },
  {
    name: "Magic",
    icons: ["flame", "storm", "rune", "potion", "beacon", "gem", "prism", "tome", "scroll", "feather", "seal"],
  },
  {
    name: "World",
    icons: ["anchor", "map", "telescope", "target", "flag", "crown", "medal", "scales", "hourglass", "arrow", "megaphone", "ghost"],
  },
  {
    name: "Craft",
    icons: ["anvil", "wrench", "saw", "drill", "ruler", "forge", "kiln", "bellows", "lathe", "mold", "grinder", "stencil", "pin", "wire", "tally", "level", "chalk"],
  },
  {
    name: "Misc",
    icons: ["lyre", "strings", "wheel", "ram", "mirror", "broom", "clay", "needle", "dye", "cabinet", "coin", "wings", "treasure", "lens"],
  },
];

function InlineIcon({ nodes }: { nodes: LucideIconNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {nodes.map(([tag, attrs], i) => {
        if (tag === "path") return <path key={i} d={attrs.d} />;
        if (tag === "circle")
          return <circle key={i} cx={Number(attrs.cx)} cy={Number(attrs.cy)} r={Number(attrs.r)} />;
        if (tag === "ellipse")
          return <ellipse key={i} cx={Number(attrs.cx)} cy={Number(attrs.cy)} rx={Number(attrs.rx)} ry={Number(attrs.ry)} />;
        if (tag === "rect")
          return (
            <rect
              key={i}
              x={Number(attrs.x ?? 0)}
              y={Number(attrs.y ?? 0)}
              width={Number(attrs.width)}
              height={Number(attrs.height)}
              rx={Number(attrs.rx ?? 0)}
            />
          );
        if (tag === "line")
          return <line key={i} x1={Number(attrs.x1)} y1={Number(attrs.y1)} x2={Number(attrs.x2)} y2={Number(attrs.y2)} />;
        if (tag === "polyline") return <polyline key={i} points={attrs.points} />;
        if (tag === "polygon") return <polygon key={i} points={attrs.points} />;
        return null;
      })}
    </svg>
  );
}

function IconCell({ name, onCopy }: { name: string; onCopy: (n: string) => void }) {
  const nodes = getLucideIcon(name);
  if (!nodes) return null;

  return (
    <button
      onClick={() => onCopy(name)}
      title={`Copy _${name}_`}
      className="flex flex-col items-center gap-0.5 p-1.5 rounded border border-transparent hover:border-border/30 hover:bg-accent/5 transition-all group cursor-pointer"
    >
      <span className="text-fg-muted group-hover:text-accent transition-colors">
        <InlineIcon nodes={nodes} />
      </span>
      <span className="text-[8px] text-fg-disabled group-hover:text-fg-muted leading-tight text-center w-full truncate">
        {name}
      </span>
    </button>
  );
}

export function IconsPanel() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const lq = query.toLowerCase();
  const categories = query
    ? ICON_CATEGORIES
        .map((c) => ({ ...c, icons: c.icons.filter((n) => n.includes(lq)) }))
        .filter((c) => c.icons.length > 0)
    : ICON_CATEGORIES;

  function handleCopy(name: string) {
    navigator.clipboard.writeText(`_${name}_`).catch(() => {});
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <p className="text-[11px] font-semibold text-fg-disabled uppercase tracking-wider mb-2">
          Icons
        </p>
        <input
          type="text"
          placeholder="Search icons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs bg-bg-base/60 border border-border/30 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60 text-fg-primary placeholder:text-fg-disabled"
        />
        <p className="text-[10px] text-fg-disabled mt-1.5">
          Click to copy{" "}
          <code className="font-mono bg-fg-ternary/10 px-0.5 rounded">_name_</code>{" "}
          syntax
        </p>
      </div>

      {copied !== null && (
        <div className="mx-3 mb-1 px-2 py-1 text-[10px] text-accent bg-accent/5 border border-accent/20 rounded text-center">
          Copied{" "}
          <code className="font-mono">_{copied}_</code>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        {categories.length === 0 ? (
          <p className="text-xs text-fg-disabled text-center py-6">
            No icons match &ldquo;{query}&rdquo;
          </p>
        ) : (
          categories.map((cat) => (
            <div key={cat.name} className="mb-4">
              <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wider mb-1.5">
                {cat.name}
              </p>
              <div className="grid grid-cols-4 gap-0.5">
                {cat.icons.map((name) => (
                  <IconCell key={name} name={name} onCopy={handleCopy} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
