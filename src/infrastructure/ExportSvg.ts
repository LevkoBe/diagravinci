import type { ViewState } from "../domain/models/ViewState";

const ELEMENT_COLORS: Record<string, { fill: string; stroke: string }> = {
  object: { fill: "#dbeafe", stroke: "#3b82f6" },
  state: { fill: "#dcfce7", stroke: "#22c55e" },
  collection: { fill: "#fef9c3", stroke: "#eab308" },
  function: { fill: "#fce7f3", stroke: "#ec4899" },
  flow: { fill: "#ede9fe", stroke: "#8b5cf6" },
  choice: { fill: "#ffedd5", stroke: "#f97316" },
  default: { fill: "#f1f5f9", stroke: "#64748b" },
};

const ARROW_MARKERS: Record<string, string> = {
  "-->": "arrow-open",
  "..>": "arrow-dashed",
  "--|>": "arrow-inherit",
  "..|>": "arrow-inherit-dashed",
  "o--": "diamond-open",
  "*--": "diamond-filled",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportDiagramToSVG(
  viewState: ViewState,
  elementTypes: Record<string, string>,
  elementLabels: Record<string, string>,
): string {
  const positions = viewState.positions;
  const rels = viewState.relationships;
  const hidden = new Set(viewState.hiddenPaths);

  const visibleEntries = Object.entries(positions).filter(
    ([path]) => !hidden.has(path),
  );

  if (!visibleEntries.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="100" y="35" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#64748b">Empty diagram</text></svg>`;
  }

  const PAD = 60;
  const xs = visibleEntries.map(([, p]) => p.position.x);
  const ys = visibleEntries.map(([, p]) => p.position.y);
  const sizes = visibleEntries.map(([, p]) => p.size);

  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const maxX = Math.max(...xs.map((x, i) => x + sizes[i])) + PAD;
  const maxY = Math.max(...ys.map((y, i) => y + sizes[i])) + PAD;
  const W = maxX - minX;
  const H = maxY - minY;

  const centers: Record<string, { cx: number; cy: number; r: number }> = {};
  for (const [path, pe] of visibleEntries) {
    const r = pe.size / 2;
    centers[path] = {
      cx: pe.position.x + r - minX,
      cy: pe.position.y + r - minY,
      r,
    };
  }

  const defs = `
  <defs>
    <marker id="arrow-open" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#64748b"/>
    </marker>
    <marker id="arrow-dashed" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#64748b" opacity="0.6"/>
    </marker>
    <marker id="arrow-inherit" markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto">
      <path d="M0,0 L0,8 L9,4 z" fill="none" stroke="#64748b" stroke-width="1.5"/>
    </marker>
    <marker id="arrow-inherit-dashed" markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto">
      <path d="M0,0 L0,8 L9,4 z" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
    </marker>
    <marker id="diamond-open" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M1,4 L5,1 L9,4 L5,7 z" fill="none" stroke="#64748b" stroke-width="1.5"/>
    </marker>
    <marker id="diamond-filled" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M1,4 L5,1 L9,4 L5,7 z" fill="#64748b"/>
    </marker>
  </defs>`;

  const relLines: string[] = [];
  for (const rel of rels) {
    if (hidden.has(rel.sourcePath) || hidden.has(rel.targetPath)) continue;
    const src = centers[rel.sourcePath];
    const tgt = centers[rel.targetPath];
    if (!src || !tgt) continue;

    const dx = tgt.cx - src.cx;
    const dy = tgt.cy - src.cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    const x1 = src.cx + nx * src.r;
    const y1 = src.cy + ny * src.r;
    const x2 = tgt.cx - nx * (tgt.r + 8);
    const y2 = tgt.cy - ny * (tgt.r + 8);

    const markerId = ARROW_MARKERS[rel.type] ?? "arrow-open";
    const isDashed = rel.type.startsWith(".");
    const strokeAttr = isDashed ? 'stroke-dasharray="5,3"' : "";

    let line = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#94a3b8" stroke-width="1.5" ${strokeAttr} marker-end="url(#${markerId})"/>`;

    if (rel.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      line += `<text x="${mx.toFixed(1)}" y="${(my - 4).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">${escapeXml(rel.label)}</text>`;
    }

    relLines.push(line);
  }

  const elementShapes: string[] = [];
  for (const [path, pe] of visibleEntries) {
    const { cx, cy, r } = centers[path];
    const id = pe.id;
    const type = elementTypes[id] ?? "default";
    const label = elementLabels[id] ?? id;
    const colors = ELEMENT_COLORS[type] ?? ELEMENT_COLORS.default;
    const fontSize = Math.max(8, Math.min(13, r * 0.4));

    elementShapes.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1.5"/>` +
        `<text x="${cx.toFixed(1)}" y="${(cy + fontSize * 0.35).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize.toFixed(1)}" fill="#1e293b" clip-path="circle(${(r * 0.85).toFixed(1)}px at 0 0)">${escapeXml(label)}</text>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(0)}" height="${H.toFixed(0)}" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}">
  ${defs}
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${relLines.join("\n  ")}
  ${elementShapes.join("\n  ")}
</svg>`;
}
