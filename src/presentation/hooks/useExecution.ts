import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { tickAdvance } from "../../application/store/executionSlice";
import { computeExecutionStep, applyDeltaToModel } from "../../application/ExecutionEngine";
import type { ViewState } from "../../domain/models/ViewState";
import { store, syncManager } from "../../application/store/store";

function getElementPosition(
  viewState: ViewState,
  elementId: string,
): { x: number; y: number } | undefined {
  if (viewState.positions[elementId]) return viewState.positions[elementId].position;
  for (const [path, pos] of Object.entries(viewState.positions)) {
    if (path.endsWith(`.${elementId}`)) return pos.position;
  }
  return undefined;
}

/**
 * Drives the execution tick loop.
 *
 * Each tick:
 *  1. Computes the next execution step (pure function).
 *  2. Applies the delta to the model as a plain immutable update.
 *  3. Routes the new model through syncManager.syncFromVis — which calls
 *     ExecuteLayout (preserves positions, adds slots for new clones),
 *     CodeGenerator (keeps code in sync), and sets both model + viewState.
 *
 * Returns a ref that maps newly-spawned clone element IDs to the world position
 * of the element that generated them. VisualCanvas uses this to animate new
 * clones flying out from their source rather than appearing in place.
 */
export function useExecution(): React.MutableRefObject<Map<string, { x: number; y: number }>> {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.execution.status);
  const tickIntervalMs = useAppSelector((s) => s.execution.tickIntervalMs);

  /** clone element ID → world position of the element that generated it */
  const spawnOriginsRef = useRef(new Map<string, { x: number; y: number }>());

  useEffect(() => {
    if (status !== "running") return;

    const intervalId = setInterval(() => {
      const state = store.getState();
      const { instances, tickCount, nextInstanceId, executionColor } =
        state.execution;
      const { model, viewState } = state.diagram;

      const result = computeExecutionStep(
        model,
        viewState,
        instances,
        tickCount,
        nextInstanceId,
        executionColor,
      );

      // Record spawn origins for newly added clones so VisualCanvas can animate
      // them flying out from their source element.
      spawnOriginsRef.current.clear();
      for (const { element, spawnOriginId } of result.delta.addElements) {
        const originPos = getElementPosition(viewState, spawnOriginId);
        if (originPos) spawnOriginsRef.current.set(element.id, { ...originPos });
      }

      const newModel = applyDeltaToModel(model, result.delta);
      syncManager.syncFromVis(newModel);

      dispatch(
        tickAdvance({
          nextInstances: result.nextInstances,
          nextInstanceId: result.nextInstanceId,
        }),
      );
    }, tickIntervalMs);

    return () => clearInterval(intervalId);
  }, [status, tickIntervalMs, dispatch]);

  return spawnOriginsRef;
}
