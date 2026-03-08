import Konva from "konva";
import type { Element, ElementType } from "../../domain/models/Element";
import { createElement } from "../../domain/models/Element";
import type {
  ViewState,
  PositionedElement,
  PositionedRelationship,
} from "../../domain/models/ViewState";
import { createEmptyViewState } from "../../domain/models/ViewState";
import type { RelationshipType } from "../../infrastructure/parser/Token";

export class KonvaTestHelper {
  private stage: Konva.Stage | null = null;
  private container: HTMLDivElement | null = null;

  createStage(width: number = 800, height: number = 600): Konva.Stage {
    this.container = document.createElement("div");
    this.stage = new Konva.Stage({
      container: this.container,
      width,
      height,
    });
    return this.stage;
  }

  cleanup(): void {
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  getStage(): Konva.Stage {
    if (!this.stage) throw new Error("Stage not created");
    return this.stage;
  }

  findShapesInLayer<T extends Konva.Shape>(
    layer: Konva.Layer,
    Constructor: new (...args: unknown[]) => T,
  ): T[] {
    return layer.find((node: Konva.Node) => node instanceof Constructor) as T[];
  }

  countShapeTypes(layer: Konva.Layer): Record<string, number> {
    const counts: Record<string, number> = {};
    layer.getChildren().forEach((node) => {
      const type = node.constructor.name;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }

  simulateClick(shape: Konva.Shape): void {
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    shape.fire("click", {
      type: "click",
      target: shape,
      evt: event,
      pointerId: 0,
      currentTarget: shape,
      cancelBubble: false,
    });
  }

  simulateMouseEnter(shape: Konva.Shape): void {
    const event = new MouseEvent("mouseenter", {
      bubbles: true,
      cancelable: true,
    });
    shape.fire("mouseenter", {
      type: "mouseenter",
      target: shape,
      evt: event,
      pointerId: 0,
      currentTarget: shape,
      cancelBubble: false,
    });
  }

  simulateMouseLeave(shape: Konva.Shape): void {
    const event = new MouseEvent("mouseleave", {
      bubbles: true,
      cancelable: true,
    });
    shape.fire("mouseleave", {
      type: "mouseleave",
      target: shape,
      evt: event,
      pointerId: 0,
      currentTarget: shape,
      cancelBubble: false,
    });
  }

  simulateDragStart(shape: Konva.Shape): void {
    const event = new Event("dragstart");
    shape.fire("dragstart", {
      type: "dragstart",
      target: shape,
      evt: event,
      pointerId: 0,
      currentTarget: shape,
      cancelBubble: false,
    });
  }

  simulateDragMove(shape: Konva.Shape): void {
    const event = new Event("dragmove");
    shape.fire("dragmove", {
      type: "dragmove",
      target: shape,
      evt: event,
      pointerId: 0,
      currentTarget: shape,
      cancelBubble: false,
    });
  }

  simulateDragEnd(shape: Konva.Shape): void {
    const event = new Event("dragend");
    shape.fire("dragend", {
      type: "dragend",
      target: shape,
      evt: event,
      pointerId: 0,
      currentTarget: shape,
      cancelBubble: false,
    });
  }

  hasChildOfType<T extends Konva.Node>(
    parent: Konva.Container,
    Constructor: new (...args: unknown[]) => T,
  ): boolean {
    return parent.getChildren().some((child) => child instanceof Constructor);
  }

  getFirstChildOfType<T extends Konva.Node>(
    parent: Konva.Container,
    Constructor: new (...args: unknown[]) => T,
  ): T | null {
    const children = parent.getChildren() as unknown[];
    return (
      (children.find((child) => child instanceof Constructor) as T) ?? null
    );
  }

  getChildCount(group: Konva.Group): number {
    return group.getChildren().length;
  }
}

export class ViewStateBuilder {
  private positions: Record<string, PositionedElement> = {};
  private relationships: PositionedRelationship[] = [];

  addElement(
    path: string,
    x: number,
    y: number,
    size: number = 60,
    isRecursive: boolean = false,
  ): this {
    this.positions[path] = {
      id: path.split(".").pop() ?? path,
      position: { x, y },
      size,
      value: 1,
      isRecursive,
    };
    return this;
  }

  addRelationship(
    id: string,
    sourcePath: string,
    targetPath: string,
    type: RelationshipType = "-->",
    label?: string,
  ): this {
    this.relationships.push({
      id,
      sourcePath,
      targetPath,
      type,
      label,
    });
    return this;
  }

  build(): ViewState {
    const viewState = createEmptyViewState();
    return {
      ...viewState,
      positions: this.positions,
      relationships: this.relationships,
    };
  }
}

export const MockElementFactory = {
  createElement(id: string, type: ElementType = "object"): Element {
    return createElement(id, type);
  },
};

export class CallbackTracker {
  private calls: Array<{ name: string; args: unknown[] }> = [];

  createCallback<T extends unknown[], R>(
    name: string,
    impl?: ((...args: T) => R) | null,
  ): (...args: T) => R | undefined {
    return (...args: T): R | undefined => {
      this.calls.push({ name, args });
      return impl?.(...args);
    };
  }

  getCalls(name: string): Array<{ args: unknown[] }> {
    return this.calls.filter((c) => c.name === name);
  }

  wasCalledWith(name: string, ...expectedArgs: unknown[]): boolean {
    return this.calls.some(
      (c) =>
        c.name === name &&
        JSON.stringify(c.args) === JSON.stringify(expectedArgs),
    );
  }

  lastCallArgs(name: string): unknown[] | null {
    const calls = this.getCalls(name);
    return calls.length > 0 ? calls[calls.length - 1].args : null;
  }

  callCount(name: string): number {
    return this.getCalls(name).length;
  }

  reset(): void {
    this.calls = [];
  }

  allCalls(): Array<{ name: string; args: unknown[] }> {
    return this.calls;
  }
}
