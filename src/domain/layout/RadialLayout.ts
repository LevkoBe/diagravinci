import type { Element } from "../models/Element";
import type { DiagramModel } from "../models/DiagramModel";
import { ELEMENT_FILL } from "./BaseLayout";
import { TopologicalLayout } from "./TopologicalLayout";

export class RadialLayout extends TopologicalLayout {
  name = "radial";
  protected viewMode = "radial" as const;

  protected computePositions(
    children: Element[],
    model: DiagramModel,
    containerWidth: number,
    containerHeight: number,
  ): { x: number; y: number; size: number }[] {
    if (children.length === 1) {
      return [{ x: 0, y: 0, size: Math.min(containerWidth, containerHeight) * ELEMENT_FILL }];
    }

    const rank = this.topoSort(children, model);

    const byLevel = new Map<number, string[]>();
    for (const c of children) {
      const d = rank.get(c.id)!;
      byLevel.set(d, [...(byLevel.get(d) ?? []), c.id]);
    }

    const numLevels = Math.max(...byLevel.keys()) + 1;
    const maxRadius = Math.min(containerWidth, containerHeight) / 2;
    const ringSpacing = maxRadius / numLevels;

    const ids = new Set(children.map((e) => e.id));
    const parentIds = new Map<string, string[]>();
    for (const rel of Object.values(model.relationships)) {
      if (ids.has(rel.source) && ids.has(rel.target)) {
        const existing = parentIds.get(rel.target) ?? [];
        parentIds.set(rel.target, [...existing, rel.source]);
      }
    }

    const angleById = new Map<string, number>();
    const rawById = new Map<string, { x: number; y: number; size: number }>();

    for (let level = 0; level < numLevels; level++) {
      const levelIds = byLevel.get(level) ?? [];
      const isCenterSingleton = level === 0 && levelIds.length === 1;
      const radius = isCenterSingleton ? 0 : (level + 0.5) * ringSpacing;
      const count = levelIds.length;

      const sorted =
        level === 0
          ? levelIds
          : [...levelIds].sort((a, b) => {
              const aAngle = circularMean(
                (parentIds.get(a) ?? []).map((p) => angleById.get(p) ?? 0),
              );
              const bAngle = circularMean(
                (parentIds.get(b) ?? []).map((p) => angleById.get(p) ?? 0),
              );
              return aAngle - bAngle;
            });

      const arcSpacing =
        radius === 0 || count === 1 ? ringSpacing : (2 * Math.PI * radius) / count;
      const size = Math.min(ringSpacing, arcSpacing) * ELEMENT_FILL;

      sorted.forEach((id, i) => {
        const angle =
          count === 1 ? -Math.PI / 2 : (2 * Math.PI * i) / count - Math.PI / 2;
        angleById.set(id, angle);
        rawById.set(id, {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          size,
        });
      });
    }

    return children.map((c) => rawById.get(c.id)!);
  }
}

function circularMean(angles: number[]): number {
  if (!angles.length) return 0;
  const sinSum = angles.reduce((s, a) => s + Math.sin(a), 0);
  const cosSum = angles.reduce((s, a) => s + Math.cos(a), 0);
  return Math.atan2(sinSum, cosSum);
}
