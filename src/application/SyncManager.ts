import { DiagramModel } from "../domain/models/DiagramModel";

export type SyncSource = "code" | "vis" | "ai";

export interface SyncEvent {
  source: SyncSource;
  model: DiagramModel;
  timestamp: number;
}

export class SyncManager {
  private listeners: Array<(event: SyncEvent) => void> = [];

  public subscribe(callback: (event: SyncEvent) => void): void {
    this.listeners.push(callback);
  }

  syncFromCode(code: string): void {
    // TODO: parse code -> update model -> notify listeners
  }

  syncFromVis(model: DiagramModel): void {
    // TODO: gen code -> update model -> notify listeners
  }

  syncFromAI(code: any): void {
    // TODO: parse code -> update model -> notify listeners
  }

  private notifyListeners(event: SyncEvent): void {
    this.listeners.forEach((callback) => callback(event));
  }
}
