import { useEffect, useMemo, useRef, useState } from "react";
import data from "./data/players.json";
import { CAPACITIES, METRICS, money } from "./metrics";
import { ROSTER_SIZE, type SolveResult } from "./solver";
import { solve } from "./solveClient";
import type { CapacityKey, CapFigures, MetricKey, Player } from "./types";
import { Intro } from "./components/Intro";
import { KnapsackBar } from "./components/KnapsackBar";
import { PlayerPool } from "./components/PlayerPool";
import { RosterBoard } from "./components/RosterBoard";

const cap = data.cap as CapFigures;
const players = data.players as Player[];
const byId = new Map(players.map((p) => [p.id, p]));

export function App() {
  const [metric, setMetric] = useState<MetricKey>("ws");
  const [capacityKey, setCapacityKey] = useState<CapacityKey>("salaryCap");
  const [roster, setRoster] = useState<string[]>([]);
  const [locked, setLocked] = useState<string[]>([]);
  const [optimal, setOptimal] = useState<SolveResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  // While untouched, the roster follows the optimum as the metric or budget changes.
  const edited = useRef(false);
  const capacity = cap[capacityKey];

  useEffect(() => {
    let live = true;
    setBusy(true);
    setOptimal(null);
    solve(metric, capacity).then((r) => {
      if (!live) return;
      setOptimal(r);
      setBusy(false);
      if (r.ok && !edited.current) setRoster(r.ids);
    });
    return () => {
      live = false;
    };
  }, [metric, capacity]);

  const rosterPlayers = useMemo(() => roster.map((id) => byId.get(id)!), [roster]);
  const rosterIds = useMemo(() => new Set(roster), [roster]);

  const edit = (next: string[]) => {
    edited.current = true;
    setNotice(null);
    setRoster(next);
  };

  const add = (id: string, replaceId?: string) => {
    if (rosterIds.has(id)) return;
    if (replaceId) {
      edit(roster.map((r) => (r === replaceId ? id : r)));
      setLocked((l) => l.filter((x) => x !== replaceId));
    } else if (roster.length >= ROSTER_SIZE) {
      setNotice(`Your roster is full at ${ROSTER_SIZE}. Drop the new player onto someone to swap them, or remove someone first.`);
    } else {
      edit([...roster, id]);
    }
  };

  const remove = (id: string) => {
    edit(roster.filter((r) => r !== id));
    setLocked((l) => l.filter((x) => x !== id));
  };

  const clear = () => {
    edit([]);
    setLocked([]);
  };

  const toggleLock = (id: string) =>
    setLocked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const reoptimize = async () => {
    setBusy(true);
    const r = await solve(metric, capacity, locked);
    setBusy(false);
    if (!r.ok) {
      setNotice(r.reason);
      return;
    }
    edit(r.ids);
  };

  const reset = () => {
    if (!optimal?.ok) return;
    edited.current = false;
    setNotice(null);
    setLocked([]);
    setRoster(optimal.ids);
  };

  const isOptimal = optimal?.ok && optimal.ids.length === roster.length && optimal.ids.every((id) => rosterIds.has(id));

  return (
    <div className="page">
      <Intro cap={cap} />

      <section className="controls" aria-label="Optimizer settings">
        <label className="control">
          <span className="control-label">Value players by</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
            {(Object.keys(METRICS) as MetricKey[]).map((k) => (
              <option key={k} value={k}>
                {METRICS[k].label} ({METRICS[k].short})
              </option>
            ))}
          </select>
          <span className="control-help">{METRICS[metric].about}</span>
        </label>

        <div className="control">
          <span className="control-label" id="budget-label">
            Budget
          </span>
          <div className="segmented" role="group" aria-labelledby="budget-label">
            {(Object.keys(CAPACITIES) as CapacityKey[]).map((k) => (
              <button key={k} type="button" aria-pressed={capacityKey === k} onClick={() => setCapacityKey(k)}>
                {CAPACITIES[k].label}
                <span className="seg-sub">{money(cap[k])}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="actions">
          <button type="button" className="btn primary" onClick={reoptimize} disabled={busy}>
            {locked.length ? `Fill around ${locked.length} locked` : "Re-optimize"}
          </button>
          <button type="button" className="btn" onClick={reset} disabled={busy || isOptimal === true}>
            Reset to best roster
          </button>
          <span className="status" aria-live="polite">
            {busy ? "Solving…" : isOptimal ? "Showing the best possible roster" : ""}
          </span>
        </div>
      </section>

      <KnapsackBar
        cap={cap}
        capacityKey={capacityKey}
        metric={metric}
        roster={rosterPlayers}
        optimalValue={optimal?.ok ? optimal.value : null}
      />

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {optimal && !optimal.ok && <p className="notice">{optimal.reason}</p>}

      <main className="workspace">
        <RosterBoard
          roster={rosterPlayers}
          locked={locked}
          metric={metric}
          onAdd={add}
          onRemove={remove}
          onToggleLock={toggleLock}
          onClear={clear}
        />
        <PlayerPool players={players} rosterIds={rosterIds} metric={metric} onAdd={(id) => add(id)} onRemove={remove} />
      </main>

      <footer className="footer">
        Salaries and {cap.statsSeason} advanced stats from Basketball-Reference. {cap.season} cap figures from the NBA.
        Headshots from NBA.com.
      </footer>
    </div>
  );
}
