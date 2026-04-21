import type { AppStore, RootState } from "./store/store";
import { setModel, setViewState, setCode } from "./store/diagramSlice";
import { syncPresetsFromTab } from "./store/filterSlice";
import type { FilterPreset } from "../domain/models/Selector";
import type { DiagramModel } from "../domain/models/DiagramModel";
import type {
  PositionedElement,
  PositionedRelationship,
} from "../domain/models/ViewState";

type SyncablePreset = Omit<FilterPreset, "isActive">;

type TabMessage =
  | {
      type: "MODEL_UPDATE";
      tabId: string;
      model: DiagramModel;
      code: string;
      positions: Record<string, PositionedElement>;
      relationships: PositionedRelationship[];
    }
  | {
      type: "PRESET_SYNC";
      tabId: string;
      presets: SyncablePreset[];
    }
  | {
      type: "HELLO";
      tabId: string;
    }
  | {
      type: "HELLO_REPLY";
      tabId: string;
      toTabId: string;
      model: DiagramModel;
      code: string;
      positions: Record<string, PositionedElement>;
      relationships: PositionedRelationship[];
      presets: SyncablePreset[];
    };

function presetDefSig(presets: FilterPreset[]): string {
  return JSON.stringify(presets.map(({ isActive: _ia, ...rest }) => rest));
}

export class TabSyncManager {
  private channel: BroadcastChannel;
  private readonly tabId = crypto.randomUUID();
  private isReceiving = false;
  private prevPresetSig: string;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly store: AppStore;

  constructor(store: AppStore) {
    this.store = store;
    const state = store.getState();
    this.prevPresetSig = presetDefSig(state.filter.presets);

    this.channel = new BroadcastChannel("diagravinci");
    this.channel.onmessage = (e: MessageEvent<TabMessage>) =>
      this.handleMessage(e.data);

    let prevState = state;
    store.subscribe(() => {
      if (this.isReceiving) return;
      const curr = store.getState();
      this.onStateChange(prevState, curr);
      prevState = curr;
    });

    this.channel.postMessage({ type: "HELLO", tabId: this.tabId });
  }

  private onStateChange(prev: RootState, curr: RootState) {
    if (prev.diagram.code !== curr.diagram.code) {
      this.scheduleBroadcast();
    }

    const sig = presetDefSig(curr.filter.presets);
    if (sig !== this.prevPresetSig) {
      this.prevPresetSig = sig;
      this.broadcastPresets(curr);
    }
  }

  private scheduleBroadcast() {
    if (this.broadcastTimer !== null) clearTimeout(this.broadcastTimer);
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      const curr = this.store.getState();
      this.channel.postMessage({
        type: "MODEL_UPDATE",
        tabId: this.tabId,
        model: curr.diagram.model,
        code: curr.diagram.code,
        positions: curr.diagram.viewState.positions,
        relationships: curr.diagram.viewState.relationships,
      } satisfies TabMessage);
    }, 300);
  }

  private broadcastPresets(state: RootState) {
    this.channel.postMessage({
      type: "PRESET_SYNC",
      tabId: this.tabId,
      presets: state.filter.presets.map(({ isActive: _ia, ...rest }) => rest),
    } satisfies TabMessage);
  }

  private handleMessage(msg: TabMessage) {
    if (msg.tabId === this.tabId) return;

    if (msg.type === "HELLO") {
      const curr = this.store.getState();
      this.channel.postMessage({
        type: "HELLO_REPLY",
        tabId: this.tabId,
        toTabId: msg.tabId,
        model: curr.diagram.model,
        code: curr.diagram.code,
        positions: curr.diagram.viewState.positions,
        relationships: curr.diagram.viewState.relationships,
        presets: curr.filter.presets.map(({ isActive: _ia, ...rest }) => rest),
      } satisfies TabMessage);
      return;
    }

    if (msg.type === "HELLO_REPLY" && msg.toTabId !== this.tabId) return;

    this.isReceiving = true;
    try {
      const state = this.store.getState();

      if (msg.type === "MODEL_UPDATE" || msg.type === "HELLO_REPLY") {
        if (msg.code === state.diagram.code) {
          if (msg.type === "HELLO_REPLY") {
            this.store.dispatch(syncPresetsFromTab(msg.presets));
          }
          return;
        }
        this.store.dispatch(setCode(msg.code));
        this.store.dispatch(setModel(msg.model));
        this.store.dispatch(
          setViewState({
            ...state.diagram.viewState,
            positions: msg.positions,
            relationships: msg.relationships,
          }),
        );
        if (msg.type === "HELLO_REPLY") {
          this.store.dispatch(syncPresetsFromTab(msg.presets));
        }
      } else if (msg.type === "PRESET_SYNC") {
        this.store.dispatch(syncPresetsFromTab(msg.presets));
      }
    } finally {
      this.isReceiving = false;
    }
  }

  destroy() {
    this.channel.close();
    if (this.broadcastTimer !== null) clearTimeout(this.broadcastTimer);
  }
}
