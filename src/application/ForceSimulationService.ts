import type { AppStore } from "./store/store";
import type { PositionedElement } from "../domain/models/ViewState";
import { batchUpdatePositions } from "./store/diagramSlice";

export const forceConfig = {
  repulsion: 1.5, // k * ri * rj / d^2 (node-pair repulsion)
  linkDistance: 80, // extra px gap beyond summed radii for edge rest length
  gravity: 0.002, // pull toward canvas center
};

const SPRING_K = 0.004;
const DAMPING = 0.85;
const MAX_VELOCITY = 30;
const CONVERGENCE_KE = 0.08;

export class ForceSimulationService {
  private rafId: number | null = null;
  private velocities: Record<string, { x: number; y: number }> = {};
  private simPositions: Record<string, { x: number; y: number }> = {};
  private store: AppStore | null = null;
  private storeUnsub: (() => void) | null = null;
  private active = false;

  start(store: AppStore): void {
    this.store = store;
    this.active = true;

    const { viewState } = store.getState().diagram;
    this.initFromPositions(viewState.positions);
    this.scheduleNext();

    // Re-activate the loop after convergence if the user drags a node
    this.storeUnsub = store.subscribe(() => {
      if (!this.active || this.rafId !== null) return;
      const { viewState: vs } = store.getState().diagram;
      if (vs.viewMode !== "force") return;
      for (const [path, pe] of Object.entries(vs.positions)) {
        if (path.includes(".")) continue;
        const sim = this.simPositions[path];
        if (!sim) continue;
        const dx = pe.position.x - sim.x;
        const dy = pe.position.y - sim.y;
        if (dx * dx + dy * dy > 4) {
          this.scheduleNext();
          return;
        }
      }
    });
  }

  stop(): void {
    this.active = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.storeUnsub) {
      this.storeUnsub();
      this.storeUnsub = null;
    }
    this.velocities = {};
    this.simPositions = {};
    this.store = null;
  }

  isActive(): boolean {
    return this.active;
  }

  private initFromPositions(
    positions: Record<string, PositionedElement>,
  ): void {
    for (const [path, pe] of Object.entries(positions)) {
      if (path.includes(".")) continue;
      this.simPositions[path] = { ...pe.position };
      this.velocities[path] = { x: 0, y: 0 };
    }
  }

  private scheduleNext(): void {
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private tick(): void {
    this.rafId = null;
    if (!this.store || !this.active) return;

    const { viewState, canvasSize } = this.store.getState().diagram;
    if (viewState.viewMode !== "force") {
      this.stop();
      return;
    }

    // Sync with store: picks up user drags and model changes
    for (const [path, pe] of Object.entries(viewState.positions)) {
      if (path.includes(".")) continue;
      if (this.simPositions[path]) {
        const dx = pe.position.x - this.simPositions[path].x;
        const dy = pe.position.y - this.simPositions[path].y;
        if (dx * dx + dy * dy > 4) {
          this.simPositions[path] = { ...pe.position };
          this.velocities[path] = { x: 0, y: 0 };
        }
      } else {
        this.simPositions[path] = { ...pe.position };
        this.velocities[path] = { x: 0, y: 0 };
      }
    }
    for (const path of Object.keys(this.simPositions)) {
      if (!viewState.positions[path]) {
        delete this.simPositions[path];
        delete this.velocities[path];
      }
    }

    const nodes = Object.keys(this.simPositions);
    if (nodes.length === 0) return;

    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const forces: Record<string, { x: number; y: number }> = {};
    for (const p of nodes) forces[p] = { x: 0, y: 0 };

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = this.simPositions[a].x - this.simPositions[b].x;
        const dy = this.simPositions[a].y - this.simPositions[b].y;
        const d2 = dx * dx + dy * dy + 1;
        const d = Math.sqrt(d2);
        const ra = (viewState.positions[a]?.size ?? 50) / 2;
        const rb = (viewState.positions[b]?.size ?? 50) / 2;
        const f = (forceConfig.repulsion * ra * rb) / d2;
        const fx = (f * dx) / d;
        const fy = (f * dy) / d;
        forces[a].x += fx;
        forces[a].y += fy;
        forces[b].x -= fx;
        forces[b].y -= fy;
      }
    }

    // Spring attraction along edges (deduplicated by top-level path pair)
    const seenEdges = new Set<string>();
    for (const rel of viewState.relationships) {
      const src = rel.sourcePath.split(".")[0];
      const tgt = rel.targetPath.split(".")[0];
      if (src === tgt) continue;
      const edgeKey = src < tgt ? `${src}|${tgt}` : `${tgt}|${src}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);
      if (!this.simPositions[src] || !this.simPositions[tgt]) continue;

      const dx = this.simPositions[tgt].x - this.simPositions[src].x;
      const dy = this.simPositions[tgt].y - this.simPositions[src].y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const rs = (viewState.positions[src]?.size ?? 50) / 2;
      const rt = (viewState.positions[tgt]?.size ?? 50) / 2;
      const ideal = rs + rt + forceConfig.linkDistance;
      const sf = SPRING_K * (d - ideal);
      const fx = (sf * dx) / d;
      const fy = (sf * dy) / d;
      forces[src].x += fx;
      forces[src].y += fy;
      forces[tgt].x -= fx;
      forces[tgt].y -= fy;
    }

    // Gravity toward canvas center
    for (const p of nodes) {
      forces[p].x += forceConfig.gravity * (cx - this.simPositions[p].x);
      forces[p].y += forceConfig.gravity * (cy - this.simPositions[p].y);
    }

    // Integrate velocities and positions
    let totalKE = 0;
    for (const p of nodes) {
      let vx = (this.velocities[p].x + forces[p].x) * DAMPING;
      let vy = (this.velocities[p].y + forces[p].y) * DAMPING;
      const speed2 = vx * vx + vy * vy;
      if (speed2 > MAX_VELOCITY * MAX_VELOCITY) {
        const scale = MAX_VELOCITY / Math.sqrt(speed2);
        vx *= scale;
        vy *= scale;
      }
      this.velocities[p] = { x: vx, y: vy };
      this.simPositions[p].x += vx;
      this.simPositions[p].y += vy;
      totalKE += vx * vx + vy * vy;
    }

    // Build batch update: top-level nodes + their children (move as rigid bodies)
    const updates: Record<string, { x: number; y: number }> = {};
    for (const p of nodes) {
      const oldPos = viewState.positions[p].position;
      const newPos = this.simPositions[p];
      const dx = newPos.x - oldPos.x;
      const dy = newPos.y - oldPos.y;
      updates[p] = { x: newPos.x, y: newPos.y };
      for (const [path, pe] of Object.entries(viewState.positions)) {
        if (path.startsWith(p + ".")) {
          updates[path] = { x: pe.position.x + dx, y: pe.position.y + dy };
        }
      }
    }
    this.store.dispatch(batchUpdatePositions(updates));

    if (totalKE > CONVERGENCE_KE) {
      this.scheduleNext();
    }
    // else: converged — re-activates via store subscription on next user drag
  }
}
