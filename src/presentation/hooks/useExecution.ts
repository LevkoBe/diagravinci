import { useEffect, useRef } from "react";
import { unstable_batchedUpdates } from "react-dom";
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

export function useExecution(): React.MutableRefObject<Map<string, { x: number; y: number }>> {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.execution.status);
  const tickIntervalMs = useAppSelector((s) => s.execution.tickIntervalMs);

  const spawnOriginsRef = useRef(new Map<string, { x: number; y: number }>());

  useEffect(() => {
    if (status !== "running") return;

    const intervalId = setInterval(() => {
      const state = store.getState();
      const { instances, tickCount, nextInstanceId, executionColor, settledCloneIds, removedTemplates } =
        state.execution;
      const { model, viewState } = state.diagram;

      const result = computeExecutionStep(
        model,
        viewState,
        instances,
        tickCount,
        nextInstanceId,
        executionColor,
        settledCloneIds,
        removedTemplates,
      );

      spawnOriginsRef.current.clear();
      for (const { element, spawnOriginId } of result.delta.addElements) {
        const originPos = getElementPosition(viewState, spawnOriginId);
        if (originPos) spawnOriginsRef.current.set(element.id, { ...originPos });
      }

      const newModel = applyDeltaToModel(model, result.delta);
      const allCloneIds = new Set(result.nextInstances.flatMap((i) => i.clonedElementIds));

      unstable_batchedUpdates(() => {
        syncManager.syncFromVis(newModel, false, undefined, allCloneIds);
        dispatch(
          tickAdvance({
            nextInstances: result.nextInstances,
            nextInstanceId: result.nextInstanceId,
            addSettledIds: result.addSettledIds,
            removeSettledIds: result.removeSettledIds,
            addRemovedTemplates: result.addRemovedTemplates,
          }),
        );
      });
    }, tickIntervalMs);

    return () => clearInterval(intervalId);
  }, [status, tickIntervalMs, dispatch]);

  return spawnOriginsRef;
}
