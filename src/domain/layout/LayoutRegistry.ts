import type { ViewState } from "../models/ViewState";
import type { LayoutAlgorithm } from "./LayoutAlgorithm";
import CircularLayout from "./CircularLayout";
import { HierarchicalLayout } from "./HierarchicalLayout";
import { TimelineLayout } from "./TimelineLayout";
import { PipelineLayout } from "./PipelineLayout";

type ViewMode = ViewState["viewMode"];

const registry: Record<ViewMode, LayoutAlgorithm> = {
  circular: new CircularLayout(),
  basic: new CircularLayout(),
  hierarchical: new HierarchicalLayout(),
  timeline: new TimelineLayout(),
  pipeline: new PipelineLayout(),
};

export function getLayout(viewMode: ViewMode): LayoutAlgorithm {
  return registry[viewMode] ?? registry.circular;
}
