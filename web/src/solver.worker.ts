import highsLoader from "highs";
import wasmUrl from "highs/runtime?url";
import data from "./data/players.json";
import { solveRoster } from "./solver";
import { METRICS } from "./metrics";
import type { MetricKey, Player } from "./types";

export interface SolveRequest {
  requestId: number;
  metric: MetricKey;
  capacity: number;
  locked: string[];
}

const players = data.players as Player[];
const highsReady = highsLoader({ locateFile: () => wasmUrl });

self.onmessage = async (event: MessageEvent<SolveRequest>) => {
  const { requestId, metric, capacity, locked } = event.data;
  try {
    const highs = await highsReady;
    const result = solveRoster(highs, players, METRICS[metric].value, capacity, locked);
    self.postMessage({ requestId, result });
  } catch (err) {
    self.postMessage({ requestId, result: { ok: false, reason: `The solver failed: ${String(err)}` } });
  }
};
