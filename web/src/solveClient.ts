import type { SolveResult } from "./solver";
import type { SolveRequest } from "./solver.worker";
import type { MetricKey } from "./types";

// One worker for the page's lifetime, so pending solves survive React remounts.
let worker: Worker | null = null;
const pending = new Map<number, (r: SolveResult) => void>();
const cache = new Map<string, Promise<SolveResult>>();
let nextId = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./solver.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ requestId: number; result: SolveResult }>) => {
      pending.get(e.data.requestId)?.(e.data.result);
      pending.delete(e.data.requestId);
    };
  }
  return worker;
}

/** Solves in a Web Worker, caching results by their inputs. */
export function solve(metric: MetricKey, capacity: number, locked: string[] = []): Promise<SolveResult> {
  const key = `${metric}|${capacity}|${[...locked].sort().join(",")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = new Promise<SolveResult>((resolve) => {
    const requestId = nextId++;
    pending.set(requestId, resolve);
    const request: SolveRequest = { requestId, metric, capacity, locked };
    getWorker().postMessage(request);
  });
  cache.set(key, promise);
  return promise;
}
