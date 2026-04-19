import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Lexer } from "../infrastructure/parser/Lexer";
import { Parser } from "../infrastructure/parser/Parser";
import { ViewStateMerger } from "../domain/sync/ViewStateMerger";
import { AppConfig } from "../config/appConfig";
import { setCode, setModel, setViewState } from "../application/store/diagramSlice";
import type { RootState } from "../application/store/store";
import type { EmbedDispatch } from "./embedStore";

export function useEmbedMessages() {
  const dispatch = useDispatch<EmbedDispatch>();
  const viewState = useSelector((s: RootState) => s.diagram.viewState);
  const viewStateRef = useRef(viewState);

  useEffect(() => {
    viewStateRef.current = viewState;
  });

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== "SET_DIAGRAM") return;
      const { diagram } = event.data as { type: string; diagram: unknown };
      if (typeof diagram !== "string") return;
      try {
        const model = new Parser(new Lexer(diagram).tokenize()).parse();
        const canvasSize = {
          width: AppConfig.canvas.DEFAULT_WIDTH,
          height: AppConfig.canvas.DEFAULT_HEIGHT,
        };
        const newViewState = ViewStateMerger.merge(
          viewStateRef.current,
          model,
          canvasSize,
        );
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
