import type { Highs } from "highs";
import type { Player, PositionGroup } from "./types";

export const ROSTER_SIZE = 13;
export const POSITION_MINIMUMS: Record<PositionGroup, number> = { G: 4, F: 4, C: 2 };

export type SolveResult =
  | { ok: true; ids: string[]; value: number; salary: number }
  | { ok: false; reason: string };

/**
 * Drop players who can never be in an optimal roster: if at least ROSTER_SIZE
 * players in the same position group are no more expensive and at least as
 * valuable, one of them is always free to swap in without losing value.
 */
function prune(players: Player[], value: (p: Player) => number, locked: Set<string>): Player[] {
  const kept: Player[] = [];
  for (const group of Object.keys(POSITION_MINIMUMS) as PositionGroup[]) {
    // Cheapest first; ties broken by higher value so dominators come earlier.
    const pool = players
      .filter((p) => p.group === group)
      .sort((a, b) => a.salary - b.salary || value(b) - value(a));
    const seenValues: number[] = []; // values of cheaper-or-equal players, sorted descending
    for (const p of pool) {
      const v = value(p);
      const firstLower = seenValues.findIndex((x) => x < v);
      const dominators = firstLower === -1 ? seenValues.length : firstLower;
      if (dominators < ROSTER_SIZE || locked.has(p.id)) kept.push(p);
      seenValues.splice(dominators, 0, v);
    }
  }
  return kept;
}

const term = (coeff: number, name: string) => `${coeff < 0 ? "-" : "+"} ${Math.abs(coeff)} ${name}`;

/**
 * Multi-constraint 0/1 knapsack: maximize total value subject to the salary
 * capacity, an exact roster size, positional minimums, and any locked players.
 */
export function solveRoster(
  highs: Highs,
  players: Player[],
  value: (p: Player) => number,
  capacity: number,
  lockedIds: string[] = [],
): SolveResult {
  const locked = new Set(lockedIds);
  const lockedPlayers = players.filter((p) => locked.has(p.id));
  const lockedSalary = lockedPlayers.reduce((s, p) => s + p.salary, 0);
  if (lockedPlayers.length > ROSTER_SIZE) {
    return { ok: false, reason: `You've locked ${lockedPlayers.length} players. Unlock some to get down to ${ROSTER_SIZE}.` };
  }
  if (lockedSalary > capacity) {
    return { ok: false, reason: "Your locked players already cost more than the budget. Unlock someone or raise the budget." };
  }

  const candidates = prune(players, value, locked);
  const col = new Map(candidates.map((p, i) => [p.id, `x${i}`]));
  const sum = (ps: Player[], coeff: (p: Player) => number) =>
    ps.map((p) => term(coeff(p), col.get(p.id)!)).join(" ");
  const inGroup = (g: PositionGroup) => candidates.filter((p) => p.group === g);

  // Salaries in $ thousands keep the coefficients well scaled.
  const lp = [
    "Maximize",
    ` obj: ${sum(candidates, value)}`,
    "Subject To",
    ` salary: ${sum(candidates, (p) => p.salary / 1000)} <= ${capacity / 1000}`,
    ` count: ${sum(candidates, () => 1)} = ${ROSTER_SIZE}`,
    ...(Object.keys(POSITION_MINIMUMS) as PositionGroup[]).map(
      (g) => ` pos_${g}: ${sum(inGroup(g), () => 1)} >= ${POSITION_MINIMUMS[g]}`,
    ),
    ...lockedPlayers.map((p) => ` lock_${col.get(p.id)}: + 1 ${col.get(p.id)} = 1`),
    "Binary",
    ` ${[...col.values()].join(" ")}`,
    "End",
  ].join("\n");

  const result = highs.solve(lp, { time_limit: 10, output_flag: false });
  if (result.Status !== "Optimal") {
    return { ok: false, reason: "No roster fits these rules. Try unlocking players or raising the budget." };
  }
  const ids = candidates
    .filter((p) => Math.round(result.Columns[col.get(p.id)!].Primal) === 1)
    .map((p) => p.id);
  const chosen = candidates.filter((p) => ids.includes(p.id));
  return {
    ok: true,
    ids,
    value: chosen.reduce((s, p) => s + value(p), 0),
    salary: chosen.reduce((s, p) => s + p.salary, 0),
  };
}
