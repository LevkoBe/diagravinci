import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Lexer } from "../infrastructure/parser/Lexer";
import { Parser } from "../infrastructure/parser/Parser";
import { ViewStateMerger } from "../domain/sync/ViewStateMerger";
import { AppConfig } from "../config/appConfig";
import { setCode, setModel, setViewState } from "../application/store/diagramSlice";
import { setRelLineStyle } from "../application/store/uiSlice";
import type { RelLineStyle } from "../application/store/uiSlice";
import { syncSelectorsFromCode } from "../application/store/filterSlice";
import type { RootState } from "../application/store/store";
import type { EmbedDispatch } from "./embedStore";

const VALID_REL_LINE_STYLES: RelLineStyle[] = ["straight", "curved", "orthogonal"];

export function useEmbedMessages() {
  const dispatch = useDispatch<EmbedDispatch>();
  const viewState = useSelector((s: RootState) => s.diagram.viewState);
  const model = useSelector((s: RootState) => s.diagram.model);
  const viewStateRef = useRef(viewState);
  const modelRef = useRef(model);

  useEffect(() => {
    viewStateRef.current = viewState;
    modelRef.current = model;
  });

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data) return;

      if (event.data.type === "SET_REL_LINE_STYLE") {
        const { relLineStyle } = event.data as { type: string; relLineStyle: unknown };
        if (typeof relLineStyle === "string" && (VALID_REL_LINE_STYLES as string[]).includes(relLineStyle)) {
          dispatch(setRelLineStyle(relLineStyle as RelLineStyle));
        }
        return;
      }

      if (event.data.type !== "SET_DIAGRAM") return;
      const { diagram } = event.data as { type: string; diagram: unknown };
      if (typeof diagram !== "string") return;
      try {
        const model = new Parser(new Lexer(diagram).tokenize()).parse();
        const canvasSize = {
          width: AppConfig.canvas.DEFAULT_WIDTH,
          height: AppConfig.canvas.DEFAULT_HEIGHT,
        };
        const newViewState = {
          ...ViewStateMerger.merge(viewStateRef.current, model, canvasSize),
          viewMode: viewStateRef.current.viewMode,
        };
        dispatch(syncSelectorsFromCode({
          modelSelectors: model.selectors ?? [],
          prevModelSelectorIds: (modelRef.current.selectors ?? []).map((s) => s.id),
        }));
        dispatch(setModel(model));
        dispatch(setViewState(newViewState));
        dispatch(setCode(diagram));
      } catch {
        // ignore invalid DSL
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [dispatch]);
}
